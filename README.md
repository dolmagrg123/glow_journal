# ✦ Glow Journal — Skincare Tracker

## ⚠️ IMPORTANT: Use PowerShell, not Command Prompt

To open PowerShell: right-click the Start button → "Windows PowerShell"

---

## Prerequisites (install these first)

| Tool | Version | Notes |
|---|---|---|
| Python | **3.11 exactly** | https://python.org/downloads/release/python-3119/ — ✅ check "Add Python to PATH" |
| Node.js | LTS | https://nodejs.org |
| PostgreSQL | 18 | https://postgresql.org/download/windows — remember your password |

> ⚠️ **Python 3.12+ and 3.14 will NOT work.** The packages require Python 3.11.

---

## First-time setup

### Step 1 — Allow PowerShell scripts (run once as Administrator)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
If that still blocks scripts, prefix every `.ps1` command with:
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

### Step 2 — Create the database
PostgreSQL on Windows often runs on port **5433** (not 5432). Check yours:
```powershell
netstat -ano | findstr "543"
```
Then create the database (replace 5433 with your actual port):
```powershell
$env:PGPASSWORD="postgres"; psql -U postgres -p 5433 -c "CREATE DATABASE skincare_tracker;"
```

### Step 3 — Create the .env file
```powershell
cd backend
Set-Content ".env.development" "DATABASE_URL=postgresql://postgres:postgres@localhost:5433/skincare_tracker
SECRET_KEY=local-dev-secret-do-not-use-in-prod
STORAGE_BACKEND=local
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
MAX_IMAGE_SIZE_MB=15
ANTHROPIC_API_KEY="
```
> Replace `5433` with your port and `postgres` with your actual PostgreSQL password if different.

### Step 4 — Install Python packages
```powershell
python -m venv venv
venv\Scripts\pip.exe install -r requirements.txt
venv\Scripts\pip.exe install "bcrypt==4.0.1"
```

### Step 5 — Create tables and seed products
```powershell
$env:ENV_FILE=".env.development"; venv\Scripts\python.exe -c "from models.database import engine; from models.models import Base; Base.metadata.create_all(bind=engine); print('Tables created!')"
$env:ENV_FILE=".env.development"; venv\Scripts\python.exe scripts/seed_products.py
```

### Step 6 — Install frontend packages
```powershell
cd ..\frontend
npm install
```

---

## Running the app (every time)

Open **two PowerShell windows**:

**Window 1 — Backend:**
```powershell
cd backend
$env:ENV_FILE=".env.development"; venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

**Window 2 — Frontend:**
```powershell
cd frontend
npm start
```

Then open **http://localhost:3000** in your browser.

---

## Running on your iPhone (same WiFi)

**Window 1 — Backend** (note the `--host 0.0.0.0`):
```powershell
cd backend
$env:ENV_FILE=".env.development"; venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
```

**Window 2 — Frontend:**
```powershell
cd frontend
.\start-iphone.ps1
```

Find your laptop's IP:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" }
```

On your iPhone open Safari and go to: `http://YOUR_LAPTOP_IP:3000`

> Make sure both devices are on the same WiFi network.

---

## Troubleshooting

| Error | Fix |
|---|---|
| `react-scripts not recognized` | `npm install` was interrupted — run it again and wait for it to fully finish |
| `password cannot be longer than 72 bytes` | Run `venv\Scripts\pip.exe install "bcrypt==4.0.1"` then restart backend |
| `Connection refused port 5432` | Your PostgreSQL runs on 5433 — check `.env.development` has the right port |
| `relation does not exist` | Tables not created yet — run the Step 5 create_all command above |
| `python-dotenv could not parse line 10` | Your `.env.development` has junk in it — redo Step 3 above |
| Script blocked by PowerShell | Run `powershell -ExecutionPolicy Bypass -File .\setup.ps1` |

---

## Dev vs Production

| File | Purpose |
|---|---|
| `backend/.env.development` | Local dev config |
| `backend/.env.production` | Fill in when ready to deploy |

Photos in dev are saved to `backend/uploads/` on your laptop.
In production they go to AWS S3.

---

## Key notes

- **Passwords**: Keep them under 20 characters when registering (bcrypt limitation with passlib)
- **Port**: Your PostgreSQL runs on **5433**, not the default 5432
- **Python**: Must be **3.11** — not 3.12, 3.13, or 3.14
- **API docs**: http://localhost:8000/docs (available in dev mode)