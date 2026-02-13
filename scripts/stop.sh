#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "========================================="
echo "CryptoFlow — Stopping All Services"
echo "========================================="

stopped=0

# 1. Stop FastAPI backend
if pgrep -f "uvicorn app.main" > /dev/null 2>&1; then
    echo "[1/3] Stopping FastAPI backend..."
    pkill -f "uvicorn app.main"
    stopped=$((stopped + 1))
else
    echo "[1/3] FastAPI backend not running"
fi

# 2. Stop real-time consumer
if pgrep -f "realtime.consumer" > /dev/null 2>&1; then
    echo "[2/3] Stopping real-time consumer..."
    pkill -f "realtime.consumer"
    stopped=$((stopped + 1))
else
    echo "[2/3] Real-time consumer not running"
fi

# 3. Stop Next.js frontend
if pgrep -f "next-server\|next dev\|next start" > /dev/null 2>&1; then
    echo "[3/3] Stopping Next.js frontend..."
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    stopped=$((stopped + 1))
else
    echo "[3/3] Next.js frontend not running"
fi

echo ""
echo "========================================="
echo "Stopped $stopped service(s)."
echo "========================================="
