#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "========================================="
echo "CryptoFlow — Starting All Services"
echo "========================================="

# Ensure services are running
pg_ctlcluster 16 main start 2>/dev/null || true
redis-server --daemonize yes 2>/dev/null || true

# Activate Python venv
source .venv/bin/activate

# Kill any existing processes
pkill -f "uvicorn app.main" 2>/dev/null || true
pkill -f "realtime.consumer" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

sleep 1

# 1. Start FastAPI backend
echo ""
echo "[1/4] Starting FastAPI backend on :8000..."
cd "$PROJECT_DIR/backend"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/cryptoflow-api.log 2>&1 &
echo "  PID: $!"

# 2. Start real-time consumer
echo ""
echo "[2/4] Starting real-time price consumer..."
cd "$PROJECT_DIR"
nohup python3 -m realtime.consumer > /tmp/cryptoflow-consumer.log 2>&1 &
echo "  PID: $!"

# 3. Build & start Next.js frontend (production)
echo ""
echo "[3/4] Building Next.js frontend..."
cd "$PROJECT_DIR/frontend"
npm run build > /tmp/cryptoflow-frontend-build.log 2>&1
echo "  Build complete. Starting on :3000 (production)..."
nohup npm run start -- -p 3000 > /tmp/cryptoflow-frontend.log 2>&1 &
echo "  PID: $!"

# 4. Start cron scheduler for batch jobs
echo ""
echo "[4/4] Starting cron scheduler for batch jobs..."
service cron start 2>/dev/null || true

cd "$PROJECT_DIR"

echo ""
echo "========================================="
echo "All services started!"
echo ""
echo "  API:        http://localhost:8000"
echo "  API Docs:   http://localhost:8000/docs"
echo "  Frontend:   http://localhost:3000"
echo "  Batch Jobs: crontab -l"
echo ""
echo "Logs:"
echo "  API:        tail -f /tmp/cryptoflow-api.log"
echo "  Consumer:   tail -f /tmp/cryptoflow-consumer.log"
echo "  Frontend:   tail -f /tmp/cryptoflow-frontend.log"
echo "  Ingestion:  tail -f /tmp/cryptoflow-ingest.log"
echo "========================================="
