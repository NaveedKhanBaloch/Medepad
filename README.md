# Medepad – Admin Console

**Dynamic SOAP prompt management with an admin view.**

The note templates of the Medepad clinical app (e.g. "Standard SOAP note", "Doctor SOAP (Medepad Standard)",
"Nybesök (COSMIC / TakeCare)") each have a **prompt** behind it: the instructions the AI follows when it turns a
consultation transcript into notes. This system moves those prompts out of the code into a **PostgreSQL**
database and gives admins a web view to **create, edit, version, test and choose** them.

| Part | Status |
|---|---|
| Admin login (email + password, several admins, no Google) | ✅ Done |
| Dashboard | ✅ Done |
| Templates & prompts: create, edit, versions (v1, v2…), choose the one in use | ✅ Done |
| Test a prompt: transcript → notes (Google Gemini) | ✅ Done |
| Results history (exact prompt + transcript + notes of every run) | ✅ Done |
| Settings (version in use per template, AI in use, change password) and Admins | ✅ Done |
| Clinical app reads its prompts from here, and comparing results | ⏳ Next |

---

## How it works

```
Admin website (Next.js, port 3001)  →  Admin API (FastAPI, /api/v1, port 8001)  →  Google Gemini
                                               ↕
                                     PostgreSQL (medepad_admin)
```

1. An admin signs in with email and password.
2. Opens a template, edits its prompt in the editor, pastes a transcript and presses **Generate notes**.
3. The API joins the prompt with the same output rules the clinical app uses (language, section headings,
   JSON shape) and sends it with the transcript to the AI. The notes appear straight away and the run is saved.
4. When the notes are right, the admin **saves** the prompt (a new version, nothing is ever overwritten) and
   chooses which version is **in use** (on the template page or in Settings).
5. Later, the clinical app will read the version in use from this database instead of from its code.

### Database tables

| Table | What it holds |
|---|---|
| `admins` | Everyone who can sign in (email, bcrypt-hashed password, active / switched off, lock after wrong passwords) |
| `templates` | Name, group, description, note headings, ICD-10 on/off, premium, shown to the clinical app or not, **active_prompt_id** (the version in use) |
| `prompts` | The prompt versions of a template (`template_id`, `version`, `content`, change note, who saved it). **One template → many prompts** |
| `generations` | Every Generate run: template, prompt version (or the exact unsaved text), transcript, language, notes, model, time taken, who |

On first start the tables are created, the **first admin** is made from `backend/.env`, and the **52 starter
templates** are added (the company's 15 templates, 15 Nordic journal templates for Cambio COSMIC / CGM TakeCare, and
22 international standards), each with its prompt as version 1.

### Backend structure (clean architecture)

```
backend/app/
  main.py                      starts the API (creates tables, first admin, starter templates)
  core/                        settings (.env), password hashing, password rules, sign-in tokens (JWT)
  domain/                      core objects and rules: errors, notes, 20 languages (no framework code)
  application/                 use cases: auth, admins, templates & prompt versions, generating notes, dashboard
  infrastructure/
    db/                        PostgreSQL tables (SQLAlchemy), session, start-up data, template library
    repositories.py            all database queries
    llm/                       Gemini / OpenAI / offline note writers and the shared prompt rules
  api/v1/                      the web endpoints under /api/v1 (thin: they call the use cases)
backend/tests/                 automatic tests (run offline)
```

### API (`/api/v1`) – full interactive docs at http://localhost:8001/api/v1/docs

| Method | Path | What it does |
|---|---|---|
| POST | `/auth/login` | Sign in (email + password) → token |
| GET | `/auth/me` · POST `/auth/change-password` | Who is signed in · change own password |
| GET / POST | `/admins` · PATCH `/admins/{id}` | List / add admins · rename, switch off/on, set a new password |
| GET / POST | `/templates` | List (add `?with_versions=true` for each template's versions) / create a template with its first prompt |
| GET / PATCH / DELETE | `/templates/{id}` | One template with all its prompt versions / edit details / delete |
| GET / POST | `/templates/{id}/prompts` | Versions / save the editor text as a new version (`activate: true` also puts it in use) |
| PUT | `/templates/{id}/active-prompt` | Choose which version is in use |
| POST | `/generate` | Prompt (saved version or unsaved text) + transcript → notes |
| GET | `/generations` · `/generations/{id}` | Results history |
| GET | `/dashboard` · `/settings/ai` | Dashboard numbers · AI in use and the 20 note languages |

### Security
- Separate admin login, **email + password only** (no Google sign-in, no public sign-up: admins add admins).
- Passwords hashed with bcrypt; at least 10 characters with upper- and lower-case letters, a number and a symbol.
- The same answer for an unknown email and a wrong password; the account locks for 15 minutes after 5 wrong passwords.
- Every endpoint except login needs a valid admin token; switched-off admins cannot sign in; you cannot switch off yourself
  and at least one admin always stays active.

---

## Run it on your computer

Needs **Python 3.12+**, **Node.js 20+** and **PostgreSQL 17** (https://www.postgresql.org/download/windows/, port 5432).

### 1. Database

Create an empty database called `medepad_admin` (for example in pgAdmin, or):

```bash
psql -U postgres -c "CREATE DATABASE medepad_admin"
```

### 2. Backend (port 8001)

```bash
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
```

Open `backend/.env` and fill in `DATABASE_URL` (your PostgreSQL password, with `@` written as `%40` and `#` as `%23`),
`JWT_SECRET` and `GEMINI_API_KEY`. Then start it:

```bash
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001
```

(Mac / Linux: `.venv/bin/python` and `cp` instead of `copy`.)

### 3. Website (port 3001)

```bash
cd web
npm install
copy .env.example .env.local
npm run dev
```

### 4. Sign in

Open **http://localhost:3001** and sign in with the first admin from `backend/.env`
(`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, by default `admin@medepad.local` / `Admin@12345`).
**Change the password** in Settings straight away, then add the other admins on the Admins page.

### Tests

```bash
cd backend
.venv\Scripts\python -m pytest -q
```

They use a temporary SQLite database and the offline note writer, so they never touch your PostgreSQL data or the AI key.

---

## Deploy

**Docker** (PostgreSQL + API + website): copy `backend/.env.example` to `backend/.env`, fill in the keys, then

```bash
docker compose up --build -d
```

On a server set `PUBLIC_WEB_URL`, `PUBLIC_API_URL` and `POSTGRES_PASSWORD` (e.g. in a `.env` next to
`docker-compose.yml`) and put HTTPS in front.

**Without Docker:** run the backend with `uvicorn app.main:app --host 0.0.0.0 --port 8001` (environment variables as in
`.env.example`), and the website with `NEXT_PUBLIC_API_URL=https://your-api npm run build` then `npm start`.

---

**Patient data:** the free Gemini tier is for testing with sample or role-play conversations only.
**Never upload** `backend/.env` or `web/.env.local` – Git already skips them.
