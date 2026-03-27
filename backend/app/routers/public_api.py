"""Public API endpoints — no authentication required, rate-limited per IP."""

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.coin import DimCoin
from app.services import market_service

router = APIRouter()

# Simple in-memory rate limiter: 60 requests per minute per IP
_requests: dict[str, list[float]] = defaultdict(list)
_WINDOW = 60
_MAX_REQUESTS = 60


def _rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    reqs = _requests[ip]
    _requests[ip] = [t for t in reqs if now - t < _WINDOW]
    if len(_requests[ip]) >= _MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 60 requests per minute.",
        )
    _requests[ip].append(now)


@router.get("/coins")
def public_coins(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """List coins with latest market data."""
    _rate_limit(request)

    coins = (
        db.query(DimCoin)
        .order_by(DimCoin.market_cap_rank.asc().nullslast())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    coin_ids = [c.id for c in coins]
    latest = {}
    if coin_ids:
        rows = db.execute(
            text("SELECT * FROM mv_latest_market_data WHERE coin_id = ANY(:ids)"),
            {"ids": coin_ids},
        ).fetchall()
        latest = {r.coin_id: r for r in rows}

    return [
        {
            "id": c.id,
            "symbol": c.symbol,
            "name": c.name,
            "market_cap_rank": c.market_cap_rank,
            "price_usd": float(latest[c.id].price_usd) if c.id in latest and latest[c.id].price_usd else None,
            "market_cap": float(latest[c.id].market_cap) if c.id in latest and latest[c.id].market_cap else None,
            "total_volume": float(latest[c.id].total_volume) if c.id in latest and latest[c.id].total_volume else None,
            "price_change_24h_pct": float(latest[c.id].price_change_24h_pct) if c.id in latest and latest[c.id].price_change_24h_pct else None,
        }
        for c in coins
    ]


@router.get("/coins/{coin_id}")
def public_coin(
    coin_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Get a single coin's data."""
    _rate_limit(request)

    coin = db.query(DimCoin).filter(DimCoin.id == coin_id).first()
    if not coin:
        raise HTTPException(status_code=404, detail="Coin not found")

    latest = db.execute(
        text("SELECT * FROM mv_latest_market_data WHERE coin_id = :cid"),
        {"cid": coin.id},
    ).fetchone()

    return {
        "id": coin.id,
        "coingecko_id": coin.coingecko_id,
        "symbol": coin.symbol,
        "name": coin.name,
        "category": coin.category,
        "market_cap_rank": coin.market_cap_rank,
        "price_usd": float(latest.price_usd) if latest and latest.price_usd else None,
        "market_cap": float(latest.market_cap) if latest and latest.market_cap else None,
        "total_volume": float(latest.total_volume) if latest and latest.total_volume else None,
        "price_change_24h_pct": float(latest.price_change_24h_pct) if latest and latest.price_change_24h_pct else None,
        "circulating_supply": float(latest.circulating_supply) if latest and latest.circulating_supply else None,
    }


@router.get("/market/overview")
def public_market_overview(
    request: Request,
    db: Session = Depends(get_db),
):
    """Get market overview (total cap, volume, BTC dominance, top movers)."""
    _rate_limit(request)
    return market_service.get_market_overview(db)


@router.get("/analytics/correlation")
def public_correlation(
    request: Request,
    period_days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Get the correlation matrix for top coins."""
    _rate_limit(request)
    from app.services.analytics_service import get_correlation_matrix
    return get_correlation_matrix(db, period_days)


@router.get("/analytics/volatility")
def public_volatility(
    request: Request,
    period_days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Get volatility data for all coins."""
    _rate_limit(request)
    from app.services.analytics_service import get_volatility_ranking
    return get_volatility_ranking(db, period_days)
