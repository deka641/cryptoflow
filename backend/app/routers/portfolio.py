from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.coin import DimCoin
from app.models.portfolio import PortfolioHolding
from app.models.market_data import FactMarketData
from app.schemas.portfolio import (
    HoldingCreate,
    HoldingUpdate,
    HoldingResponse,
    PortfolioSummary,
    PerformancePoint,
    PortfolioPerformance,
)

router = APIRouter()


def _enrich_holding(holding: PortfolioHolding, coin: DimCoin, current_price: float | None) -> HoldingResponse:
    quantity = float(holding.quantity)
    buy_price = float(holding.buy_price_usd)
    cost_basis = quantity * buy_price
    current_value = quantity * current_price if current_price is not None else None
    pnl_usd = current_value - cost_basis if current_value is not None else None
    pnl_pct = (pnl_usd / cost_basis * 100) if pnl_usd is not None and cost_basis > 0 else None

    return HoldingResponse(
        id=holding.id,
        coin_id=holding.coin_id,
        coingecko_id=coin.coingecko_id,
        symbol=coin.symbol,
        name=coin.name,
        image_url=coin.image_url,
        quantity=quantity,
        buy_price_usd=buy_price,
        current_price_usd=current_price,
        current_value_usd=current_value,
        cost_basis_usd=cost_basis,
        pnl_usd=pnl_usd,
        pnl_pct=pnl_pct,
        notes=holding.notes,
        created_at=holding.created_at,
        updated_at=holding.updated_at,
    )


def _get_prices_and_coins(db: Session, coin_ids: list[int]):
    """Batch-fetch current prices and coin info for a list of coin_ids."""
    prices: dict[int, float | None] = {}
    coins: dict[int, DimCoin] = {}
    if not coin_ids:
        return prices, coins

    # Prices from materialized view
    rows = db.execute(
        text("SELECT coin_id, price_usd FROM mv_latest_market_data WHERE coin_id = ANY(:ids)"),
        {"ids": coin_ids},
    ).fetchall()
    for r in rows:
        prices[r.coin_id] = float(r.price_usd) if r.price_usd is not None else None

    # Coin info
    for c in db.query(DimCoin).filter(DimCoin.id.in_(coin_ids)).all():
        coins[c.id] = c

    return prices, coins


@router.get("", response_model=PortfolioSummary)
def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get portfolio summary with total value, cost basis, and P&L."""
    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.user_id == current_user.id)
        .all()
    )

    if not holdings:
        return PortfolioSummary(
            total_value_usd=0,
            total_cost_basis_usd=0,
            total_pnl_usd=0,
            total_pnl_pct=None,
            holdings_count=0,
            unique_coins=0,
        )

    coin_ids = list({h.coin_id for h in holdings})
    prices, _ = _get_prices_and_coins(db, coin_ids)

    total_value = 0.0
    total_cost = 0.0
    has_price = False
    for h in holdings:
        qty = float(h.quantity)
        cost = qty * float(h.buy_price_usd)
        total_cost += cost
        price = prices.get(h.coin_id)
        if price is not None:
            total_value += qty * price
            has_price = True

    total_pnl = total_value - total_cost if has_price else 0.0
    total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 and has_price else None

    return PortfolioSummary(
        total_value_usd=round(total_value, 2),
        total_cost_basis_usd=round(total_cost, 2),
        total_pnl_usd=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2) if total_pnl_pct is not None else None,
        holdings_count=len(holdings),
        unique_coins=len(coin_ids),
    )


@router.get("/holdings", response_model=list[HoldingResponse])
def get_holdings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all holdings with enriched coin data and current prices."""
    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.user_id == current_user.id)
        .order_by(PortfolioHolding.created_at.desc())
        .all()
    )

    if not holdings:
        return []

    coin_ids = list({h.coin_id for h in holdings})
    prices, coins = _get_prices_and_coins(db, coin_ids)

    return [
        _enrich_holding(h, coins[h.coin_id], prices.get(h.coin_id))
        for h in holdings
        if h.coin_id in coins
    ]


@router.post("/holdings", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
def add_holding(
    data: HoldingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new holding to the portfolio."""
    coin = db.query(DimCoin).filter(DimCoin.id == data.coin_id).first()
    if not coin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coin not found")

    holding = PortfolioHolding(
        user_id=current_user.id,
        coin_id=data.coin_id,
        quantity=data.quantity,
        buy_price_usd=data.buy_price_usd,
        notes=data.notes,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)

    prices, _ = _get_prices_and_coins(db, [data.coin_id])
    return _enrich_holding(holding, coin, prices.get(data.coin_id))


@router.put("/holdings/{holding_id}", response_model=HoldingResponse)
def update_holding(
    holding_id: int,
    data: HoldingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a holding (only own holdings)."""
    holding = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.id == holding_id, PortfolioHolding.user_id == current_user.id)
        .first()
    )
    if not holding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    if data.quantity is not None:
        holding.quantity = data.quantity
    if data.buy_price_usd is not None:
        holding.buy_price_usd = data.buy_price_usd
    if data.notes is not None:
        holding.notes = data.notes

    db.commit()
    db.refresh(holding)

    coin = db.query(DimCoin).filter(DimCoin.id == holding.coin_id).first()
    prices, _ = _get_prices_and_coins(db, [holding.coin_id])
    return _enrich_holding(holding, coin, prices.get(holding.coin_id))


@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holding(
    holding_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a holding (only own holdings)."""
    deleted = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.id == holding_id, PortfolioHolding.user_id == current_user.id)
        .delete()
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")
    return None


@router.get("/performance", response_model=PortfolioPerformance)
def get_portfolio_performance(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get historical portfolio value over time for performance chart."""
    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.user_id == current_user.id)
        .all()
    )

    if not holdings:
        return PortfolioPerformance(days=days, data_points=[])

    coin_ids = list({h.coin_id for h in holdings})
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Fetch historical prices for all coins in the portfolio
    rows = (
        db.query(FactMarketData.coin_id, FactMarketData.timestamp, FactMarketData.price_usd)
        .filter(
            FactMarketData.coin_id.in_(coin_ids),
            FactMarketData.timestamp >= since,
            FactMarketData.price_usd.isnot(None),
        )
        .order_by(FactMarketData.timestamp.asc())
        .all()
    )

    if not rows:
        return PortfolioPerformance(days=days, data_points=[])

    # Group prices by timestamp
    from collections import defaultdict
    ts_prices: dict[datetime, dict[int, float]] = defaultdict(dict)
    for coin_id, ts, price in rows:
        ts_prices[ts][coin_id] = float(price)

    # Calculate portfolio value at each timestamp
    sorted_timestamps = sorted(ts_prices.keys())
    data_points = []
    for ts in sorted_timestamps:
        prices_at_ts = ts_prices[ts]
        value = 0.0
        for h in holdings:
            # Only include holdings created before this timestamp
            if h.created_at and h.created_at.replace(tzinfo=None) > ts.replace(tzinfo=None):
                continue
            price = prices_at_ts.get(h.coin_id)
            if price is not None:
                value += float(h.quantity) * price
        if value > 0:
            data_points.append(PerformancePoint(
                timestamp=ts.isoformat(),
                value_usd=round(value, 2),
            ))

    # Downsample to ~200 points
    if len(data_points) > 200:
        step = len(data_points) / 200
        data_points = [data_points[int(i * step)] for i in range(200)]

    return PortfolioPerformance(days=days, data_points=data_points)
