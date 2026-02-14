from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.coin import DimCoin
from app.models.analytics import AnalyticsCorrelation, AnalyticsVolatility


def get_correlation_matrix(db: Session, period_days: int = 30, top_n: int = 15) -> dict:
    """Return correlation matrix for top coins by market cap."""
    coins = (
        db.query(DimCoin)
        .filter(DimCoin.market_cap_rank.isnot(None))
        .order_by(DimCoin.market_cap_rank)
        .limit(top_n)
        .all()
    )
    coin_map = {c.id: c.symbol for c in coins}
    coin_ids = [c.id for c in coins]
    symbols = [c.symbol for c in coins]

    correlations = (
        db.query(AnalyticsCorrelation)
        .filter(AnalyticsCorrelation.period_days == period_days)
        .all()
    )

    # Build NxN matrix
    n = len(coin_ids)
    matrix = [[None] * n for _ in range(n)]
    computed_at = None

    for corr in correlations:
        if corr.coin_a_id in coin_map and corr.coin_b_id in coin_map:
            i = coin_ids.index(corr.coin_a_id) if corr.coin_a_id in coin_ids else -1
            j = coin_ids.index(corr.coin_b_id) if corr.coin_b_id in coin_ids else -1
            if i >= 0 and j >= 0:
                val = float(corr.correlation) if corr.correlation is not None else None
                matrix[i][j] = val
                matrix[j][i] = val
                if corr.computed_at:
                    computed_at = corr.computed_at

    # Diagonal = 1.0
    for i in range(n):
        matrix[i][i] = 1.0

    return {
        "coins": symbols,
        "matrix": matrix,
        "period_days": period_days,
        "computed_at": computed_at,
    }


def get_volatility_ranking(db: Session, period_days: int = 30) -> list[dict]:
    """Return coins ranked by volatility."""
    coins = {c.id: c for c in db.query(DimCoin).all()}

    entries = (
        db.query(AnalyticsVolatility)
        .filter(AnalyticsVolatility.period_days == period_days)
        .order_by(AnalyticsVolatility.volatility.desc())
        .all()
    )

    latest_rows = db.execute(text("SELECT coin_id, market_cap FROM mv_latest_market_data")).fetchall()
    market_caps = {r.coin_id: float(r.market_cap) if r.market_cap else None for r in latest_rows}

    result = []
    for e in entries:
        coin = coins.get(e.coin_id)
        if coin:
            result.append({
                "coin_id": e.coin_id,
                "symbol": coin.symbol,
                "name": coin.name,
                "volatility": float(e.volatility) if e.volatility else 0,
                "max_drawdown": float(e.max_drawdown) if e.max_drawdown else None,
                "sharpe_ratio": float(e.sharpe_ratio) if e.sharpe_ratio else None,
                "period_days": e.period_days,
                "market_cap": market_caps.get(e.coin_id),
                "image_url": coin.image_url,
            })

    return result
