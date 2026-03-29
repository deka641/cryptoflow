from collections import defaultdict

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.coin import DimCoin
from app.models.portfolio import PortfolioHolding


def compute_attribution(db: Session, user_id: int) -> dict:
    """Compute portfolio performance attribution by holding and sector."""
    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.user_id == user_id)
        .all()
    )

    if not holdings:
        return {
            "total_value": 0.0,
            "total_cost_basis": 0.0,
            "total_pnl": 0.0,
            "total_return_pct": 0.0,
            "holdings": [],
            "sectors": [],
        }

    coin_ids = list({h.coin_id for h in holdings})

    # Fetch current prices from materialized view
    prices: dict[int, float | None] = {}
    rows = db.execute(
        text("SELECT coin_id, price_usd FROM mv_latest_market_data WHERE coin_id = ANY(:ids)"),
        {"ids": coin_ids},
    ).fetchall()
    for r in rows:
        prices[r.coin_id] = float(r.price_usd) if r.price_usd is not None else None

    # Fetch coin info (symbol, name, image_url, category)
    coins: dict[int, DimCoin] = {}
    for c in db.query(DimCoin).filter(DimCoin.id.in_(coin_ids)).all():
        coins[c.id] = c

    # First pass: calculate per-holding values and total portfolio value
    holding_data: list[dict] = []
    total_value = 0.0
    total_cost_basis = 0.0

    for h in holdings:
        coin = coins.get(h.coin_id)
        if not coin:
            continue

        current_price = prices.get(h.coin_id)
        if current_price is None:
            continue

        quantity = float(h.quantity)
        buy_price = float(h.buy_price_usd)
        cost_basis = quantity * buy_price
        current_value = quantity * current_price
        pnl = current_value - cost_basis
        return_pct = (pnl / cost_basis * 100) if cost_basis > 0 else 0.0

        total_value += current_value
        total_cost_basis += cost_basis

        holding_data.append({
            "coin_id": coin.id,
            "symbol": coin.symbol.upper(),
            "name": coin.name,
            "image_url": coin.image_url,
            "category": coin.category,
            "quantity": quantity,
            "cost_basis": round(cost_basis, 2),
            "current_value": round(current_value, 2),
            "pnl": round(pnl, 2),
            "return_pct": round(return_pct, 2),
            "weight": 0.0,  # placeholder, computed in second pass
            "contribution": 0.0,  # placeholder, computed in second pass
        })

    total_pnl = total_value - total_cost_basis
    total_return_pct = (total_pnl / total_cost_basis * 100) if total_cost_basis > 0 else 0.0

    # Second pass: compute weight and contribution
    for item in holding_data:
        if total_value > 0:
            item["weight"] = round(item["current_value"] / total_value, 4)
        item["contribution"] = round(item["weight"] * item["return_pct"], 2)

    # Sector attribution: group by category
    sector_map: dict[str, dict] = defaultdict(lambda: {
        "total_value": 0.0,
        "contribution": 0.0,
        "holding_count": 0,
    })

    for item in holding_data:
        cat = item["category"] or "Uncategorized"
        sector_map[cat]["total_value"] += item["current_value"]
        sector_map[cat]["contribution"] += item["contribution"]
        sector_map[cat]["holding_count"] += 1

    sectors = [
        {
            "category": cat,
            "total_value": round(data["total_value"], 2),
            "contribution": round(data["contribution"], 2),
            "holding_count": data["holding_count"],
        }
        for cat, data in sorted(sector_map.items(), key=lambda x: abs(x[1]["contribution"]), reverse=True)
    ]

    return {
        "total_value": round(total_value, 2),
        "total_cost_basis": round(total_cost_basis, 2),
        "total_pnl": round(total_pnl, 2),
        "total_return_pct": round(total_return_pct, 2),
        "holdings": holding_data,
        "sectors": sectors,
    }
