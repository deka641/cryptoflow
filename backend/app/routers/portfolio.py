import csv
import io
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
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
    if not coin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coin no longer exists")
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


@router.get("/attribution")
def get_portfolio_attribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get portfolio performance attribution analysis."""
    from app.services.attribution_service import compute_attribution
    return compute_attribution(db, current_user.id)


@router.get("/insights")
def get_portfolio_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate AI-powered portfolio insights."""
    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.user_id == current_user.id)
        .all()
    )

    if not holdings:
        return {"insights": "Add holdings to your portfolio to get AI-powered insights."}

    coin_ids = list({h.coin_id for h in holdings})
    prices, coins = _get_prices_and_coins(db, coin_ids)

    total_value = 0.0
    total_cost = 0.0
    holdings_data = []

    for h in holdings:
        coin = coins.get(h.coin_id)
        if not coin:
            continue
        qty = float(h.quantity)
        buy_price = float(h.buy_price_usd) if h.buy_price_usd else 0.0
        current_price = prices.get(h.coin_id, 0)
        cost_basis = qty * buy_price
        current_value = qty * current_price
        pnl_pct = ((current_value - cost_basis) / cost_basis * 100) if cost_basis > 0 else 0.0

        total_value += current_value
        total_cost += cost_basis
        holdings_data.append({
            "name": coin.name,
            "symbol": coin.symbol.upper(),
            "quantity": qty,
            "cost_basis": cost_basis,
            "current_value": current_value,
            "pnl_pct": pnl_pct,
            "weight": 0,  # Will be calculated below
        })

    # Calculate weights
    for h in holdings_data:
        h["weight"] = (h["current_value"] / total_value * 100) if total_value > 0 else 0

    total_pnl = total_value - total_cost
    total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 else None

    from app.services.insights_service import generate_portfolio_insights
    insights = generate_portfolio_insights(holdings_data, total_value, total_pnl, total_pnl_pct)

    return {"insights": insights}


@router.get("/export")
def export_portfolio_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export portfolio holdings as CSV."""
    try:
        holdings = (
            db.query(PortfolioHolding)
            .filter(PortfolioHolding.user_id == current_user.id)
            .order_by(PortfolioHolding.created_at.desc())
            .all()
        )

        coin_ids = list({h.coin_id for h in holdings})
        prices, coins = _get_prices_and_coins(db, coin_ids)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate export",
        )

    output = io.StringIO()
    # UTF-8 BOM for Excel compatibility
    output.write("\ufeff")
    export_date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    writer = csv.writer(output)

    # Metadata rows
    writer.writerow(["CryptoFlow Portfolio Export", "", "", "", "", "", "", "", "", "", "", ""])
    writer.writerow(["Date", export_date, "Currency", "USD", "Holdings", str(len(holdings)), "", "", "", "", "", ""])
    writer.writerow([])

    # Header row
    writer.writerow([
        "Coin", "Symbol", "Currency", "Quantity", "Buy Price", "Current Price",
        "Cost Basis", "Current Value", "P&L", "P&L %", "Notes", "Added",
    ])
    # Description row
    writer.writerow([
        "Coin name", "Ticker", "Quote currency", "Units held", "Per-unit purchase price",
        "Per-unit live price", "Quantity x Buy Price", "Quantity x Current Price",
        "Value - Cost", "(P&L / Cost) x 100", "User notes", "Date added (ISO 8601)",
    ])

    total_cost_basis = 0.0
    total_value = 0.0
    best_pnl_pct = None
    best_coin = ""
    worst_pnl_pct = None
    worst_coin = ""

    for h in holdings:
        coin = coins.get(h.coin_id)
        if not coin:
            continue
        qty = float(h.quantity)
        buy_price = float(h.buy_price_usd) if h.buy_price_usd is not None else 0.0
        current_price = prices.get(h.coin_id)
        cost_basis = qty * buy_price
        current_value = qty * current_price if current_price is not None else None
        pnl_usd = current_value - cost_basis if current_value is not None else None
        pnl_pct = (pnl_usd / cost_basis * 100) if pnl_usd is not None and cost_basis > 0 else None

        writer.writerow([
            coin.name,
            coin.symbol.upper(),
            "USD",
            qty,
            round(buy_price, 2),
            round(current_price, 2) if current_price is not None else "",
            round(cost_basis, 2),
            round(current_value, 2) if current_value is not None else "",
            round(pnl_usd, 2) if pnl_usd is not None else "",
            round(pnl_pct, 2) if pnl_pct is not None else "",
            h.notes or "",
            h.created_at.strftime("%Y-%m-%d") if h.created_at else "",
        ])

        total_cost_basis += cost_basis
        if current_value is not None:
            total_value += current_value

        if pnl_pct is not None:
            if best_pnl_pct is None or pnl_pct > best_pnl_pct:
                best_pnl_pct = pnl_pct
                best_coin = coin.symbol.upper()
            if worst_pnl_pct is None or pnl_pct < worst_pnl_pct:
                worst_pnl_pct = pnl_pct
                worst_coin = coin.symbol.upper()

    total_pnl = total_value - total_cost_basis
    total_pnl_pct = (total_pnl / total_cost_basis * 100) if total_cost_basis > 0 else None

    writer.writerow([])
    writer.writerow([
        "TOTAL", "", "USD", "", "",  "",
        round(total_cost_basis, 2),
        round(total_value, 2),
        round(total_pnl, 2),
        round(total_pnl_pct, 2) if total_pnl_pct is not None else "",
        "", "",
    ])
    if best_coin:
        writer.writerow(["Best Performer", best_coin, "", "", "", "", "", "", "", round(best_pnl_pct, 2) if best_pnl_pct is not None else "", "", ""])
    if worst_coin:
        writer.writerow(["Worst Performer", worst_coin, "", "", "", "", "", "", "", round(worst_pnl_pct, 2) if worst_pnl_pct is not None else "", "", ""])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="cryptoflow-portfolio-{date.today().isoformat()}.csv"'},
    )


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

    since = datetime.now(timezone.utc) - timedelta(days=days)
    # Use hourly buckets for ≤90 days, daily for longer periods
    interval = "hour" if days <= 90 else "day"

    # Build holdings data for SQL: (coin_id, quantity, created_at)
    holdings_data = [
        {"cid": h.coin_id, "qty": float(h.quantity), "created": h.created_at}
        for h in holdings
    ]

    # SQL pushdown: aggregate prices into time buckets and compute portfolio value
    # This avoids loading all raw rows into Python
    rows = db.execute(
        text("""
            WITH buckets AS (
                SELECT
                    date_trunc(:interval, timestamp) AS bucket,
                    coin_id,
                    AVG(price_usd) AS avg_price
                FROM fact_market_data
                WHERE coin_id = ANY(:coin_ids)
                  AND timestamp >= :since
                  AND price_usd IS NOT NULL
                GROUP BY bucket, coin_id
            )
            SELECT
                b.bucket,
                SUM(h.qty * b.avg_price) AS portfolio_value
            FROM buckets b
            JOIN (
                SELECT
                    unnest(:h_coin_ids) AS coin_id,
                    unnest(:h_quantities) AS qty,
                    unnest(:h_created_ats) AS created_at
            ) h ON h.coin_id = b.coin_id AND h.created_at <= b.bucket
            GROUP BY b.bucket
            HAVING SUM(h.qty * b.avg_price) > 0
            ORDER BY b.bucket
        """),
        {
            "interval": interval,
            "coin_ids": list({h.coin_id for h in holdings}),
            "since": since,
            "h_coin_ids": [d["cid"] for d in holdings_data],
            "h_quantities": [d["qty"] for d in holdings_data],
            "h_created_ats": [d["created"] for d in holdings_data],
        },
    ).fetchall()

    if not rows:
        return PortfolioPerformance(days=days, data_points=[])

    data_points = [
        PerformancePoint(
            timestamp=row.bucket.isoformat(),
            value_usd=round(float(row.portfolio_value), 2),
        )
        for row in rows
    ]

    # Downsample to ~200 points if needed
    if len(data_points) > 200:
        step = len(data_points) / 200
        data_points = [data_points[int(i * step)] for i in range(200)]

    return PortfolioPerformance(days=days, data_points=data_points)


@router.get("/history")
def get_portfolio_history(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get portfolio total value timeline (hourly buckets)."""
    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.user_id == current_user.id)
        .all()
    )
    if not holdings:
        return []

    coin_quantities: dict[int, float] = {}
    for h in holdings:
        # Sum quantities per coin (user may have multiple holdings of the same coin)
        coin_quantities[h.coin_id] = coin_quantities.get(h.coin_id, 0.0) + float(h.quantity)
    coin_ids = list(coin_quantities.keys())

    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = db.execute(text("""
        SELECT
            date_trunc('hour', timestamp) AS bucket,
            coin_id,
            AVG(price_usd) AS avg_price
        FROM fact_market_data
        WHERE coin_id = ANY(:coin_ids)
          AND timestamp >= :since
          AND price_usd IS NOT NULL
        GROUP BY bucket, coin_id
        ORDER BY bucket
    """), {"coin_ids": coin_ids, "since": since}).fetchall()

    if not rows:
        return []

    # Aggregate: sum(quantity * avg_price) per bucket
    from collections import defaultdict
    bucket_values: dict[datetime, float] = defaultdict(float)
    for row in rows:
        qty = coin_quantities.get(row.coin_id, 0.0)
        bucket_values[row.bucket] += qty * float(row.avg_price)

    data_points = [
        {"timestamp": bucket.isoformat(), "value": round(value, 2)}
        for bucket, value in sorted(bucket_values.items())
        if value > 0
    ]

    # Downsample to ~300 points max
    if len(data_points) > 300:
        step = len(data_points) / 300
        data_points = [data_points[int(i * step)] for i in range(300)]

    return data_points


@router.get("/benchmark")
def get_benchmark(
    days: int = Query(30, ge=1, le=365),
    symbol: str = Query("btc", description="Benchmark coin symbol"),
    db: Session = Depends(get_db),
):
    """Get normalized benchmark price data (base 100) for comparison with portfolio."""
    coin = db.query(DimCoin).filter(DimCoin.symbol == symbol.lower()).first()
    if not coin:
        raise HTTPException(status_code=404, detail="Benchmark coin not found")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(FactMarketData.timestamp, FactMarketData.price_usd)
        .filter(
            FactMarketData.coin_id == coin.id,
            FactMarketData.timestamp >= since,
            FactMarketData.price_usd.isnot(None),
        )
        .order_by(FactMarketData.timestamp.asc())
        .all()
    )

    if not rows:
        return {"symbol": symbol.upper(), "days": days, "data_points": []}

    base_price = float(rows[0].price_usd)
    points = [
        {"timestamp": r.timestamp.isoformat(), "value": round(float(r.price_usd) / base_price * 100, 2)}
        for r in rows
    ]

    # Downsample to ~200 points
    if len(points) > 200:
        step = len(points) / 200
        points = [points[int(i * step)] for i in range(200)]

    return {"symbol": symbol.upper(), "days": days, "data_points": points}
