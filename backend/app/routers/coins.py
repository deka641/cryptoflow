import math
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.coin import DimCoin
from app.models.market_data import FactMarketData, FactDailyOHLCV
from app.models.analytics import AnalyticsVolatility, AnalyticsCorrelation
from app.schemas.coin import CoinResponse, CoinDetail, CoinHistory, PricePoint, CoinOHLCV, OHLCVPoint, SparklineData, CoinAnalytics, CorrelatedCoin
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


@router.get("/sparklines", response_model=list[SparklineData])
def get_sparklines(
    ids: str = Query(..., description="Comma-separated coin IDs"),
    db: Session = Depends(get_db),
):
    """Get 7-day sparkline price data for multiple coins."""
    try:
        coin_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid coin IDs")

    if not coin_ids:
        return []

    if len(coin_ids) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 50 coin IDs per request")

    since = datetime.now(timezone.utc) - timedelta(days=7)

    rows = (
        db.query(FactMarketData.coin_id, FactMarketData.timestamp, FactMarketData.price_usd)
        .filter(
            FactMarketData.coin_id.in_(coin_ids),
            FactMarketData.timestamp >= since,
            FactMarketData.price_usd.isnot(None),
        )
        .order_by(FactMarketData.coin_id, FactMarketData.timestamp.asc())
        .all()
    )

    # Group by coin and sample ~28 points (every 6th data point from 10-min intervals)
    from collections import defaultdict
    grouped: dict[int, list[float]] = defaultdict(list)
    for coin_id, ts, price in rows:
        grouped[coin_id].append(float(price))

    result = []
    for coin_id in coin_ids:
        prices = grouped.get(coin_id, [])
        # Sample down to ~28 points if we have more
        if len(prices) > 28:
            step = len(prices) / 28
            sampled = [prices[int(i * step)] for i in range(28)]
        else:
            sampled = prices
        result.append(SparklineData(coin_id=coin_id, prices=sampled))

    return result


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


@router.get("/{coin_id}/analytics", response_model=CoinAnalytics)
def get_coin_analytics(
    coin_id: int,
    period_days: int = Query(30, ge=1, le=365, description="Period in days for analytics"),
    db: Session = Depends(get_db),
):
    """Get risk metrics and correlation data for a coin."""
    coin = db.query(DimCoin).filter(DimCoin.id == coin_id).first()
    if not coin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coin with id {coin_id} not found",
        )

    # Fetch volatility/risk metrics
    vol = (
        db.query(AnalyticsVolatility)
        .filter(
            AnalyticsVolatility.coin_id == coin_id,
            AnalyticsVolatility.period_days == period_days,
        )
        .first()
    )

    # Fetch correlations where this coin is either coin_a or coin_b
    corr_rows = (
        db.query(AnalyticsCorrelation)
        .filter(
            AnalyticsCorrelation.period_days == period_days,
            (AnalyticsCorrelation.coin_a_id == coin_id)
            | (AnalyticsCorrelation.coin_b_id == coin_id),
            AnalyticsCorrelation.correlation.isnot(None),
        )
        .all()
    )

    # Build list of (other_coin_id, correlation)
    pairs = []
    for row in corr_rows:
        other_id = row.coin_b_id if row.coin_a_id == coin_id else row.coin_a_id
        pairs.append((other_id, float(row.correlation)))

    # Sort: most correlated (highest) and least correlated (lowest)
    pairs.sort(key=lambda x: x[1], reverse=True)
    most_ids = pairs[:5]
    least_ids = pairs[-5:][::-1] if len(pairs) >= 5 else pairs[::-1]  # reverse so least is first

    # Load coin info for correlated coins
    all_other_ids = list({cid for cid, _ in most_ids + least_ids})
    other_coins = {}
    if all_other_ids:
        for c in db.query(DimCoin).filter(DimCoin.id.in_(all_other_ids)).all():
            other_coins[c.id] = c

    def build_correlated(pair_list: list[tuple[int, float]]) -> list[CorrelatedCoin]:
        result = []
        for cid, corr in pair_list:
            c = other_coins.get(cid)
            if c:
                result.append(CorrelatedCoin(
                    coin_id=c.id,
                    symbol=c.symbol,
                    name=c.name,
                    image_url=c.image_url,
                    correlation=round(corr, 4),
                ))
        return result

    return CoinAnalytics(
        coin_id=coin.id,
        symbol=coin.symbol,
        name=coin.name,
        volatility=float(vol.volatility) if vol and vol.volatility is not None else None,
        max_drawdown=float(vol.max_drawdown) if vol and vol.max_drawdown is not None else None,
        sharpe_ratio=float(vol.sharpe_ratio) if vol and vol.sharpe_ratio is not None else None,
        period_days=period_days,
        most_correlated=build_correlated(most_ids),
        least_correlated=build_correlated(least_ids),
    )
