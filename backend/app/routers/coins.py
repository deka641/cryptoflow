import math
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.coin import DimCoin
from app.models.market_data import FactMarketData, FactDailyOHLCV
from app.schemas.coin import CoinResponse, CoinDetail, CoinHistory, PricePoint, CoinOHLCV, OHLCVPoint
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
def list_coins(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by name or symbol"),
    db: Session = Depends(get_db),
):
    """List all coins with their latest market data from the materialized view."""
    query = db.query(DimCoin)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(
            (DimCoin.name.ilike(pattern)) | (DimCoin.symbol.ilike(pattern))
        )

    total = query.count()
    pages = math.ceil(total / per_page) if total > 0 else 1

    coins = (
        query
        .order_by(DimCoin.market_cap_rank.asc().nullslast())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Fetch latest market data for the page of coins from the materialized view
    coin_ids = [c.id for c in coins]
    latest_rows = {}
    if coin_ids:
        rows = db.execute(
            text("SELECT * FROM mv_latest_market_data WHERE coin_id = ANY(:ids)"),
            {"ids": coin_ids},
        ).fetchall()
        latest_rows = {r.coin_id: r for r in rows}

    items = []
    for coin in coins:
        latest = latest_rows.get(coin.id)
        items.append(
            CoinResponse(
                id=coin.id,
                coingecko_id=coin.coingecko_id,
                symbol=coin.symbol,
                name=coin.name,
                category=coin.category,
                image_url=coin.image_url,
                market_cap_rank=coin.market_cap_rank,
                created_at=coin.created_at,
                price_usd=float(latest.price_usd) if latest and latest.price_usd else None,
                market_cap=float(latest.market_cap) if latest and latest.market_cap else None,
                total_volume=float(latest.total_volume) if latest and latest.total_volume else None,
                price_change_24h_pct=float(latest.price_change_24h_pct) if latest and latest.price_change_24h_pct else None,
            )
        )

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/{coin_id}", response_model=CoinDetail)
def get_coin(coin_id: int, db: Session = Depends(get_db)):
    """Get a single coin with its latest market data."""
    coin = db.query(DimCoin).filter(DimCoin.id == coin_id).first()
    if not coin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coin with id {coin_id} not found",
        )

    latest_row = db.execute(
        text("SELECT * FROM mv_latest_market_data WHERE coin_id = :cid"),
        {"cid": coin.id},
    ).fetchone()

    return CoinDetail(
        id=coin.id,
        coingecko_id=coin.coingecko_id,
        symbol=coin.symbol,
        name=coin.name,
        category=coin.category,
        description=coin.description,
        image_url=coin.image_url,
        market_cap_rank=coin.market_cap_rank,
        created_at=coin.created_at,
        price_usd=float(latest_row.price_usd) if latest_row and latest_row.price_usd else None,
        market_cap=float(latest_row.market_cap) if latest_row and latest_row.market_cap else None,
        total_volume=float(latest_row.total_volume) if latest_row and latest_row.total_volume else None,
        price_change_24h_pct=float(latest_row.price_change_24h_pct) if latest_row and latest_row.price_change_24h_pct else None,
        circulating_supply=float(latest_row.circulating_supply) if latest_row and latest_row.circulating_supply else None,
    )


@router.get("/{coin_id}/history", response_model=CoinHistory)
def get_coin_history(
    coin_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days of history"),
    db: Session = Depends(get_db),
):
    """Get historical price data for a coin from fact_market_data."""
    coin = db.query(DimCoin).filter(DimCoin.id == coin_id).first()
    if not coin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coin with id {coin_id} not found",
        )

    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(FactMarketData)
        .filter(
            FactMarketData.coin_id == coin_id,
            FactMarketData.timestamp >= since,
        )
        .order_by(FactMarketData.timestamp.asc())
        .all()
    )

    prices = [
        PricePoint(
            timestamp=row.timestamp,
            price_usd=float(row.price_usd) if row.price_usd is not None else None,
        )
        for row in rows
    ]

    return CoinHistory(
        coin_id=coin.id,
        symbol=coin.symbol,
        name=coin.name,
        prices=prices,
    )


@router.get("/{coin_id}/ohlcv", response_model=CoinOHLCV)
def get_coin_ohlcv(
    coin_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days of OHLCV history"),
    db: Session = Depends(get_db),
):
    """Get daily OHLCV candlestick data for a coin from fact_daily_ohlcv."""
    coin = db.query(DimCoin).filter(DimCoin.id == coin_id).first()
    if not coin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coin with id {coin_id} not found",
        )

    since = date.today() - timedelta(days=days)

    rows = (
        db.query(FactDailyOHLCV)
        .filter(
            FactDailyOHLCV.coin_id == coin_id,
            FactDailyOHLCV.date >= since,
        )
        .order_by(FactDailyOHLCV.date.asc())
        .all()
    )

    candles = [
        OHLCVPoint(
            date=row.date,
            open=float(row.open_price) if row.open_price is not None else None,
            high=float(row.high_price) if row.high_price is not None else None,
            low=float(row.low_price) if row.low_price is not None else None,
            close=float(row.close_price) if row.close_price is not None else None,
            volume=float(row.volume) if row.volume is not None else None,
        )
        for row in rows
    ]

    return CoinOHLCV(
        coin_id=coin.id,
        symbol=coin.symbol,
        name=coin.name,
        candles=candles,
    )
