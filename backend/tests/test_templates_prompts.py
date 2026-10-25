"""Templates, prompt versions (one template -> many prompts, one in use) and generating notes."""
from app.infrastructure.db.template_library import COMPANY_TEMPLATES, STANDARD_TEMPLATES

TRANSCRIPT = (
    "Doctor: What brings you in today?\nPatient: I have had a headache and fever since yesterday and a dry cough.\n"
    "Doctor: Your temperature is slightly raised and your throat looks a little red. It looks like a viral "
    "infection. Rest, drink plenty and take paracetamol. Come back if the fever lasts more than three days."
)


def test_starter_templates_are_loaded_with_version_1_in_use(client, h):
    items = client.get("/api/v1/templates", headers=h).json()
    assert len(items) >= len(COMPANY_TEMPLATES) + len(STANDARD_TEMPLATES)
    assert items[0]["name"] == "Standard SOAP note" and items[0]["group_name"] == "Company templates"
    assert all(t["active_version"] == 1 and t["prompt_count"] >= 1 for t in items[:52])
    assert {"Company templates", "Nordic journal (COSMIC / TakeCare)", "General practice"} <= {t["group_name"] for t in items}
    assert items[0]["versions"] == []
    with_versions = client.get("/api/v1/templates?with_versions=true", headers=h).json()
    assert with_versions[0]["versions"][0]["version"] == 1


def test_create_template_then_versions_and_choose_the_one_in_use(client, h):
    r = client.post("/api/v1/templates", headers=h, json={
        "name": "Cardiology follow-up", "group_name": "Specialist", "description": "Heart clinic return visit",
        "sections": ["Current", "Findings", "Assessment", "Plan", " ", "plan"], "prompt": "Write a cardiology note.",
    })
    assert r.status_code == 201, r.text
    t = r.json()
    assert t["sections"] == ["Current", "Findings", "Assessment", "Plan"]  # blanks and duplicates removed
    assert t["active_version"] == 1 and [p["version"] for p in t["prompts"]] == [1]
    assert client.post("/api/v1/templates", headers=h, json={**{"name": "cardiology FOLLOW-UP"}, "sections": ["A"], "prompt": "x"}).status_code == 409

    # save v2 (not in use yet), then v3 and put it in use
    v2 = client.post(f"/api/v1/templates/{t['id']}/prompts", headers=h, json={"content": "Write a short cardiology note.", "change_note": "shorter"}).json()
    assert v2["version"] == 2 and v2["created_by_name"] == "Medepad Admin"
    same = client.post(f"/api/v1/templates/{t['id']}/prompts", headers=h, json={"content": "Write a short cardiology note."})
    assert same.status_code == 400  # nothing changed
    v3 = client.post(f"/api/v1/templates/{t['id']}/prompts", headers=h, json={"content": "Write a cardiology note with ECG findings.", "activate": True}).json()
    got = client.get(f"/api/v1/templates/{t['id']}", headers=h).json()
    assert got["active_version"] == 3 and [p["version"] for p in got["prompts"]] == [3, 2, 1]
    # go back to version 2
    back = client.put(f"/api/v1/templates/{t['id']}/active-prompt", headers=h, json={"prompt_id": v2["id"]}).json()
    assert back["active_version"] == 2 and back["active_prompt_id"] == v2["id"]
    # a prompt of another template cannot be chosen
    other = client.get("/api/v1/templates", headers=h).json()[0]
    assert client.put(f"/api/v1/templates/{other['id']}/active-prompt", headers=h, json={"prompt_id": v3["id"]}).status_code == 404
    # edit details, then delete
    upd = client.patch(f"/api/v1/templates/{t['id']}", headers=h, json={"description": "Changed", "is_active": False}).json()
    assert upd["description"] == "Changed" and upd["is_active"] is False
    assert client.delete(f"/api/v1/templates/{t['id']}", headers=h).status_code == 204
    assert client.get(f"/api/v1/templates/{t['id']}", headers=h).status_code == 404


def test_generate_notes_from_saved_version_and_from_unsaved_text(client, h):
    soap = client.get("/api/v1/templates", headers=h).json()[0]
    r = client.post("/api/v1/generate", headers=h, json={"template_id": soap["id"], "transcript": TRANSCRIPT})
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["success"] and g["template_name"] == "Standard SOAP note" and g["prompt_version"] is None
    assert [s["title"] for s in g["result"]["sections"]] == soap["sections"]
    assert g["provider"] == "mock" and g["prompt_text"]  # the exact prompt text is kept

    version = client.get(f"/api/v1/templates/{soap['id']}", headers=h).json()["prompts"][0]
    saved = client.post("/api/v1/generate", headers=h, json={"template_id": soap["id"], "prompt_id": version["id"], "transcript": TRANSCRIPT}).json()
    assert saved["prompt_id"] == version["id"] and saved["prompt_version"] == version["version"]

    draft = client.post("/api/v1/generate", headers=h, json={
        "template_id": soap["id"], "prompt_id": version["id"], "prompt_text": "My new draft prompt.",
        "sections": ["Summary", "Plan"], "transcript": TRANSCRIPT, "language": "sv",
    }).json()
    assert draft["prompt_id"] is None and draft["prompt_text"] == "My new draft prompt." and draft["language"] == "sv"
    assert [s["title"] for s in draft["result"]["sections"]] == ["Summary", "Plan"]

    history = client.get(f"/api/v1/generations?template_id={soap['id']}", headers=h).json()
    assert len(history) >= 3 and history[0]["id"] == draft["id"]
    assert client.get(f"/api/v1/generations/{draft['id']}", headers=h).json()["transcript"] == TRANSCRIPT


def test_generate_without_a_template_and_validation(client, h):
    ok = client.post("/api/v1/generate", headers=h, json={"prompt_text": "Summarise.", "sections": ["Summary"], "transcript": TRANSCRIPT})
    assert ok.status_code == 200 and ok.json()["template_id"] is None
    assert client.post("/api/v1/generate", headers=h, json={"transcript": TRANSCRIPT}).status_code == 400  # no prompt
    assert client.post("/api/v1/generate", headers=h, json={"prompt_text": "x", "transcript": "  "}).status_code == 400
    assert client.post("/api/v1/generate", headers=h, json={"prompt_text": "x", "transcript": "t", "language": "xx"}).status_code == 422


def test_dashboard_and_ai_settings(client, h):
    d = client.get("/api/v1/dashboard", headers=h).json()
    assert d["templates"] >= 52 and d["prompts"] >= 52 and d["admins"] >= 1 and d["ai"]["provider"] == "mock"
    assert any(g["name"] == "Company templates" and g["count"] == 15 for g in d["groups"])
    ai = client.get("/api/v1/settings/ai", headers=h).json()
    assert len(ai["languages"]) == 20 and {"code": "ur", "name": "Urdu"} in ai["languages"]
