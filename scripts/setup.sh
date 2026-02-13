#!/bin/bash
set -e

echo "========================================="
echo "CryptoFlow Setup"
echo "========================================="

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# 1. Start services
echo ""
echo "[1/6] Starting PostgreSQL and Redis..."
pg_ctlcluster 16 main start 2>/dev/null || true
redis-server --daemonize yes 2>/dev/null || true
echo "  Done"

# 2. Python environment
echo ""
echo "[2/6] Setting up Python environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -e "backend/.[dev]"
echo "  Done"

# 3. Database setup
echo ""
echo "[3/6] Setting up database..."
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='cryptoflow'\" | grep -q 1 || psql -c \"CREATE USER cryptoflow WITH PASSWORD 'cryptoflow123';\"" 2>/dev/null
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='cryptoflow'\" | grep -q 1 || psql -c \"CREATE DATABASE cryptoflow OWNER cryptoflow;\"" 2>/dev/null
echo "  Done"

# 4. Run migrations
echo ""
echo "[4/6] Running database migrations..."
cd "$PROJECT_DIR/backend"
alembic upgrade head
cd "$PROJECT_DIR"

# Create materialized view if not exists
su - postgres -c "psql -d cryptoflow -c \"
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_market_data AS
SELECT DISTINCT ON (coin_id)
    coin_id, timestamp, price_usd, market_cap,
    total_volume, price_change_24h_pct, circulating_supply
FROM fact_market_data
ORDER BY coin_id, timestamp DESC;
\"" 2>/dev/null || true

su - postgres -c "psql -d cryptoflow -c \"
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_latest_coin ON mv_latest_market_data(coin_id);
\"" 2>/dev/null || true

# Populate dim_time
source .venv/bin/activate
cd "$PROJECT_DIR/backend"
python3 -c "
from app.database import SessionLocal
from app.models.time_dim import DimTime
from datetime import date, timedelta
db = SessionLocal()
if db.query(DimTime).count() == 0:
    current = date(2020, 1, 1)
    end = date(2027, 12, 31)
    batch = []
    while current <= end:
        batch.append(DimTime(date=current, year=current.year, quarter=(current.month-1)//3+1,
            month=current.month, week=current.isocalendar()[1], day_of_week=current.weekday(),
            day_of_month=current.day, is_weekend=current.weekday()>=5))
        current += timedelta(days=1)
    db.add_all(batch)
    db.commit()
    print('  dim_time populated')
else:
    print('  dim_time already populated')
db.close()
"
cd "$PROJECT_DIR"
echo "  Done"

# 5. Node.js dependencies
echo ""
echo "[5/6] Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install --silent 2>/dev/null
cd "$PROJECT_DIR"
echo "  Done"

# 6. Seed data
echo ""
echo "[6/6] Seeding data from CoinGecko..."
source .venv/bin/activate
python3 scripts/seed_data.py
echo ""
echo "========================================="
echo "Setup complete! Run ./scripts/start.sh"
echo "========================================="
