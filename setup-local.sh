#!/bin/bash
# ── Glow Journal — Local Setup Script ─────────────────────────────────────────
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "✦  Glow Journal — Local Setup"
echo "================================"

# ── Check prerequisites ───────────────────────────────────────────────────────
echo ""
echo "Checking prerequisites..."

if ! command -v python3 &>/dev/null; then
  echo -e "${RED}✗ Python 3 not found. Install from https://python.org${NC}"; exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version)${NC}"

if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"; exit 1
fi
echo -e "${GREEN}✓ Node $(node --version)${NC}"

if ! command -v psql &>/dev/null; then
  echo -e "${RED}✗ PostgreSQL not found.${NC}"
  echo "  Mac:    brew install postgresql && brew services start postgresql"
  echo "  Ubuntu: sudo apt install postgresql && sudo service postgresql start"
  exit 1
fi
echo -e "${GREEN}✓ PostgreSQL found${NC}"

# ── Database ──────────────────────────────────────────────────────────────────
echo ""
echo "Setting up database..."
DB_NAME="skincare_tracker"

if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${YELLOW}  Database '$DB_NAME' already exists — skipping create${NC}"
else
  createdb "$DB_NAME" 2>/dev/null || psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
  echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo ""
echo "Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

source venv/bin/activate

pip install -q -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Create .env if missing
if [ ! -f ".env" ]; then
  # Try to detect the postgres user
  PG_USER=$(whoami)
  cat > .env << ENVEOF
DATABASE_URL=postgresql://${PG_USER}@localhost:5432/skincare_tracker
SECRET_KEY=local-dev-secret-$(openssl rand -hex 16 2>/dev/null || echo "change-me")
STORAGE_BACKEND=local
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
ENVEOF
  echo -e "${GREEN}✓ .env created (edit if needed)${NC}"
else
  echo -e "${YELLOW}  .env already exists — skipping${NC}"
fi

# Seed products
echo "Seeding beauty products..."
python scripts/seed_products.py
echo -e "${GREEN}✓ Products seeded${NC}"

deactivate
cd ..

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "Setting up frontend..."
cd frontend
npm install --silent
echo -e "${GREEN}✓ Node dependencies installed${NC}"
cd ..

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "================================"
echo -e "${GREEN}✦  Setup complete!${NC}"
echo ""
echo "To run the app, open TWO terminal tabs:"
echo ""
echo -e "  ${YELLOW}Tab 1 — Backend:${NC}"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    uvicorn main:app --reload --port 8000"
echo ""
echo -e "  ${YELLOW}Tab 2 — Frontend:${NC}"
echo "    cd frontend"
echo "    npm start"
echo ""
echo "  Then open: http://localhost:3000"
echo ""
echo "  API docs:  http://localhost:8000/docs"
echo ""
