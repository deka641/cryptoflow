"""Generate market summary reports from existing warehouse data."""

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_market_summary(db: Session, period_days: int = 7) -> dict:
    """Generate a market summary for the given period.

    Returns top performers, biggest losers, volatility changes,
    and market cap shift data — all from existing tables.
    """
    # Top performers (best price change over period)
    top_performers = db.execute(text("""
        WITH first_last AS (
            SELECT
                coin_id,
                FIRST_VALUE(price_usd) OVER (PARTITION BY coin_id ORDER BY timestamp ASC) AS first_price,
                LAST_VALUE(price_usd) OVER (PARTITION BY coin_id ORDER BY timestamp ASC
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_price
            FROM fact_market_data
            WHERE timestamp >= NOW() - MAKE_INTERVAL(days => :days)
              AND price_usd IS NOT NULL AND price_usd > 0
        ),
        returns AS (
            SELECT DISTINCT ON (coin_id)
                coin_id,
                first_price,
                last_price,
                ((last_price - first_price) / first_price * 100) AS return_pct
            FROM first_last
        )
        SELECT r.coin_id, c.symbol, c.name, c.image_url,
               r.first_price, r.last_price, r.return_pct
        FROM returns r
        JOIN dim_coin c ON c.id = r.coin_id
        ORDER BY r.return_pct DESC
        LIMIT 5
    """), {"days": period_days}).fetchall()

    # Biggest losers
    top_losers = db.execute(text("""
        WITH first_last AS (
            SELECT
                coin_id,
                FIRST_VALUE(price_usd) OVER (PARTITION BY coin_id ORDER BY timestamp ASC) AS first_price,
                LAST_VALUE(price_usd) OVER (PARTITION BY coin_id ORDER BY timestamp ASC
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_price
            FROM fact_market_data
            WHERE timestamp >= NOW() - MAKE_INTERVAL(days => :days)
              AND price_usd IS NOT NULL AND price_usd > 0
        ),
        returns AS (
            SELECT DISTINCT ON (coin_id)
                coin_id,
                first_price,
                last_price,
                ((last_price - first_price) / first_price * 100) AS return_pct
            FROM first_last
        )
        SELECT r.coin_id, c.symbol, c.name, c.image_url,
               r.first_price, r.last_price, r.return_pct
        FROM returns r
        JOIN dim_coin c ON c.id = r.coin_id
        ORDER BY r.return_pct ASC
        LIMIT 5
    """), {"days": period_days}).fetchall()

    # Market cap change
    market_cap_row = db.execute(text("""
        WITH bounds AS (
            SELECT
                (SELECT SUM(market_cap) FROM mv_latest_market_data) AS current_cap,
                (SELECT SUM(f.market_cap)
                 FROM (
                     SELECT DISTINCT ON (coin_id) market_cap
                     FROM fact_market_data
                     WHERE timestamp >= NOW() - MAKE_INTERVAL(days => :days)
                       AND timestamp <= NOW() - MAKE_INTERVAL(days => :days) + INTERVAL '2 hours'
                       AND market_cap IS NOT NULL
                     ORDER BY coin_id, timestamp ASC
                 ) f) AS start_cap
        )
        SELECT current_cap, start_cap,
               CASE WHEN start_cap > 0
                    THEN ((current_cap - start_cap) / start_cap * 100)
                    ELSE NULL END AS change_pct
        FROM bounds
    """), {"days": period_days}).fetchone()

    # Most volatile coins in period (from analytics table)
    most_volatile = db.execute(text("""
        SELECT c.symbol, c.name, c.image_url, v.volatility
        FROM analytics_volatility v
        JOIN dim_coin c ON c.id = v.coin_id
        WHERE v.period_days = :days
          AND v.volatility IS NOT NULL
        ORDER BY v.volatility DESC
        LIMIT 5
    """), {"days": min(period_days, 90)}).fetchall()

    def _coin_row(r) -> dict:
        return {
            "coin_id": r.coin_id,
            "symbol": r.symbol.upper(),
            "name": r.name,
            "image_url": r.image_url,
            "return_pct": round(float(r.return_pct), 2),
        }

    return {
        "period_days": period_days,
        "top_performers": [_coin_row(r) for r in top_performers],
        "top_losers": [_coin_row(r) for r in top_losers],
        "market_cap": {
            "current": float(market_cap_row.current_cap) if market_cap_row and market_cap_row.current_cap else None,
            "change_pct": round(float(market_cap_row.change_pct), 2) if market_cap_row and market_cap_row.change_pct else None,
        },
        "most_volatile": [
            {
                "symbol": r.symbol.upper(),
                "name": r.name,
                "image_url": r.image_url,
                "volatility": round(float(r.volatility), 2),
            }
            for r in most_volatile
        ],
    }
