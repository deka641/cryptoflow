#!/bin/bash
set -e
# ─────────────────────────────────────────────
# CryptoFlow — Start All Services
# ─────────────────────────────────────────────

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ── Colors ───────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[0;33m' C='\033[0;36m'
B='\033[1m' D='\033[0;90m' N='\033[0m'

started=0
failed=0

header() { echo -e "\n${B}${C}══════════════════════════════════════════${N}"; echo -e "${B}${C}  CryptoFlow — Starting All Services${N}"; echo -e "${B}${C}══════════════════════════════════════════${N}\n"; }
step()   { echo -e "${B}[$1/7]${N} $2"; }
ok()     { echo -e "  ${G}✓${N} $1"; started=$((started + 1)); }
warn()   { echo -e "  ${Y}⚠${N} $1"; }
fail()   { echo -e "  ${R}✗ $1${N}"; failed=$((failed + 1)); }
info()   { echo -e "  ${D}$1${N}"; }

# Wait for a condition to become true
# Usage: wait_for <description> <check_command> [timeout_secs]
wait_for() {
    local desc="$1" cmd="$2" timeout="${3:-10}"
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if eval "$cmd" > /dev/null 2>&1; then
            return 0
        fi
        sleep 0.5
        elapsed=$((elapsed + 1))
    done
    return 1
}

header

# ── 1. PostgreSQL ────────────────────────────
step 1 "PostgreSQL ${D}(:5432)${N}"
if pg_isready -q 2>/dev/null; then
    ok "Already running"
else
    pg_ctlcluster 16 main start 2>/dev/null
    if wait_for "PostgreSQL" "pg_isready -q" 10; then
        ok "Started"
    else
        fail "PostgreSQL failed to start"
        echo -e "  ${R}Cannot continue without database. Aborting.${N}"
        exit 1
    fi
fi

# ── 2. Redis ─────────────────────────────────
step 2 "Redis ${D}(:6379)${N}"
if pgrep -x redis-server > /dev/null 2>&1; then
    ok "Already running"
else
    redis-server --daemonize yes --loglevel warning 2>/dev/null
    if wait_for "Redis" "redis-cli ping 2>/dev/null | grep -q PONG" 6; then
        ok "Started"
    else
        fail "Redis failed to start"
        echo -e "  ${R}Cannot continue without Redis. Aborting.${N}"
        exit 1
    fi
fi

# ── 3. FastAPI backend ───────────────────────
step 3 "FastAPI backend ${D}(:8000)${N}"
# Stop stale process if any
if pgrep -f "uvicorn app.main" > /dev/null 2>&1; then
    warn "Stale uvicorn found — restarting"
    pkill -f "uvicorn app.main" 2>/dev/null; sleep 1
fi
source "$PROJECT_DIR/.venv/bin/activate"
cd "$PROJECT_DIR/backend"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/cryptoflow-api.log 2>&1 &
api_pid=$!
info "PID: $api_pid  Log: /tmp/cryptoflow-api.log"
if wait_for "FastAPI" "pgrep -f 'uvicorn app.main'" 6; then
    ok "Started"
else
    fail "FastAPI failed to start — check /tmp/cryptoflow-api.log"
fi
cd "$PROJECT_DIR"

# ── 4. Real-time consumer ───────────────────
step 4 "Real-time price consumer"
if pgrep -f "realtime.consumer" > /dev/null 2>&1; then
    warn "Stale consumer found — restarting"
    pkill -f "realtime.consumer" 2>/dev/null; sleep 1
fi
source "$PROJECT_DIR/.venv/bin/activate"
nohup python3 -m realtime.consumer > /tmp/cryptoflow-consumer.log 2>&1 &
consumer_pid=$!
info "PID: $consumer_pid  Log: /tmp/cryptoflow-consumer.log"
if wait_for "Consumer" "pgrep -f 'realtime.consumer'" 4; then
    ok "Started"
else
    fail "Consumer failed to start — check /tmp/cryptoflow-consumer.log"
fi

# ── 5. Next.js frontend ─────────────────────
step 5 "Next.js frontend ${D}(:3000)${N}"
# Stop stale process if any
if pgrep -f "next-server|next start|next dev" > /dev/null 2>&1; then
    warn "Stale Next.js found — restarting"
    pkill -f "next-server|next start|next dev|npm.*next" 2>/dev/null; sleep 1
fi
cd "$PROJECT_DIR/frontend"
info "Building production bundle..."
if npm run build > /tmp/cryptoflow-frontend-build.log 2>&1; then
    info "Build complete"
else
    fail "Next.js build failed — check /tmp/cryptoflow-frontend-build.log"
    cd "$PROJECT_DIR"
    # Continue to remaining services
    step 6 "Cron scheduler"
    fail "Skipped (frontend build failed)"
    step 7 "pgAdmin4"
    fail "Skipped (frontend build failed)"
    echo ""
    echo -e "${B}${C}══════════════════════════════════════════${N}"
    echo -e "  ${R}✗${N} ${B}$started started${N}, ${R}$failed failed${N}"
    echo -e "${B}${C}══════════════════════════════════════════${N}"
    exit 1
fi
nohup npm run start -- -p 3000 > /tmp/cryptoflow-frontend.log 2>&1 &
frontend_pid=$!
info "PID: $frontend_pid  Log: /tmp/cryptoflow-frontend.log"
if wait_for "Next.js" "pgrep -f 'next-server'" 15; then
    ok "Started"
else
    fail "Next.js failed to start — check /tmp/cryptoflow-frontend.log"
fi
cd "$PROJECT_DIR"

# ── 6. Cron scheduler ───────────────────────
step 6 "Cron scheduler"
if pgrep -x cron > /dev/null 2>&1; then
    ok "Already running"
else
    service cron start 2>/dev/null
    if wait_for "Cron" "pgrep -x cron" 4; then
        ok "Started"
    else
        fail "Cron failed to start"
    fi
fi

# ── 7. pgAdmin4 ──────────────────────────────
step 7 "pgAdmin4 ${D}(:5050)${N}"
PGADMIN_VENV="$PROJECT_DIR/.pgadmin-venv"
if [ ! -d "$PGADMIN_VENV" ]; then
    fail "pgAdmin4 not installed — run pgadmin/setup.sh first"
else
    # Stop stale process if any
    if pgrep -f "pgadmin4" > /dev/null 2>&1; then
        warn "Stale pgAdmin found — restarting"
        pkill -f "pgadmin4" 2>/dev/null; sleep 1
    fi
    # Launch pgAdmin with reverse proxy sub-path support
    export SCRIPT_NAME=/pgadmin
    nohup "$PGADMIN_VENV/bin/pgadmin4" > /tmp/cryptoflow-pgadmin.log 2>&1 &
    pgadmin_pid=$!
    info "PID: $pgadmin_pid  Log: /tmp/cryptoflow-pgadmin.log"
    if wait_for "pgAdmin4" "curl -sf http://localhost:5050/misc/ping" 15; then
        ok "Started"
    else
        # Fallback: check if process is alive
        if kill -0 $pgadmin_pid 2>/dev/null; then
            ok "Started ${D}(process alive, HTTP pending)${N}"
        else
            fail "pgAdmin4 failed to start — check /tmp/cryptoflow-pgadmin.log"
        fi
    fi
fi

# ── Summary ──────────────────────────────────
echo ""
echo -e "${B}${C}══════════════════════════════════════════${N}"
if [ $failed -eq 0 ]; then
    echo -e "  ${G}✓ All $started services running${N}"
else
    echo -e "  ${Y}⚠${N} ${B}$started started${N}, ${R}$failed failed${N}"
fi
echo -e "${B}${C}──────────────────────────────────────────${N}"
echo -e "  ${B}Endpoints${N}"
echo -e "    API:        ${C}http://localhost:8000${N}"
echo -e "    API Docs:   ${C}http://localhost:8000/docs${N}"
echo -e "    Frontend:   ${C}http://localhost:3000${N}"
echo -e "    pgAdmin:    ${C}http://localhost:5050${N}"
echo -e ""
echo -e "  ${B}Logs${N}"
echo -e "    API:        ${D}/tmp/cryptoflow-api.log${N}"
echo -e "    Consumer:   ${D}/tmp/cryptoflow-consumer.log${N}"
echo -e "    Frontend:   ${D}/tmp/cryptoflow-frontend.log${N}"
echo -e "    FE Build:   ${D}/tmp/cryptoflow-frontend-build.log${N}"
echo -e "    pgAdmin:    ${D}/tmp/cryptoflow-pgadmin.log${N}"
echo -e "${B}${C}══════════════════════════════════════════${N}"

exit $failed
