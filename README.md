<p align="center">
  <h1 align="center">CryptoFlow</h1>
  <p align="center"><strong>Real-Time Crypto Data Pipeline & Analytics Platform</strong></p>
</p>

<p align="center">
  <a href="https://cryptoflow.deka-labs.dev">Live Demo</a> &nbsp;&bull;&nbsp;
  <a href="https://cryptoflow.deka-labs.dev/api/docs">API Docs</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis 7" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python 3.12" />
</p>

A full-stack application that ingests, processes, and visualizes cryptocurrency market data in real time. Built to demonstrate end-to-end data engineering — from a star-schema data warehouse and batch pipeline with self-monitoring, to live WebSocket streaming and interactive dashboards with JWT-authenticated user features.

![Dashboard](docs/dashboard.png)

---

## Features

- **Real-time price streaming** — CoinCap WebSocket &rarr; Redis Pub/Sub &rarr; Browser, with green/red flash on update
- **Batch data ingestion** — CoinGecko API polled every 10 minutes for top 50 coins by market cap
- **Star-schema data warehouse** — Dimensional model with fact tables, dimension tables, and a materialized view for sub-ms queries
- **Precomputed analytics** — Daily correlation matrices, volatility metrics, Sharpe ratios, and max drawdown
- **Interactive chart suite** — Candlestick, risk-return scatter, correlation heatmap, drawdown bars, volatility ranking, and market treemap
- **Coin comparison tool** — Normalized Base-100 performance charts with pairwise correlation analysis
- **Portfolio tracker** — Track holdings, view allocation breakdown, P&L, and historical performance (authenticated)
- **Watchlist** — Star coins to build a personal watchlist, persisted server-side (authenticated)
- **Pipeline monitor** — View batch job health, run history, duration, and record counts
- **Data quality dashboard** — Six automated checks (freshness, completeness, anomalies, referential integrity, schema, OHLCV consistency)
- **JWT authentication** — Register, login, and access protected features with token-based auth
- **Live price ticker** — Scrolling marquee of real-time price updates across the header
- **In-app architecture docs** — Interactive How It Works page explaining every system component

---

## Feature Tour

### Dashboard

KPI cards for total market cap, 24h volume, BTC dominance, and active coin count. Below, a market treemap sizes coins by market cap and colors them by 24h change. Top gainers and losers are ranked by percentage move.

![Dashboard](docs/dashboard.png)

### Market Explorer

Sortable table of 50 coins with live prices, sparkline charts, market cap bars, and 24h volume. Prices flash green or red on WebSocket updates. Search by name or symbol. Logged-in users see star icons for watchlist management.

| Public View | Authenticated (Watchlist Stars) |
|---|---|
| ![Market](docs/market.png) | ![Market Watchlist](docs/market-watchlist.png) |

### Coin Detail

Deep dive into any coin with metric cards, a toggleable candlestick/line chart over configurable time ranges, risk metrics (volatility, max drawdown, Sharpe ratio), and correlation insights showing the most and least correlated assets.

![Coin Detail](docs/coin-detail.png)

### Coin Comparison

Select up to 5 coins and compare their normalized Base-100 performance over a shared time window. A metrics table shows key stats side-by-side, and a pairwise correlation matrix reveals how the selected coins move relative to each other.

![Compare](docs/compare.png)

### Portfolio Tracker

Authenticated users can add holdings with quantity, buy price, and notes. Summary cards show total value, P&L, and return percentage. A donut chart visualizes allocation, and a performance chart tracks portfolio value over time.

![Portfolio](docs/portfolio.png)

### Analytics

Two views: a **Correlation Heatmap** of the top 15 coins by Pearson correlation, and a **Risk vs. Return** scatter with bubble size encoding market cap, a five-tier Sharpe color scale, plus drawdown and volatility bar charts below.

| Correlation Heatmap | Risk & Return |
|---|---|
| ![Correlation](docs/analytics-correlation.png) | ![Risk & Return](docs/analytics-risk-return.png) |

### Pipeline Monitor

Health status cards for each batch job (last success, time since run, failure count). Below, a paginated run history table showing every execution with status, duration, records processed, and errors.

![Pipeline](docs/pipeline.png)

### Data Quality

Overall quality score with per-table breakdowns. Six automated checks run hourly — freshness, completeness, schema validation, anomaly detection, referential integrity, and OHLCV consistency — each showing pass/fail/warning status.

![Quality](docs/quality.png)

### How It Works

Interactive in-app documentation explaining the architecture, batch pipeline, real-time streaming, star schema, analytics computations, quality monitoring, and tech stack — all with diagrams and visual breakdowns.

![How It Works](docs/how-it-works.png)

### Authentication

Clean login and registration pages with form validation. JWT tokens are stored in localStorage and automatically attached to API requests.

![Login](docs/auth-login.png)

---

## Architecture

```mermaid
flowchart TB
    subgraph sources["Data Sources"]
        coingecko["CoinGecko REST API\n(batch, every 10 min)"]
        coincap["CoinCap WebSocket\n(real-time)"]
    end

    subgraph batch["Cron-Scheduled Batch Jobs"]
        ingest["Ingestion"]
        ohlcv["OHLCV Aggregation"]
        analytics["Analytics\nComputation"]
        quality["Quality Checks"]
    end

    subgraph consumer["Streaming Consumer"]
        ws_consumer["consumer.py\nCoinCap WS → Redis"]
    end

    subgraph db["PostgreSQL (Star Schema)"]
        dims["dim_coin\ndim_time"]
        facts["fact_market_data\nfact_daily_ohlcv"]
        anal["analytics_correlation\nanalytics_volatility"]
        ops["users · user_watchlist\nportfolio_holdings\npipeline_runs\ndata_quality_checks"]
        mv["mv_latest_market_data\n(materialized view)"]
    end

    redis["Redis\nPub/Sub"]

    subgraph api["FastAPI Backend"]
        rest["REST API\n(26 endpoints)"]
        ws_server["WebSocket Server"]
        auth["JWT Auth"]
    end

    subgraph frontend["Next.js Frontend"]
        pages["Dashboard · Market · Coin Detail\nCompare · Portfolio · Analytics\nPipeline · Quality · How It Works"]
    end

    coingecko --> batch
    coincap --> consumer
    batch --> db
    consumer --> redis
    db --> api
    redis --> ws_server
    auth --> rest
    rest --> frontend
    ws_server --> frontend
```

Two parallel data paths feed the platform:

1. **Batch** — CoinGecko REST API is polled every 10 minutes by cron-scheduled Python scripts. Data flows through ingestion, aggregation, analytics computation, and quality checks into the PostgreSQL star schema.
2. **Streaming** — A standalone WebSocket consumer connects to CoinCap, publishes price updates to Redis Pub/Sub, and the FastAPI backend relays them to all connected browsers in real time.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (React 19, App Router) | 16 |
| UI | Tailwind CSS + shadcn/ui + Recharts | v4 / latest / 3 |
| Language (FE) | TypeScript | 5 |
| Backend | FastAPI + SQLAlchemy 2.0 + Alembic | 0.115 / 2.0 / 1.14 |
| Language (BE) | Python | 3.12 |
| Database | PostgreSQL (star schema + materialized views) | 16 |
| Cache / PubSub | Redis | 7 |
| Auth | JWT (python-jose + passlib/bcrypt) | — |
| Scheduling | Cron + standalone Python scripts | — |
| Data Sources | CoinGecko (REST) + CoinCap (WebSocket) | v3 / v2 |
| DB Admin | pgAdmin 4 | — |

---

## Data Pipeline

### Batch Jobs

Four cron-scheduled Python scripts handle all batch processing. Every run is logged to `pipeline_runs` with status, duration, and record counts — all visible in the Pipeline Monitor UI.

| Job | Schedule | Description | Output Tables |
|---|---|---|---|
| `ingest_market_data` | Every 10 min | Fetch top 50 coins, upsert dimensions, insert facts, refresh MV | `dim_coin`, `fact_market_data`, `mv_latest_market_data` |
| `transform_aggregates` | Daily 03:00 | Compute daily OHLCV from raw 10-minute snapshots | `fact_daily_ohlcv` |
| `compute_analytics` | Daily 04:00 | Pearson correlation matrix (15x15) and volatility metrics | `analytics_correlation`, `analytics_volatility` |
| `data_quality_checks` | Hourly | Freshness, completeness, anomaly detection, referential integrity | `data_quality_checks` |

### Real-Time Streaming

```
CoinCap WebSocket → consumer.py → Redis Pub/Sub → FastAPI lifespan subscriber → manager.broadcast() → Browser WebSocket
```

---

## Database Schema

```
Star Schema (PostgreSQL 16)
═══════════════════════════

Dimensions
  dim_coin          (id, coingecko_id, symbol, name, image_url, market_cap_rank, category)
  dim_time          (date, year, quarter, month, week, day_of_week, is_weekend)

Facts
  fact_market_data  (coin_id, timestamp, price_usd, market_cap, volume, price_change_24h_pct, ...)
  fact_daily_ohlcv  (coin_id, date, open, high, low, close, volume)

Analytics
  analytics_correlation  (coin_a_id, coin_b_id, period_days, correlation, computed_at)
  analytics_volatility   (coin_id, period_days, volatility, max_drawdown, sharpe_ratio, computed_at)

Operational
  users                 (id, email, hashed_password, full_name, is_active)
  user_watchlist        (user_id, coin_id)
  portfolio_holdings    (id, user_id, coin_id, quantity, buy_price_usd, notes)
  pipeline_runs         (job_id, status, start_time, end_time, records_processed, error_message)
  data_quality_checks   (check_name, table_name, status, details, checked_at)

Performance
  mv_latest_market_data → materialized view for sub-ms dashboard queries
```

---

## API Reference

Interactive Swagger UI available at [`/docs`](https://cryptoflow.deka-labs.dev/api/docs).

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/coins` | Paginated coin list with current prices (search, sort) |
| `GET` | `/api/v1/coins/sparklines` | 7-day sparkline price data for multiple coins |
| `GET` | `/api/v1/coins/{id}` | Single coin with latest market data |
| `GET` | `/api/v1/coins/{id}/history` | Historical price snapshots (1–365 days) |
| `GET` | `/api/v1/coins/{id}/ohlcv` | Daily OHLCV candlestick data (1–365 days) |
| `GET` | `/api/v1/coins/{id}/analytics` | Risk metrics and correlation data |
| `GET` | `/api/v1/market/overview` | Market KPIs, top gainers & losers |
| `GET` | `/api/v1/analytics/correlation` | Correlation matrix (top N coins, configurable period) |
| `GET` | `/api/v1/analytics/volatility` | Volatility ranking with Sharpe ratio |
| `GET` | `/api/v1/pipeline/runs` | Paginated pipeline run history |
| `GET` | `/api/v1/pipeline/health` | Batch job health status |
| `GET` | `/api/v1/quality/checks` | Data quality check results (filterable) |
| `GET` | `/api/v1/quality/summary` | Aggregated quality scores per table |
| `GET` | `/api/v1/ws/status` | WebSocket connection statistics |
| `WS` | `/api/v1/ws/prices` | Real-time price stream |
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Authenticate and receive JWT token |

### Authenticated Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/auth/me` | Get current user profile |
| `GET` | `/api/v1/portfolio` | Portfolio summary (total value, cost basis, P&L) |
| `GET` | `/api/v1/portfolio/holdings` | All holdings with enriched coin data |
| `POST` | `/api/v1/portfolio/holdings` | Add a new holding |
| `PUT` | `/api/v1/portfolio/holdings/{id}` | Update a holding |
| `DELETE` | `/api/v1/portfolio/holdings/{id}` | Delete a holding |
| `GET` | `/api/v1/portfolio/performance` | Historical portfolio value (1–365 days) |
| `GET` | `/api/v1/watchlist` | Get watchlist coin IDs |
| `POST` | `/api/v1/watchlist/{coin_id}` | Add coin to watchlist |
| `DELETE` | `/api/v1/watchlist/{coin_id}` | Remove coin from watchlist |

---

## Getting Started

### Prerequisites

- PostgreSQL 16
- Redis 7
- Python 3.11+
- Node.js 20+

### Quick Start

```bash
git clone <repo-url> && cd cryptoflow
./scripts/setup.sh    # creates DB, runs migrations, seeds data, installs npm deps
./scripts/start.sh    # starts all 7 services
```

Open [http://localhost:3000](http://localhost:3000) — the dashboard loads with live data.

### Manual Setup

```bash
# Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e "backend/.[dev]"
cd backend && alembic upgrade head && cd ..
python3 scripts/seed_data.py

# Frontend
cd frontend && npm install && npm run build && cd ..

# Start all services
./scripts/start.sh
```

### Services

| # | Service | Port | Log |
|---|---|---|---|
| 1 | PostgreSQL | 5432 | system |
| 2 | Redis | 6379 | — |
| 3 | FastAPI | 8000 | `/tmp/cryptoflow-api.log` |
| 4 | Real-time consumer | — | `/tmp/cryptoflow-consumer.log` |
| 5 | Next.js frontend | 3000 | `/tmp/cryptoflow-frontend.log` |
| 6 | Cron scheduler | — | — |
| 7 | pgAdmin 4 | 5050 | `/tmp/cryptoflow-pgadmin.log` |

---

## Development

```bash
# Backend dev server (hot reload)
source .venv/bin/activate
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend dev server (hot reload)
cd frontend && npm run dev

# Run backend tests
cd backend && pytest
cd backend && pytest tests/test_routers/test_coins.py -k "test_name"  # single test

# Run frontend lint
cd frontend && npm run lint

# Database migrations (after modifying models)
cd backend && alembic revision --autogenerate -m "description"
cd backend && alembic upgrade head

# Add shadcn/ui components
cd frontend && npx shadcn@latest add <component>
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `JWT_SECRET` | `super-secret-change-in-production` | Secret key for JWT signing |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | `1440` | Token expiration (24 hours) |
| `COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | CoinGecko API base URL |
| `COINGECKO_RATE_LIMIT` | `10` | API requests per minute |
| `CORS_ORIGINS` | `localhost:3000`, `cryptoflow.deka-labs.dev` | Allowed CORS origins |
| `NEXT_PUBLIC_API_URL` | — | Frontend API base URL (set in `.env.local`) |
| `NEXT_PUBLIC_WS_URL` | — | Frontend WebSocket URL (set in `.env.local`) |

---

## Project Structure

```
cryptoflow/
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── auth/                     # JWT token creation + FastAPI dependencies
│   │   ├── models/                   # SQLAlchemy 2.0 ORM (star schema tables)
│   │   ├── routers/                  # REST endpoints + WebSocket handler
│   │   ├── schemas/                  # Pydantic request/response models
│   │   ├── services/                 # Business logic (market, analytics, quality, CoinGecko)
│   │   ├── websocket/                # Connection manager with broadcast stats
│   │   ├── config.py                 # Pydantic Settings (env vars)
│   │   ├── database.py               # SQLAlchemy engine + sessionmaker
│   │   └── main.py                   # FastAPI app, lifespan, Redis bridge
│   ├── alembic/                      # Database migrations
│   └── tests/                        # Pytest suite (routers + services)
├── frontend/                         # Next.js 16 application
│   └── src/
│       ├── app/                      # Pages (App Router)
│       │   ├── analytics/            # Correlation + volatility charts
│       │   ├── auth/                 # Login + register
│       │   ├── coins/[id]/           # Coin detail with candlestick/line charts
│       │   ├── compare/              # Multi-coin comparison
│       │   ├── how-it-works/         # Architecture documentation
│       │   ├── market/               # Sortable market table
│       │   ├── pipeline/             # Pipeline run history + health
│       │   ├── portfolio/            # Holdings, allocation, performance
│       │   └── quality/              # Data quality checks + scores
│       ├── components/               # React components by domain
│       │   ├── charts/               # Candlestick, heatmap, scatter, sparkline, etc.
│       │   ├── coin-detail/          # Risk metrics, correlation insights
│       │   ├── compare/              # Selector, normalized chart, pairwise matrix
│       │   ├── dashboard/            # KPI cards, treemap, top movers
│       │   ├── how-it-works/         # Architecture diagram, schema, tech grid
│       │   ├── layout/               # Header, Sidebar, PriceTicker
│       │   ├── market/               # MarketTable
│       │   ├── portfolio/            # Holdings table, allocation/performance charts
│       │   └── ui/                   # shadcn/ui primitives
│       ├── hooks/                    # Custom React hooks
│       ├── providers/                # Auth + LivePrices context providers
│       ├── lib/                      # Typed API client + utilities
│       └── types/                    # Shared TypeScript type definitions
├── realtime/
│   └── consumer.py                   # CoinCap WebSocket → Redis Pub/Sub
├── scripts/
│   ├── jobs/                         # Cron-scheduled batch jobs (4 scripts)
│   ├── setup.sh                      # First-time setup (DB, migrations, seed, npm)
│   ├── start.sh                      # Start all 7 services
│   └── stop.sh                       # Stop all services
├── pgadmin/                          # pgAdmin 4 config + setup
└── pipelines/dags/                   # Reference Airflow DAGs (not actively used)
```

---

## License

MIT

<p align="center">
  <sub>Built with FastAPI, Next.js, PostgreSQL, and Redis</sub>
</p>
