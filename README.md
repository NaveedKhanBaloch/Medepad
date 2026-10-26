# Medepad – Admin Console

**Dynamic SOAP prompt management with an admin view.**

Every note template of the Medepad clinical app (e.g. "Standard SOAP note", "Psychiatry",
"Nybesök (COSMIC / TakeCare)") has a **prompt** behind it: the instructions the AI follows when it turns a
consultation transcript into notes. This system keeps those prompts in a **PostgreSQL** database and gives admins a
website to **create, edit, version, test and choose** them.

- **Website:** Next.js 16 + React 19 + Tailwind CSS (port **3001**)
- **API:** Python FastAPI, all endpoints under `/api/v1` (port **8001**)
- **Database:** PostgreSQL
- **AI:** Google Gemini (free key) – or a built-in offline sample writer

---

## Run it on your computer (Windows + VS Code)

Takes about 15 minutes the first time. You need two terminals in VS Code: one for the **API**, one for the
**website**. Every command below is typed in the VS Code terminal (**Terminal → New Terminal**, PowerShell).

### Step 1 – Install the programs (one time, all free)

| Program | Download | Notes |
|---|---|---|
| **Python 3.12 or newer** | https://www.python.org/downloads/ | In the installer tick **"Add python.exe to PATH"**. |
| **Node.js 20 or newer (LTS)** | https://nodejs.org/ | Default options. |
| **PostgreSQL** | https://www.postgresql.org/download/windows/ | Keep port **5432**. Choose a password for the user **postgres** and remember it. Stack Builder at the end is not needed (Cancel). |
| **VS Code** | https://code.visualstudio.com/ | |

Close and reopen VS Code after installing, so it finds Python and Node.

### Step 2 – Open the project

Unzip the project (or `git clone https://github.com/Hajra60/AdminPage.git`) and in VS Code choose
**File → Open Folder…** and open the project folder (the one that contains `backend` and `web`).

### Step 3 – Create the database

Open **pgAdmin 4** (installed with PostgreSQL) → sign in with your postgres password → right-click
**Databases** → **Create → Database…** → name: `medepad_admin` → **Save**.

Or in the VS Code terminal (change `17` to your PostgreSQL version; it asks for the postgres password):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE medepad_admin"
```

The tables, the first admin and the 52 templates are created automatically in Step 5.

### Step 4 – Set up the API (first terminal)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
```

Make a secret for sign-in tokens and copy the line it prints:

```powershell
.venv\Scripts\python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Open **`backend/.env`** in VS Code and change these lines, then save (Ctrl + S):

| Line | What to write |
|---|---|
| `DATABASE_URL=` | Replace `your-password` with your postgres password. If it contains `@` write `%40`, for `#` write `%23`. |
| `JWT_SECRET=` | The secret you just made. |
| `GEMINI_API_KEY=` | A free key from https://aistudio.google.com/apikey. **No key?** Change `LLM_PROVIDER=gemini` to `LLM_PROVIDER=mock` – everything works, the notes are clearly marked sample notes. |
| `SEED_ADMIN_EMAIL=` / `SEED_ADMIN_PASSWORD=` | Optional: your own first admin (default `admin@medepad.local` / `Admin@12345`). |

### Step 5 – Start the API (first terminal, keep it open)

```powershell
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001
```

Wait for `Application startup complete.` Check it at http://localhost:8001/api/v1/health – it shows
`{"status":"ok"}`. API documentation: http://localhost:8001/api/v1/docs

### Step 6 – Start the website (second terminal)

Open a second terminal (**Terminal → New Terminal**) and run:

```powershell
cd web
npm install
copy .env.example .env.local
npm run dev
```

`npm install` may print yellow `npm warn …` lines – they are harmless. Wait for `Ready`.

### Step 7 – Sign in

Open **http://localhost:3001** and sign in with the first admin from `backend/.env`
(default **admin@medepad.local** / **Admin@12345**). This first admin is the **super admin**.
Then: **Settings → Change your password**, and add more admins on the **Admins** page.

### Next time

Only Step 5 and Step 6 – the last command of each:

- first terminal: `cd backend` then `.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001`
- second terminal: `cd web` then `npm run dev`

To stop: click in the terminal and press **Ctrl + C**.

### If something goes wrong

| Message | What to do |
|---|---|
| `python` or `npm` "is not recognized" | The installer did not add it to PATH. Reinstall (tick "Add to PATH") and reopen VS Code. |
| `npm` "running scripts is disabled on this system" | Type `npm.cmd` instead of `npm` (e.g. `npm.cmd install`, `npm.cmd run dev`). |
| API: `password authentication failed` | Wrong postgres password in `DATABASE_URL` (remember `@` → `%40`, `#` → `%23`). |
| API: `database "medepad_admin" does not exist` | Do Step 3. |
| API: `connection refused` / port 5432 | PostgreSQL is not running: Windows **Services** → `postgresql-x64-…` → Start. |
| Website: "Cannot reach the Medepad Admin server" | The API (Step 5) is not running. |
| "Wrong email or password." | Use `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `backend/.env`. They are only used the very first time the API starts on an empty database. |
| Generate says it needs `GEMINI_API_KEY` | Add the key in `backend/.env`, or set `LLM_PROVIDER=mock`. The API reloads by itself. |
| "The free Gemini limit was reached" | Wait a minute and try again. |
| Port 8001 or 3001 already in use | Another copy is running – close it, or restart the computer. |

### Automatic tests (optional)

In the `backend` folder: `.venv\Scripts\python -m pytest -q` → **15 passed**. They use a temporary database and no
AI key, so they never touch your data.

---

## What it does

| Part | |
|---|---|
| Admin login (email + password, several admins, no Google, no public sign-up) | ✅ |
| Roles: one **super admin** (manages admins) and normal admins | ✅ |
| Dashboard | ✅ |
| Templates: create, edit details and note headings, show/hide, delete | ✅ |
| Prompts: edit, versions (v1, v2… each with its own colour), choose the one in use | ✅ |
| Test a prompt: transcript → notes (Gemini), full screen, copy, Word download | ✅ |
| Results history (exact prompt + transcript + notes), delete, download all as ZIP | ✅ |
| Settings (version in use per template, change password) and Admins | ✅ |
| Clinical app reads its prompts from here, and comparing results | ⏳ Next step |

**Roles**
- **Super admin** – the account whose email is `SUPER_ADMIN_EMAIL` in `backend/.env` (empty = the first admin).
  Only one. Sees the **Admins** page: adds admins, switches them off/on and sets their passwords. Cannot be switched off.
- **Admin** – everyone the super admin adds: Dashboard, Templates, Prompts, Results and Settings. No Admins page
  (also refused by the API). Everyone changes their own password in **Settings**.

**How it works**

```
Admin website (Next.js, port 3001)  →  Admin API (FastAPI, /api/v1, port 8001)  →  Google Gemini
                                               ↕
                                     PostgreSQL (medepad_admin)
```

1. An admin opens a template's prompt, edits it, pastes a transcript and presses **Generate notes**.
2. The API joins the prompt with the output rules (notes language, the template's headings, JSON shape) and sends it
   with the transcript to the AI. The notes appear and the run is saved in **Results**.
3. When the notes are right, the admin **saves** the prompt as a new version (nothing is overwritten) and chooses
   which version is **in use**.

On first start the API creates the tables, the first admin and the **52 starter templates** (15 company templates,
15 Nordic journal templates for Cambio COSMIC / CGM TakeCare, 22 international standards), each with its prompt as
version 1 ("Starter prompt").

### Database tables

| Table | What it holds |
|---|---|
| `admins` | Everyone who can sign in (bcrypt-hashed password, role, active / switched off, lock after wrong passwords) |
| `templates` | Name, group, description, note headings, ICD-10 on/off, premium, shown or hidden, **active_prompt_id** (version in use) |
| `prompts` | The prompt versions of a template (`template_id`, `version`, `content`, change note, who saved it) |
| `generations` | Every Generate run: template, version (or the unsaved text), transcript, language, notes, model, time, who |

### Code structure (clean architecture)

```
backend/app/
  main.py              starts the API (creates tables, first admin, starter templates)
  core/                settings (.env), password hashing and rules, sign-in tokens (JWT)
  domain/              core rules: errors, notes, the 20 languages
  application/         use cases: auth, admins, templates & versions, generating notes, dashboard
  infrastructure/      database (SQLAlchemy), repositories, template library, AI writers, Word/ZIP export
  api/v1/              the web endpoints under /api/v1
backend/tests/         automatic tests
web/src/app/           the website pages (login, dashboard, templates, prompts, results, settings, admins)
web/src/components/    shared parts (menu, editor, test panel, pop-ups…)
web/src/lib/           calls to the API, sign-in, types
```

### API (`/api/v1`) – interactive docs at http://localhost:8001/api/v1/docs

| Method | Path | What it does |
|---|---|---|
| POST | `/auth/login` | Sign in (email + password) → token |
| GET | `/auth/me` · POST `/auth/change-password` | Who is signed in · change own password |
| GET / POST | `/admins` · PATCH `/admins/{id}` | **Super admin only:** list / add · rename, switch off/on, set password |
| GET / POST | `/templates` | List (`?with_versions=true`) / create a template with its first prompt |
| GET / PATCH / DELETE | `/templates/{id}` | One template with its versions / edit / delete |
| GET / POST | `/templates/{id}/prompts` | Versions / save a new version (`activate: true` also puts it in use) |
| PUT | `/templates/{id}/active-prompt` | Choose the version in use |
| POST | `/generate` | Prompt (saved version or unsaved text) + transcript → notes |
| GET | `/generations` · `/generations/{id}` | Results history |
| GET | `/generations/{id}/download` · `/generations/export?template_id=` | One result as Word · results as ZIP |
| DELETE | `/generations/{id}` | Delete one result |
| GET | `/dashboard` · `/settings/ai` · `/health` | Dashboard numbers · AI in use and languages · health check |

### Security
- Email + password only; passwords hashed with bcrypt; at least 10 characters with upper- and lower-case letters,
  a number and a symbol.
- The same answer for an unknown email and a wrong password; 5 wrong passwords lock the account for 15 minutes.
- Every endpoint except login needs a valid admin token; switched-off admins cannot sign in.

---

## Deploy on a server (optional)

**Docker** (PostgreSQL + API + website in one command): install Docker Desktop, copy `backend/.env.example` to
`backend/.env`, fill in `JWT_SECRET` and `GEMINI_API_KEY` (the database address is set by Docker), then

```bash
docker compose up --build -d
```

and open http://localhost:3001. On a real server set `PUBLIC_WEB_URL`, `PUBLIC_API_URL` and `POSTGRES_PASSWORD`
(e.g. in a `.env` file next to `docker-compose.yml`) and put HTTPS in front.

---

**Patient data:** the free Gemini tier is for testing with sample or role-play conversations only.
**Never upload** `backend/.env` or `web/.env.local` – they contain passwords and keys (Git already skips them).
