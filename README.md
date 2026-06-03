# ✦ Glow Journal — Skincare Progress Tracker

## Quick Start (Windows)

### 1. Install these first (one time)
| Tool | Download |
|---|---|
| Python 3.11+ | https://python.org — ✅ check "Add to PATH" |
| Node.js LTS | https://nodejs.org |
| PostgreSQL | https://postgresql.org/download/windows — remember the password you set |

### 2. First-time setup
Double-click **`setup-local.bat`** — it installs everything automatically.

### 3. Run the app (every time)

Open **two** Command Prompt windows:

**Window 1 — Backend:**
```
cd backend
start-dev.bat
```

**Window 2 — Frontend:**
```
cd frontend
npm start
```

Open **http://localhost:3000** in your browser.

---

## Running on your iPhone too

Make sure your iPhone and laptop are on **the same WiFi network**, then:

**Window 1 — Backend:**
```
cd backend
start-dev-iphone.bat
```
(This prints your laptop's IP address)

**Window 2 — Frontend:**
```
cd frontend
start-iphone.bat
```
(This also prints your laptop's IP)

On your iPhone, open **Safari** and go to: `http://YOUR_LAPTOP_IP:3000`

> The camera feature works best on iPhone Safari — it uses the native camera.

---

## Environment separation

| File | Purpose |
|---|---|
| `backend/.env.development` | Local dev config (auto-created by setup) |
| `backend/.env.production` | Production config (fill in before deploying) |

**Dev** uses local disk for photos (`backend/uploads/` folder).
**Prod** uses AWS S3 for photos.

Never commit `.env.*` files — they're in `.gitignore`.

---

## File structure
```
skincare-app/
├── setup-local.bat            ← Run this first (Windows)
├── .gitignore
├── backend/
│   ├── start-dev.bat          ← Start backend (laptop only)
│   ├── start-dev-iphone.bat   ← Start backend (laptop + iPhone)
│   ├── .env.development       ← Your local config (auto-created)
│   ├── .env.production        ← Fill in before deploying
│   ├── main.py
│   ├── requirements.txt
│   ├── config/settings.py
│   ├── middleware/auth.py
│   ├── models/
│   │   ├── models.py          ← Database tables
│   │   └── database.py
│   ├── routers/
│   │   ├── auth.py            ← Register/login
│   │   ├── photos.py          ← Camera capture → stage → confirm
│   │   ├── products.py        ← Product search + AI fallback
│   │   ├── users.py           ← Profiles, follow, milestones
│   │   ├── explore.py         ← Public feed
│   │   └── share.py           ← Strava-style share card
│   ├── services/
│   │   ├── image_service.py   ← Local disk or S3
│   │   └── ai_service.py      ← Anthropic product search
│   └── scripts/
│       └── seed_products.py   ← Seeds 25 real beauty products
└── frontend/
    ├── start-iphone.bat       ← Start frontend for iPhone access
    ├── package.json
    └── src/
        ├── App.jsx            ← Main app (auth, journal, explore, profile)
        ├── components/
        │   ├── CameraCapture.jsx  ← Multi-shot camera with review
        │   └── ShareCard.jsx      ← Share card builder
        ├── services/api.js
        └── store/authStore.js
```

---

## What works locally (no paid services needed)

| Feature | Local dev | Notes |
|---|---|---|
| Register / Login | ✅ | |
| Camera capture | ✅ | Photos saved to `backend/uploads/` |
| Day 1, Day 2... tracking | ✅ | Auto-calculated |
| Milestones | ✅ | 7, 14, 30, 45, 90, 180, 365 days |
| Product search (25 brands) | ✅ | CeraVe, Glow Recipe, COSRX etc. |
| Explore feed | ✅ | |
| Share card builder | ✅ | |
| AI product search | Optional | Add ANTHROPIC_API_KEY to .env.development |
| iPhone access | ✅ | Same WiFi, use start-dev-iphone.bat |

---

## When you're ready to deploy

1. Fill in `backend/.env.production` (database, S3, Anthropic keys)
2. Deploy backend to Railway / Render / Fly.io
3. Deploy frontend to Vercel / Netlify
4. Set `REACT_APP_API_URL=https://your-backend-url.com` in frontend env

Full deployment guide: see DEPLOY.md (coming soon)
