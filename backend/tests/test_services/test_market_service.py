"""Tests for app.services.market_service (get_market_overview, get_kpi_sparklines)."""

from datetime import datetime, timezone, timedelta

import pytest
from sqlalchemy import text

from app.services.market_service import get_market_overview, get_kpi_sparklines


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _insert_coin(db, *, coin_id, coingecko_id, symbol, name, market_cap_rank=None, image_url=None):
    """Insert a row into dim_coin and return the coin_id."""
    db.execute(text("""
        INSERT INTO dim_coin (id, coingecko_id, symbol, name, market_cap_rank, image_url, created_at, updated_at)
        VALUES (:id, :cg_id, :sym, :name, :rank, :img, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
    """), {
        "id": coin_id,
        "cg_id": coingecko_id,
        "sym": symbol,
        "name": name,
        "rank": market_cap_rank,
        "img": image_url,
    })
    db.flush()
    return coin_id


def _insert_market_data(db, *, coin_id, timestamp, price_usd, market_cap,
                        total_volume, price_change_24h_pct=None,
                        circulating_supply=None):
    """Insert a row into fact_market_data."""
    db.execute(text("""
        INSERT INTO fact_market_data
            (coin_id, timestamp, price_usd, market_cap, total_volume,
             price_change_24h_pct, circulating_supply)
        VALUES
            (:coin_id, :ts, :price, :mcap, :vol, :pct, :csup)
    """), {
        "coin_id": coin_id,
        "ts": timestamp,
        "price": price_usd,
        "mcap": market_cap,
        "vol": total_volume,
        "pct": price_change_24h_pct,
        "csup": circulating_supply,
    })
    db.flush()


def _refresh_mv(db):
    """Refresh the mv_latest_market_data materialized view."""
    db.execute(text("REFRESH MATERIALIZED VIEW mv_latest_market_data"))
    db.flush()


def _clean_slate(db):
    """Delete all data from tables that reference dim_coin, then dim_coin itself.

    This gives tests full control over what coins exist, avoiding interference
    from seed data (e.g. an existing BTC row with id=2).
    """
    for table in (
        "price_alerts", "portfolio_holdings", "user_watchlist",
        "analytics_correlation", "analytics_volatility",
        "fact_daily_ohlcv", "fact_market_data",
        "dim_coin",
    ):
        db.execute(text(f"DELETE FROM {table}"))
    db.flush()


def _now():
    return datetime.now(timezone.utc)


# Use very high coin IDs to avoid collisions with production seed data.
_BASE_ID = 900_000


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGetMarketOverview:
    """Tests for get_market_overview()."""

    def test_market_overview_empty_db(self, db):
        """When no data exists in the materialized view, return zeros/empty lists."""
        _clean_slate(db)
        _refresh_mv(db)

        result = get_market_overview(db)

        assert result["total_market_cap"] == 0
        assert result["total_volume_24h"] == 0
        assert result["btc_dominance"] == 0
        assert result["active_coins"] == 0
        assert result["top_gainers"] == []
        assert result["top_losers"] == []
        assert result["market_cap_change_24h_pct"] is None
        assert result["volume_change_24h_pct"] is None

    def test_market_overview_with_data(self, db):
        """Insert test coins + market data and verify aggregation."""
        now = _now()

        c1 = _insert_coin(db, coin_id=_BASE_ID + 1, coingecko_id="test-coin-a",
                          symbol="tca", name="Test Coin A", market_cap_rank=1)
        c2 = _insert_coin(db, coin_id=_BASE_ID + 2, coingecko_id="test-coin-b",
                          symbol="tcb", name="Test Coin B", market_cap_rank=2)

        _insert_market_data(db, coin_id=c1, timestamp=now,
                            price_usd=50000, market_cap=1_000_000_000_000,
                            total_volume=50_000_000_000,
                            price_change_24h_pct=2.5,
                            circulating_supply=20_000_000)
        _insert_market_data(db, coin_id=c2, timestamp=now,
                            price_usd=3000, market_cap=300_000_000_000,
                            total_volume=20_000_000_000,
                            price_change_24h_pct=-1.2,
                            circulating_supply=100_000_000)
        _refresh_mv(db)

        result = get_market_overview(db)

        assert result["active_coins"] >= 2
        assert result["total_market_cap"] >= 1_300_000_000_000
        assert result["total_volume_24h"] >= 70_000_000_000

    def test_btc_dominance_calculation(self, db):
        """BTC dominance should reflect BTC's share of total market cap."""
        now = _now()

        # Full clean slate so the only 'btc' coin is ours.
        _clean_slate(db)

        # We must use symbol 'btc' (lowercase) because the service filters on it.
        btc_id = _insert_coin(db, coin_id=_BASE_ID + 10, coingecko_id="test-bitcoin-dom",
                              symbol="btc", name="Test Bitcoin", market_cap_rank=1)
        eth_id = _insert_coin(db, coin_id=_BASE_ID + 11, coingecko_id="test-ethereum-dom",
                              symbol="eth", name="Test Ethereum", market_cap_rank=2)

        _insert_market_data(db, coin_id=btc_id, timestamp=now,
                            price_usd=60000, market_cap=800_000_000_000,
                            total_volume=30_000_000_000,
                            circulating_supply=19_000_000)
        _insert_market_data(db, coin_id=eth_id, timestamp=now,
                            price_usd=3500, market_cap=200_000_000_000,
                            total_volume=15_000_000_000,
                            circulating_supply=120_000_000)
        _refresh_mv(db)

        result = get_market_overview(db)

        # BTC dominance = 800B / (800B + 200B) * 100 = 80%
        assert result["btc_dominance"] == pytest.approx(80.0, abs=0.01)

    def test_top_movers_sorting(self, db):
        """Gainers sorted descending, losers sorted ascending (reversed)."""
        now = _now()

        _clean_slate(db)

        pct_values = [10.0, 5.0, 2.0, -1.0, -3.0, -8.0]
        for i, pct in enumerate(pct_values):
            cid = _BASE_ID + 20 + i
            _insert_coin(db, coin_id=cid, coingecko_id=f"test-mover-{i}",
                         symbol=f"mv{i}", name=f"Mover {i}", market_cap_rank=i + 1)
            _insert_market_data(db, coin_id=cid, timestamp=now,
                                price_usd=100 + i, market_cap=1_000_000 * (i + 1),
                                total_volume=500_000, price_change_24h_pct=pct,
                                circulating_supply=10_000)
        _refresh_mv(db)

        result = get_market_overview(db)

        gainers = result["top_gainers"]
        losers = result["top_losers"]

        assert len(gainers) > 0
        assert len(losers) > 0

        # Gainers should be in descending order of price_change_24h_pct
        gainer_pcts = [g["price_change_24h_pct"] for g in gainers]
        assert gainer_pcts == sorted(gainer_pcts, reverse=True)

        # Top gainer should be +10%
        assert gainers[0]["price_change_24h_pct"] == pytest.approx(10.0, abs=0.01)

        # Losers are the last 5 items reversed, so the worst loser is first
        loser_pcts = [l["price_change_24h_pct"] for l in losers]
        assert loser_pcts == sorted(loser_pcts)

        # Worst loser should be -8%
        assert losers[0]["price_change_24h_pct"] == pytest.approx(-8.0, abs=0.01)

    def test_market_overview_24h_deltas(self, db):
        """Insert current + 24h-ago data and verify market_cap_change_24h_pct and volume_change_24h_pct."""
        now = _now()
        ago = now - timedelta(hours=25)  # 25 hours ago (within 24-48h window)

        _clean_slate(db)

        cid = _BASE_ID + 30
        _insert_coin(db, coin_id=cid, coingecko_id="test-delta-coin",
                     symbol="tdc", name="Delta Coin", market_cap_rank=1)

        # Current data: market_cap = 1T, volume = 50B
        _insert_market_data(db, coin_id=cid, timestamp=now,
                            price_usd=50000, market_cap=1_000_000_000_000,
                            total_volume=50_000_000_000,
                            circulating_supply=20_000_000)

        # 25h-ago data: market_cap derived from price * supply, volume = 40B
        # The delta query computes prev_market_cap as SUM(price_usd * circulating_supply)
        # So prev_market_cap = 45000 * 20_000_000 = 900_000_000_000
        _insert_market_data(db, coin_id=cid, timestamp=ago,
                            price_usd=45000, market_cap=900_000_000_000,
                            total_volume=40_000_000_000,
                            circulating_supply=20_000_000)
        _refresh_mv(db)

        result = get_market_overview(db)

        # market_cap_change_24h_pct = (1T - 900B) / 900B * 100 ≈ 11.11%
        assert result["market_cap_change_24h_pct"] is not None
        assert result["market_cap_change_24h_pct"] == pytest.approx(11.11, abs=0.1)

        # volume_change_24h_pct = (50B - 40B) / 40B * 100 = 25%
        assert result["volume_change_24h_pct"] is not None
        assert result["volume_change_24h_pct"] == pytest.approx(25.0, abs=0.1)


class TestGetKpiSparklines:
    """Tests for get_kpi_sparklines()."""

    def test_kpi_sparklines_empty(self, db):
        """Returns empty lists when no recent data exists."""
        _clean_slate(db)

        result = get_kpi_sparklines(db)

        assert result["market_cap"] == []
        assert result["volume"] == []
        assert result["btc_dominance"] == []

    def test_kpi_sparklines_with_data(self, db):
        """Insert 7 days of data and verify sparkline arrays are non-empty."""
        now = _now()

        _clean_slate(db)

        cid = _BASE_ID + 40
        _insert_coin(db, coin_id=cid, coingecko_id="test-spark-coin",
                     symbol="btc", name="Spark Bitcoin", market_cap_rank=1)

        # Insert data points every 6 hours for the last 7 days (28 points)
        for i in range(28):
            ts = now - timedelta(hours=i * 6)
            base_price = 50000 + (i * 100)  # varying price
            _insert_market_data(
                db, coin_id=cid, timestamp=ts,
                price_usd=base_price,
                market_cap=base_price * 19_000_000,
                total_volume=30_000_000_000 + (i * 1_000_000_000),
                circulating_supply=19_000_000,
            )
        db.flush()

        result = get_kpi_sparklines(db)

        assert len(result["market_cap"]) > 0
        assert len(result["volume"]) > 0
        assert len(result["btc_dominance"]) > 0

        # All market_cap values should be positive
        assert all(v > 0 for v in result["market_cap"])

        # All volume values should be positive
        assert all(v > 0 for v in result["volume"])

        # BTC dominance should be 100% since it's the only coin
        assert all(pytest.approx(v, abs=0.1) == 100.0 for v in result["btc_dominance"])
