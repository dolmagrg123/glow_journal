# ✦ Glow Journal — Skincare Tracker

A skincare progress journal: take daily skin photos, tag the products you used, track your journey by day number, browse other people's public journeys, and generate shareable before/after cards.

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL (`backend/`)
- **Frontend:** React 18 (Create React App) + Zustand (`frontend/`)

> ⚠️ Use **PowerShell**, not Command Prompt. All scripts are `.ps1`.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | **3.11** (3.12+ won't work with the pinned packages) | `winget install --id Python.Python.3.11 --scope user` |
| Node.js | LTS | https://nodejs.org |
| PostgreSQL | 18 | https://postgresql.org/download/windows — remember your password |

Allow PowerShell scripts (once):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## First-time setup

```powershell
cd backend
.\setup.ps1          # creates venv, installs packages, creates DB + .env.development, seeds products
cd ..\frontend
npm install
```

`setup.ps1` asks for your PostgreSQL port (default **5433** — Windows installs often use it instead of 5432) and password. It's safe to re-run.

To configure manually instead, copy `backend/.env.example` to `backend/.env.development` and fill it in.

---

## Running the app

Two PowerShell windows:

```powershell
# Window 1 — backend (http://localhost:8000, API docs at /docs)
cd backend
.\start-dev.ps1

# Window 2 — frontend (http://localhost:3000)
cd frontend
npm start
```

### On your iPhone (same WiFi)

```powershell
# Window 1
cd backend
.\start-dev-iphone.ps1

# Window 2
cd frontend
.\start-iphone.ps1
```

Both scripts print the URL to open in Safari (`http://YOUR_LAPTOP_IP:3000`).

---

## Configuration

The backend reads the env file named by `ENV_FILE` (default `.env.development`). Real environment variables override values in the file. See `backend/.env.example` for all settings.

| Setting | Notes |
|---|---|
| `STORAGE_BACKEND` | `local` saves photos to `backend/uploads/`; `s3` uses AWS S3 |
| `ANTHROPIC_API_KEY` | Optional — enables AI product search. Without it, only seeded products are searchable |

Env files (`backend/.env.development`, `backend/.env.production`) are git-ignored — never commit them.

---

## Troubleshooting

| Error | Fix |
|---|---|
| `No Python at '...Python311\python.exe'` | Python 3.11 was removed — reinstall it, delete `backend\venv`, re-run `.\setup.ps1` |
| `react-scripts not recognized` | `npm install` was interrupted — run it again |
| `Connection refused port 5432` | Your PostgreSQL uses another port — fix `DATABASE_URL` in `.env.development` |
| `DATABASE_URL Field required` | `.env.development` is missing — run `.\setup.ps1` |
| Script blocked by PowerShell | `powershell -ExecutionPolicy Bypass -File .\setup.ps1` |
