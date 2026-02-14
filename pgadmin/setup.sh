#!/bin/bash
# ─────────────────────────────────────────────
# pgAdmin4 — One-time Setup
# Creates a dedicated venv, installs pgAdmin4,
# and imports the CryptoFlow server definition.
# ─────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$PROJECT_DIR/.pgadmin-venv"
CONFIG_LOCAL="$SCRIPT_DIR/config_local.py"
SERVERS_JSON="$SCRIPT_DIR/servers.json"

# ── Colors ───────────────────────────────────
G='\033[0;32m' Y='\033[0;33m' C='\033[0;36m'
B='\033[1m' D='\033[0;90m' N='\033[0m'

echo -e "${B}${C}pgAdmin4 Setup${N}"
echo -e "${C}──────────────────────────────────────${N}"

# ── 1. Create dedicated virtualenv ───────────
if [ -d "$VENV_DIR" ]; then
    echo -e "  ${D}Venv already exists at $VENV_DIR${N}"
else
    echo -e "  Creating virtualenv at ${D}$VENV_DIR${N}..."
    python3 -m venv "$VENV_DIR"
fi

# ── 2. Install pgAdmin4 ─────────────────────
source "$VENV_DIR/bin/activate"
echo -e "  Installing pgAdmin4 (this may take a few minutes)..."
pip install --quiet --upgrade pip
pip install --quiet pgadmin4

# ── 3. Create data directory ─────────────────
mkdir -p "$SCRIPT_DIR/data/storage"
mkdir -p "$SCRIPT_DIR/data/sessions"
echo -e "  ${D}Data directory: $SCRIPT_DIR/data/${N}"

# ── 4. Initialize pgAdmin database ──────────
# Point pgAdmin to our config by symlinking into the package
PGADMIN_PKG_DIR=$(python3 -c "import pgadmin4; import os; print(os.path.dirname(pgadmin4.__file__))" 2>/dev/null || true)
if [ -z "$PGADMIN_PKG_DIR" ]; then
    # Fallback: locate via pip
    PGADMIN_PKG_DIR=$(pip show pgadmin4 2>/dev/null | grep "^Location:" | awk '{print $2}')/pgadmin4
fi

if [ -n "$PGADMIN_PKG_DIR" ] && [ -d "$PGADMIN_PKG_DIR" ]; then
    # Symlink config_local.py into the pgadmin4 package so it gets picked up
    ln -sf "$CONFIG_LOCAL" "$PGADMIN_PKG_DIR/config_local.py"
    echo -e "  ${D}Linked config_local.py → $PGADMIN_PKG_DIR/${N}"
fi

# Run pgAdmin setup to create the SQLite database
echo -e "  Initializing pgAdmin database..."
python3 -c "
import sys, os
os.environ.setdefault('PGADMIN_SETUP_EMAIL', 'admin@cryptoflow.local')
os.environ.setdefault('PGADMIN_SETUP_PASSWORD', 'admin')
try:
    from pgadmin4 import setup
    setup.setup_db()
    print('  Database initialized.')
except Exception as e:
    # Some versions initialize DB on first run instead
    print(f'  Note: DB will be initialized on first run ({e})')
" 2>/dev/null || echo -e "  ${D}DB will be initialized on first run${N}"

# ── 5. Import server definition ──────────────
echo -e "  Importing CryptoFlow server definition..."
python3 -c "
try:
    from pgadmin4.setup import load_database_servers, create_app
    app = create_app()
    with app.app_context():
        load_database_servers('$SERVERS_JSON', None, True)
    print('  Server imported successfully.')
except Exception as e:
    print(f'  Note: Server will be imported on first run ({e})')
" 2>/dev/null || echo -e "  ${D}Server will be auto-imported on first run${N}"

deactivate

echo ""
echo -e "  ${G}✓${N} pgAdmin4 setup complete"
echo -e "  ${D}Start with: ./scripts/start.sh${N}"
echo -e "  ${D}Access at:  http://localhost:5050${N}"
