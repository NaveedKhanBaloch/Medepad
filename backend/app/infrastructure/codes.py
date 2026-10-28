"""Diagnostic code lookup backed by a JSON file (same approach as the existing prototype).

LLM-suggested codes are checked against this list: known codes get the official description
and verified=True; unknown codes are kept but flagged so the clinician can review them.
Replace data/icd10_codes.json with the full ICD-10 (or ICD-10-SE) list for production.
"""
import json
from functools import lru_cache
from pathlib import Path

from app.domain.notes import DiagnosticCode

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "icd10_codes.json"


class IcdCodeLookup:
    def __init__(self, path: Path = DATA_FILE):
        rows = json.loads(path.read_text(encoding="utf-8"))
        self._by_code = {r["code"].upper(): r for r in rows}
        self._rows = rows

    def verify(self, codes: list[DiagnosticCode]) -> list[DiagnosticCode]:
        result = []
        for c in codes:
            ref = self._by_code.get(c.code.upper())
            if ref is None:
                # also accept a more specific code whose parent is in the list (M54.50 -> M54.5)
                ref = next((r for k, r in self._by_code.items() if c.code.upper().startswith(k)), None)
            if ref:
                result.append(DiagnosticCode(code=ref["code"], description=ref["description"], verified=True))
            else:
                result.append(DiagnosticCode(code=c.code, description=c.description, verified=False))
        return result

    def suggest(self, text: str, limit: int = 3) -> list[DiagnosticCode]:
        lowered = text.lower()
        hits = [r for r in self._rows if any(k in lowered for k in r["keywords"])]
        return [DiagnosticCode(code=r["code"], description=r["description"], verified=True) for r in hits[:limit]]

    def search(self, query: str, limit: int = 20) -> list[dict]:
        q = query.lower()
        return [
            {"code": r["code"], "description": r["description"]}
            for r in self._rows
            if q in r["code"].lower() or q in r["description"].lower() or any(q in k for k in r["keywords"])
        ][:limit]


@lru_cache
def get_code_lookup() -> IcdCodeLookup:
    return IcdCodeLookup()
