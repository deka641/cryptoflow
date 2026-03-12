<p align="center">
  <img src="docs/dashboard.png" alt="CryptoFlow Dashboard" width="100%" />
</p>

<h1 align="center">CryptoFlow</h1>

<p align="center">
  <strong>Real-time cryptocurrency data pipeline and analytics platform</strong><br />
  <sub>Star schema warehouse &middot; Batch + streaming pipelines &middot; Interactive dashboards &middot; Portfolio tracking</sub>
</p>

<p align="center">
  <a href="https://cryptoflow.deka-labs.dev">Live Demo</a> &nbsp;&bull;&nbsp;
  <a href="https://cryptoflow.deka-labs.dev/api/docs">API Docs</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis 7" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
</p>

---

## Highlights

- **Dual data pipelines running in parallel** - Batch ingestion (CoinGecko REST, every 10 min) feeds the warehouse while a streaming pipeline (CoinCap WebSocket &rarr; Redis Pub/Sub &rarr; Browser) delivers sub-second price updates
- **Star schema data warehouse** - Dimensional model with fact tables, time/coin dimensions, precomputed analytics tables, and a materialized view for sub-millisecond dashboard queries
- **Three-stage real-time pipeline** - Standalone consumer captures CoinCap WebSocket ticks, publishes to Redis Pub/Sub, and FastAPI's lifespan subscriber broadcasts to all connected browsers
- **35 endpoints across 10 resource groups** - Full REST API with WebSocket streaming, JWT authentication, pagination, filtering, and Swagger documentation
- **Self-monitoring infrastructure** - Pipeline health dashboard tracks every batch run (status, duration, records); six automated quality checks (freshness, completeness, anomalies, referential integrity) run hourly
- **7 coordinated services from a single script** - PostgreSQL, Redis, FastAPI, real-time consumer, Next.js, cron scheduler, and pgAdmin - all managed by `start.sh` / `stop.sh`

---

## Feature Tour

### Dashboard

KPI cards with animated count-up for total market cap, 24h volume, BTC dominance, and active coins. A market treemap sizes coins by market cap and colors them by 24h change. Top gainers and losers rank the biggest movers.

![Dashboard](docs/dashboard.png)

### Market Explorer

Sortable, searchable table of 50 coins with live-updating prices, inline sparkline charts, and market cap progress bars. Prices flash green or red on each WebSocket tick. Authenticated users see star icons for one-click watchlist management.

| Public View | Authenticated (Watchlist Stars) |
|---|---|
| ![Market](docs/market.png) | ![Market Watchlist](docs/market-watchlist.png) |

### Coin Detail

Deep-dive into any coin: two rows of metric cards covering price, market cap, volume, circulating supply, ATH/ATL with distance percentages, 24h range, and total/max supply. A toggleable candlestick/line chart supports configurable time ranges. Below, risk metrics (volatility, max drawdown, Sharpe ratio) and correlation insights show the most and least correlated assets.

![Coin Detail](docs/coin-detail.png)

### Coin Comparison

Select up to 5 coins and compare their normalized Base-100 performance over a shared time window. A metrics table presents key stats side-by-side, and a pairwise correlation matrix reveals how the selected coins move relative to each other.

![Compare](docs/compare.png)

### Analytics

Two tabbed views: a **Correlation Heatmap** of the top 15 coins by Pearson correlation, and a **Risk vs. Return** scatter plot with bubble size encoding market cap and a five-tier Sharpe color scale. Supplementary drawdown and volatility bar charts provide additional context.

| Correlation Heatmap | Risk & Return |
|---|---|
| ![Correlation](docs/analytics-correlation.png) | ![Risk & Return](docs/analytics-risk-return.png) |

### Portfolio Tracker

Add holdings with quantity, buy price, and notes. Six summary cards show total value, total P&L, return percentage, cost basis, and best/worst performers with live price integration. A donut chart visualizes allocation, and a performance chart tracks portfolio value over time.

![Portfolio](docs/portfolio.png)

### Pipeline Monitor

Health cards for each batch job show status, last run time, and data freshness with human-readable durations. A paginated run history table logs every execution with status badges, start time, computed duration, records processed, and error messages.

![Pipeline](docs/pipeline.png)

### Data Quality

Per-table quality scores displayed as animated ring charts with grade labels (Excellent/Good/Warning/Critical). Six automated checks run hourly - freshness, completeness, schema validation, anomaly detection, referential integrity, and OHLCV consistency - each logged with pass/fail/warning status and filterable by table or status.

![Quality](docs/quality.png)

### Authentication

Clean login and registration forms with real-time validation. The registration page features a live password strength indicator with individual requirement checks and a color-coded strength bar. JWT tokens are stored in localStorage and automatically attached to API requests.

| Login | Register (Password Strength) |
|---|---|
| ![Login](docs/auth-login.png) | ![Register](docs/auth-register.png) |

### How It Works

Interactive in-app documentation explaining the full architecture: batch pipeline, real-time streaming path, star schema design, analytics computations, quality monitoring framework, and the complete tech stack - all with diagrams and visual breakdowns.

![How It Works](docs/how-it-works.png)

---

## Architecture

### System Overview

```mermaid
flowchart LR
    subgraph sources["Data Sources"]
        CG["CoinGecko REST\n(batch, /10 min)"]
        CC["CoinCap WebSocket\n(real-time)"]
    end

    subgraph batch["Batch Pipeline"]
        B1["ingest_market_data"]
        B2["transform_aggregates"]
        B3["compute_analytics"]
        B4["data_quality_checks"]
    end

    subgraph streaming["Streaming Pipeline"]
        CON["consumer.py"]
    end

    REDIS[("Redis\nPub/Sub")]

    subgraph db["PostgreSQL"]
        DIM["dim_coin · dim_time"]
        FACT["fact_market_data\nfact_daily_ohlcv"]
        AN["analytics_correlation\nanalytics_volatility"]
        MV["mv_latest_market_data"]
    end

    subgraph api["FastAPI"]
        REST["REST API\n35 endpoints"]
        WS["WebSocket\nServer"]
        AUTH["JWT Auth"]
    end

    subgraph fe["Next.js Frontend"]
        PAGES["Dashboard · Market · Detail\nCompare · Analytics · Portfolio\nPipeline · Quality · Auth"]
    end

    CG --> batch
    CC --> CON
    batch --> db
    CON --> REDIS
    REDIS --> WS
    db --> REST
    AUTH -.-> REST
    REST --> fe
    WS --> fe
```

Two parallel data paths feed the platform:

1. **Batch** - CoinGecko REST API is polled every 10 minutes. Four cron-scheduled Python scripts handle ingestion, OHLCV aggregation, analytics computation, and quality checks. All runs are logged to `pipeline_runs` for observability.
2. **Streaming** - A standalone async consumer connects to CoinCap's WebSocket, publishes price updates to Redis Pub/Sub, and FastAPI's lifespan subscriber relays them to all connected browsers in real time.

### Star Schema

```mermaid
erDiagram
    dim_coin {
        int id PK
        varchar coingecko_id UK
        varchar symbol
        varchar name
        int market_cap_rank
        numeric ath
        numeric atl
    }

    dim_time {
        date date PK
        smallint year
        smallint quarter
        smallint month
        boolean is_weekend
    }

    fact_market_data {
        bigint id PK
        int coin_id FK
        timestamp timestamp
        numeric price_usd
        numeric market_cap
        numeric total_volume
        numeric price_change_24h_pct
    }

    fact_daily_ohlcv {
        bigint id PK
        int coin_id FK
        date date FK
        numeric open_price
        numeric high_price
        numeric low_price
        numeric close_price
        numeric volume
    }

    analytics_correlation {
        int coin_a_id FK
        int coin_b_id FK
        int period_days PK
        numeric correlation
    }

    analytics_volatility {
        int coin_id FK
        int period_days PK
        numeric volatility
        numeric max_drawdown
        numeric sharpe_ratio
    }

    dim_coin ||--o{ fact_market_data : "coin_id"
    dim_coin ||--o{ fact_daily_ohlcv : "coin_id"
    dim_time ||--o{ fact_daily_ohlcv : "date"
    dim_coin ||--o{ analytics_correlation : "coin_a/b_id"
    dim_coin ||--o{ analytics_volatility : "coin_id"
```

### Real-Time Pipeline

```mermaid
sequenceDiagram
    participant CC as CoinCap WebSocket
    participant CON as consumer.py
    participant R as Redis Pub/Sub
    participant API as FastAPI Lifespan
    participant MGR as ConnectionManager
    participant B as Browser

    CC->>CON: Price tick (JSON)
    CON->>R: PUBLISH crypto:prices
    R->>API: Message on crypto:prices
    API->>MGR: broadcast(prices)
    MGR->>B: WebSocket frame

    Note over CC,CON: Persistent WebSocket connection
    Note over R,API: Auto-reconnect on failure (5s backoff)
    Note over MGR,B: Heartbeat every 30s of inactivity
```

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 16 | React 19, App Router, TypeScript 5 |
| **Styling** | Tailwind CSS v4 | CSS-first config, custom keyframe animations |
| **Components** | shadcn/ui | "new-york" variant, Radix UI primitives |
| **Charts** | Recharts 3 | Candlestick, heatmap, scatter, treemap, sparkline |
| **Backend** | FastAPI 0.115 | Async, Pydantic v2, auto-generated OpenAPI docs |
| **ORM** | SQLAlchemy 2.0 | `Mapped`/`mapped_column` style, Alembic migrations |
| **Database** | PostgreSQL 16 | Star schema, materialized views, composite indexes |
| **Cache / PubSub** | Redis 7 | Real-time price relay via Pub/Sub channels |
| **Auth** | JWT | python-jose + passlib/bcrypt, 24h token expiry |
| **Data Sources** | CoinGecko + CoinCap | REST (batch) + WebSocket (streaming) |
| **Scheduling** | Cron | 4 Python scripts with `pipeline_runs` logging |
| **DB Admin** | pgAdmin 4 | Desktop mode, pre-registered DB connection |

---

## Data Pipeline

### Batch Jobs

Four cron-scheduled Python scripts handle all batch processing. Every run is logged to `pipeline_runs` with status, duration, and record counts - all visible in the Pipeline Monitor UI.

| Job | Schedule | Description |
|---|---|---|
| `ingest_market_data` | Every 10 min | Fetch top 50 coins from CoinGecko, upsert dimensions, insert facts, refresh materialized view |
| `transform_aggregates` | Daily 03:00 | Compute daily OHLCV candles from raw 10-minute market snapshots |
| `compute_analytics` | Daily 04:00 | Build 15&times;15 Pearson correlation matrix and per-coin volatility/Sharpe/drawdown metrics |
| `data_quality_checks` | Hourly | Run 6 checks: freshness, completeness, schema validation, anomaly detection, referential integrity, OHLCV consistency |

### Real-Time Streaming

A standalone async consumer (`realtime/consumer.py`) maintains a persistent WebSocket connection to CoinCap, deserializes price ticks, and publishes them to Redis channel `crypto:prices`. On the API side, a lifespan-managed subscriber listens to the same channel and calls `ConnectionManager.broadcast()` to relay updates to every connected browser. The entire pipeline - from exchange tick to browser render - typically completes in under 500ms.

---

## API Reference

Full interactive documentation at [`/docs`](https://cryptoflow.deka-labs.dev/api/docs) (Swagger UI).

### Public Endpoints (19)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/market/overview` | Market KPIs: total cap, volume, BTC dominance, top movers |
| `GET` | `/api/v1/market/kpi-sparklines` | Sparkline arrays for market cap, volume, BTC dominance |
| `GET` | `/api/v1/coins` | Paginated coin list with current prices, search, sort |
| `GET` | `/api/v1/coins/sparklines` | 7-day sparkline price arrays for multiple coins |
| `GET` | `/api/v1/coins/{id}` | Single coin with full market data, ATH/ATL, supply |
| `GET` | `/api/v1/coins/{id}/history` | Historical price snapshots (configurable 1-365 days) |
| `GET` | `/api/v1/coins/{id}/ohlcv` | Daily OHLCV candlestick data |
| `GET` | `/api/v1/coins/{id}/analytics` | Risk metrics: volatility, Sharpe, max drawdown, correlations |
| `GET` | `/api/v1/analytics/correlation` | Correlation matrix for top N coins by market cap |
| `GET` | `/api/v1/analytics/volatility` | Coins ranked by volatility with Sharpe ratios |
| `GET` | `/api/v1/analytics/volatility/{id}/history` | Volatility history across periods for a single coin |
| `GET` | `/api/v1/pipeline/runs` | Paginated pipeline run history (filterable by job) |
| `GET` | `/api/v1/pipeline/health` | Health status and data freshness per batch job |
| `GET` | `/api/v1/quality/checks` | Quality check results (filterable by status, table) |
| `GET` | `/api/v1/quality/summary` | Aggregated quality scores per table |
| `GET` | `/api/v1/ws/status` | WebSocket connection statistics |
| `WS` | `/api/v1/ws/prices` | Real-time price stream with 30s heartbeat |
| `POST` | `/api/v1/auth/register` | Register a new user (email + password validation) |
| `POST` | `/api/v1/auth/login` | Authenticate and receive JWT access token |

### Authenticated Endpoints (16)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/auth/me` | Current user profile |
| `PUT` | `/api/v1/auth/password` | Change current user's password |
| `GET` | `/api/v1/watchlist` | List watched coin IDs |
| `POST` | `/api/v1/watchlist/{coin_id}` | Add coin to watchlist |
| `DELETE` | `/api/v1/watchlist/{coin_id}` | Remove coin from watchlist |
| `GET` | `/api/v1/portfolio` | Portfolio summary: total value, cost basis, P&L |
| `GET` | `/api/v1/portfolio/holdings` | All holdings with enriched coin data and live prices |
| `POST` | `/api/v1/portfolio/holdings` | Add a new holding (coin, quantity, buy price, notes) |
| `PUT` | `/api/v1/portfolio/holdings/{id}` | Update a holding |
| `DELETE` | `/api/v1/portfolio/holdings/{id}` | Delete a holding |
| `GET` | `/api/v1/portfolio/performance` | Historical portfolio value over time |
| `GET` | `/api/v1/portfolio/export` | Export portfolio as CSV |
| `GET` | `/api/v1/portfolio/benchmark` | Benchmark portfolio vs BTC/ETH (base-100 series) |
| `GET` | `/api/v1/alerts` | List current user's price alerts |
| `POST` | `/api/v1/alerts` | Create or update a price alert |
| `DELETE` | `/api/v1/alerts/{id}` | Delete a price alert |
| `POST` | `/api/v1/alerts/check` | Check and trigger current user's alerts |

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

Open [http://localhost:3000](http://localhost:3000) - the dashboard loads with live data within seconds.

### Manual Setup

```bash
# Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e "backend/.[dev]"
cd backend && alembic upgrade head && cd ..
python3 scripts/seed_data.py

# Frontend
cd frontend && npm install && npm run build && cd ..

# Start services
./scripts/start.sh
```

### Development

```bash
# Hot-reload servers
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
cd frontend && npm run dev

# Tests
cd backend && pytest

# Lint
cd frontend && npm run lint

# Database migrations
cd backend && alembic revision --autogenerate -m "description"
cd backend && alembic upgrade head
```

### Services

| # | Service | Port | Log |
|---|---|---|---|
| 1 | PostgreSQL | 5432 | system |
| 2 | Redis | 6379 | -- |
| 3 | FastAPI | 8000 | `/tmp/cryptoflow-api.log` |
| 4 | Real-time consumer | -- | `/tmp/cryptoflow-consumer.log` |
| 5 | Next.js frontend | 3000 | `/tmp/cryptoflow-frontend.log` |
| 6 | Cron scheduler | -- | -- |
| 7 | pgAdmin 4 | 5050 | `/tmp/cryptoflow-pgadmin.log` |

---

## Project Structure

```
cryptoflow/
├── backend/                            # FastAPI application
│   ├── app/
│   │   ├── routers/                    # REST endpoints + WebSocket handler
│   │   │   ├── auth.py                 #   register, login, profile
│   │   │   ├── coins.py                #   coin list, detail, history, OHLCV, analytics
│   │   │   ├── market.py               #   market overview KPIs
│   │   │   ├── analytics.py            #   correlation matrix, volatility ranking
│   │   │   ├── pipeline.py             #   run history, health status
│   │   │   ├── quality.py              #   quality checks, summary scores
│   │   │   ├── watchlist.py            #   watchlist CRUD
│   │   │   ├── portfolio.py            #   holdings CRUD, performance
│   │   │   └── websocket.py            #   /ws/prices endpoint
│   │   ├── services/                   # Business logic layer
│   │   ├── models/                     # SQLAlchemy 2.0 ORM (star schema)
│   │   ├── schemas/                    # Pydantic request/response models
│   │   ├── auth/                       # JWT creation + FastAPI dependencies
│   │   ├── websocket/                  # ConnectionManager (broadcast, stats)
│   │   ├── config.py                   # Pydantic Settings (DB, Redis, JWT)
│   │   ├── database.py                 # Engine + sessionmaker
│   │   └── main.py                     # App init, lifespan, Redis bridge
│   ├── alembic/                        # Schema migrations
│   └── tests/                          # Pytest suite (72 tests)
│       ├── test_routers/               #   per-router endpoint tests
│       └── test_services/              #   service unit tests
│
├── frontend/                           # Next.js 16 (React 19, TypeScript)
│   └── src/
│       ├── app/                        # App Router pages
│       │   ├── page.tsx                #   Dashboard (/)
│       │   ├── market/                 #   Market table + watchlist
│       │   ├── coins/[id]/             #   Coin detail with charts
│       │   ├── compare/                #   Multi-coin comparison
│       │   ├── analytics/              #   Correlation + risk-return
│       │   ├── portfolio/              #   Holdings, allocation, P&L
│       │   ├── pipeline/               #   Batch job monitoring
│       │   ├── quality/                #   Data quality dashboard
│       │   ├── how-it-works/           #   Architecture documentation
│       │   └── auth/                   #   Login + register
│       ├── components/                 # React components by domain
│       │   ├── charts/                 #   Candlestick, heatmap, scatter, sparkline
│       │   ├── dashboard/              #   KPI cards, treemap, top movers
│       │   ├── portfolio/              #   Summary cards, holdings, allocation
│       │   ├── layout/                 #   Header, Sidebar, PriceTicker
│       │   └── ui/                     #   shadcn/ui + error-state, fade-in
│       ├── hooks/                      # Data fetching, live prices, optimistic mutations
│       ├── providers/                  # Auth + LivePrices context (single WS connection)
│       ├── lib/                        # Typed API client, formatters, utilities
│       └── types/                      # Shared TypeScript interfaces
│
├── realtime/
│   └── consumer.py                     # CoinCap WS → Redis Pub/Sub producer
│
├── scripts/
│   ├── setup.sh                        # First-time DB + deps setup
│   ├── start.sh                        # Start all 7 services
│   ├── stop.sh                         # Stop all services
│   └── jobs/                           # Cron-scheduled batch jobs
│       ├── ingest_market_data.py       #   every 10 min
│       ├── transform_aggregates.py     #   daily 03:00
│       ├── compute_analytics.py        #   daily 04:00
│       └── data_quality_checks.py      #   hourly
│
├── pgadmin/                            # pgAdmin 4 config (desktop mode)
└── docs/                               # Screenshots for README
```

---

## Design Decisions

**Why a star schema?** Analytical queries (market trends, correlation matrices, top movers) benefit from denormalized fact tables with dimension lookups. The schema cleanly separates raw snapshots (`fact_market_data`) from derived aggregates (`fact_daily_ohlcv`) and precomputed analytics, enabling each batch job to operate independently.

**Why a materialized view?** The dashboard's KPI cards need the latest price for every coin on every page load. `mv_latest_market_data` pre-computes `SELECT DISTINCT ON (coin_id) ... ORDER BY timestamp DESC`, turning a sequential scan of millions of fact rows into a sub-millisecond indexed lookup. The ingest job refreshes it automatically after each batch.

**Why Redis Pub/Sub instead of polling?** The real-time consumer and FastAPI server are separate processes. Redis Pub/Sub decouples them cleanly - the consumer publishes without knowing who listens, and the API subscribes without knowing where prices originate. This makes it trivial to swap data sources or add new consumers.

**Why cron over Airflow?** For a single-node deployment with four jobs, cron is simpler and has zero dependencies. The trade-off (no DAG UI, no backfill) is mitigated by logging every run to `pipeline_runs` and exposing a Pipeline Monitor page that provides the same observability.

**Why a single shared WebSocket context?** Without centralized connection management, each React component that needs live prices would open its own WebSocket - creating N connections per browser tab. `LivePricesProvider` wraps the app in a single shared context, and all consumers call `useLivePricesContext()` to read from the same connection.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://cryptoflow:...@localhost:5432/cryptoflow` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `JWT_SECRET` | `super-secret-change-in-production` | Secret key for JWT token signing |
| `JWT_EXPIRE_MINUTES` | `1440` | Token expiration (default: 24 hours) |
| `COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | CoinGecko API base URL |
| `COINGECKO_RATE_LIMIT` | `10` | Max API requests per minute |
| `CORS_ORIGINS` | `localhost:3000, cryptoflow.deka-labs.dev` | Allowed CORS origins |
| `NEXT_PUBLIC_API_URL` | -- | Frontend API base URL |
| `NEXT_PUBLIC_WS_URL` | -- | Frontend WebSocket URL |

---

<p align="center">
  <sub>Built with FastAPI, Next.js, PostgreSQL, and Redis</sub>
</p>
