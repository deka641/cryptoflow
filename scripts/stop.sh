#!/bin/bash
# ─────────────────────────────────────────────
# CryptoFlow — Stop All Services
# ─────────────────────────────────────────────

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Colors ───────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[0;33m' C='\033[0;36m'
B='\033[1m' D='\033[0;90m' N='\033[0m'

stopped=0
failed=0
skipped=0

header() { echo -e "\n${B}${C}══════════════════════════════════════════${N}"; echo -e "${B}${C}  CryptoFlow — Stopping All Services${N}"; echo -e "${B}${C}══════════════════════════════════════════${N}\n"; }
step()   { echo -e "${B}[$1/7]${N} $2"; }
ok()     { echo -e "  ${G}✓${N} $1"; stopped=$((stopped + 1)); }
skip()   { echo -e "  ${D}– $1${N}"; skipped=$((skipped + 1)); }
fail()   { echo -e "  ${R}✗ $1${N}"; failed=$((failed + 1)); }

# Kill matching processes: graceful SIGTERM, then SIGKILL after timeout
# Usage: stop_procs <label> <pgrep_pattern> [timeout_secs]
stop_procs() {
    local label="$1" pattern="$2" timeout="${3:-4}"
    local pids
    pids=$(pgrep -f "$pattern" 2>/dev/null | tr '\n' ' ')
    if [ -z "$pids" ]; then
        skip "$label not running"
        return 1
    fi
    echo -e "  ${D}PIDs: ${pids}${N}"
    kill $pids 2>/dev/null
    # Wait for graceful shutdown
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if ! pgrep -f "$pattern" > /dev/null 2>&1; then
            ok "$label stopped"
            return 0
        fi
        sleep 0.5
        elapsed=$((elapsed + 1))
    done
    # Force kill remaining
    pids=$(pgrep -f "$pattern" 2>/dev/null | tr '\n' ' ')
    if [ -n "$pids" ]; then
        echo -e "  ${Y}→ Force killing...${N}"
        kill -9 $pids 2>/dev/null
        sleep 0.5
    fi
    if ! pgrep -f "$pattern" > /dev/null 2>&1; then
        ok "$label stopped ${D}(forced)${N}"
    else
        fail "$label: some processes still running"
    fi
}

header

# ── 1. Next.js frontend ─────────────────────
step 1 "Next.js frontend ${D}(:3000)${N}"
# Next.js spawns a process tree (npm → sh → next-server), kill all related
next_pids=$(pgrep -f "next-server|next start|next dev" 2>/dev/null | tr '\n' ' ')
npm_next_pids=$(pgrep -f "npm.*next" 2>/dev/null | tr '\n' ' ')
all_next_pids=$(echo "$next_pids $npm_next_pids" | xargs -n1 2>/dev/null | sort -u | tr '\n' ' ')
if [ -z "$(echo "$all_next_pids" | tr -d ' ')" ]; then
    skip "Next.js not running"
else
    echo -e "  ${D}PIDs: ${all_next_pids}${N}"
    kill $all_next_pids 2>/dev/null
    elapsed=0
    while [ $elapsed -lt 5 ]; do
        remaining=$(pgrep -f "next-server|next start|next dev|npm.*next" 2>/dev/null | tr '\n' ' ')
        if [ -z "$(echo "$remaining" | tr -d ' ')" ]; then break; fi
        sleep 0.5
        elapsed=$((elapsed + 1))
    done
    remaining=$(pgrep -f "next-server|next start|next dev|npm.*next" 2>/dev/null | tr '\n' ' ')
    if [ -n "$(echo "$remaining" | tr -d ' ')" ]; then
        echo -e "  ${Y}→ Force killing...${N}"
        kill -9 $remaining 2>/dev/null
        sleep 0.5
    fi
    if ! pgrep -f "next-server|next start|next dev" > /dev/null 2>&1; then
        ok "Next.js stopped"
    else
        fail "Next.js: some processes still running"
    fi
fi

# ── 2. FastAPI backend ───────────────────────
step 2 "FastAPI backend ${D}(:8000)${N}"
stop_procs "FastAPI" "uvicorn app.main"

# ── 3. Real-time consumer ───────────────────
step 3 "Real-time price consumer"
stop_procs "Consumer" "realtime.consumer"

# ── 4. pgAdmin4 ───────────────────────────────
step 4 "pgAdmin4 ${D}(:5050)${N}"
stop_procs "pgAdmin4" "pgadmin4"

# ── 5. Cron scheduler ───────────────────────
step 5 "Cron scheduler"
if pgrep -x cron > /dev/null 2>&1; then
    service cron stop 2>/dev/null
    if ! pgrep -x cron > /dev/null 2>&1; then
        ok "Cron stopped"
    else
        fail "Cron: still running"
    fi
else
    skip "Cron not running"
fi

# ── 6. Redis ─────────────────────────────────
step 6 "Redis ${D}(:6379)${N}"
if pgrep -x redis-server > /dev/null 2>&1; then
    redis-cli shutdown nosave 2>/dev/null || kill $(pgrep -x redis-server) 2>/dev/null
    sleep 0.5
    if ! pgrep -x redis-server > /dev/null 2>&1; then
        ok "Redis stopped"
    else
        kill -9 $(pgrep -x redis-server) 2>/dev/null
        sleep 0.5
        if ! pgrep -x redis-server > /dev/null 2>&1; then
            ok "Redis stopped ${D}(forced)${N}"
        else
            fail "Redis: still running"
        fi
    fi
else
    skip "Redis not running"
fi

# ── 7. PostgreSQL ────────────────────────────
step 7 "PostgreSQL ${D}(:5432)${N}"
if pg_isready -q 2>/dev/null; then
    pg_ctlcluster 16 main stop 2>/dev/null
    sleep 1
    if ! pg_isready -q 2>/dev/null; then
        ok "PostgreSQL stopped"
    else
        pg_ctlcluster 16 main stop -m fast 2>/dev/null
        sleep 1
        if ! pg_isready -q 2>/dev/null; then
            ok "PostgreSQL stopped ${D}(forced)${N}"
        else
            fail "PostgreSQL: still running"
        fi
    fi
else
    skip "PostgreSQL not running"
fi

# ── Summary ──────────────────────────────────
echo ""
echo -e "${B}${C}══════════════════════════════════════════${N}"
if [ $failed -eq 0 ]; then
    echo -e "  ${G}✓${N} ${B}$stopped stopped${N}, ${D}$skipped already inactive${N}"
else
    echo -e "  ${Y}⚠${N} ${B}$stopped stopped${N}, ${R}$failed failed${N}, ${D}$skipped already inactive${N}"
fi
echo -e "${B}${C}══════════════════════════════════════════${N}"

exit $failed
