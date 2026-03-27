#!/usr/bin/env python3
"""Check all active price alerts and trigger notifications via webhook."""

import logging
import os
import sys
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

# Ensure project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
load_dotenv()

# Must be after sys.path setup so _common is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import db_connection, log_pipeline_run

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DSN = os.getenv("DATABASE_URL", "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow")


def send_webhook(url: str, payload: dict) -> bool:
    """Send a webhook notification. Returns True on success."""
    try:
        resp = requests.post(
            url,
            json=payload,
            timeout=10,
            headers={"Content-Type": "application/json"},
        )
        return resp.status_code < 400
    except Exception as e:
        logger.warning("Webhook delivery failed to %s: %s", url, e)
        return False


def main():
    start_time = datetime.now(timezone.utc)
    triggered_count = 0
    errors = []

    try:
        with db_connection(DSN) as conn:
            cur = conn.cursor()

            # Get latest prices from materialized view
            cur.execute("SELECT coin_id, price_usd FROM mv_latest_market_data WHERE price_usd IS NOT NULL")
            prices = {row[0]: float(row[1]) for row in cur.fetchall()}

            # Get all untriggered alerts with user webhook URLs
            cur.execute("""
                SELECT a.id, a.user_id, a.coin_id, a.target_price, a.direction,
                       u.webhook_url, u.email, c.symbol, c.name
                FROM price_alerts a
                JOIN users u ON u.id = a.user_id
                JOIN dim_coin c ON c.id = a.coin_id
                WHERE a.triggered = false
            """)
            alerts = cur.fetchall()

            now = datetime.now(timezone.utc)
            webhook_sent = 0

            for alert_id, user_id, coin_id, target_price, direction, webhook_url, email, symbol, name in alerts:
                price = prices.get(coin_id)
                if price is None:
                    continue

                target = float(target_price)
                should_trigger = (
                    (direction == "above" and price >= target) or
                    (direction == "below" and price <= target)
                )

                if not should_trigger:
                    continue

                # Mark as triggered
                cur.execute(
                    "UPDATE price_alerts SET triggered = true, triggered_at = %s WHERE id = %s",
                    (now, alert_id),
                )
                triggered_count += 1

                # Send webhook if configured
                if webhook_url:
                    payload = {
                        "content": f"Price Alert Triggered: {name} ({symbol.upper()}) {direction} ${target:,.2f} - Current price: ${price:,.2f}",
                        "embeds": [{
                            "title": f"{name} ({symbol.upper()}) Alert",
                            "description": f"Price went {direction} ${target:,.2f}",
                            "fields": [
                                {"name": "Target", "value": f"${target:,.2f}", "inline": True},
                                {"name": "Current", "value": f"${price:,.2f}", "inline": True},
                                {"name": "Direction", "value": direction.capitalize(), "inline": True},
                            ],
                            "color": 5763719 if direction == "above" else 15548997,
                        }],
                    }
                    if send_webhook(webhook_url, payload):
                        webhook_sent += 1
                    else:
                        errors.append(f"Webhook failed for alert {alert_id}")

            conn.commit()

            logger.info("Checked %d alerts, triggered %d, sent %d webhooks", len(alerts), triggered_count, webhook_sent)

        # Log pipeline run using the shared utility
        error_msg = "; ".join(errors) if errors else None
        log_pipeline_run("check_alerts", start_time, triggered_count, error_msg, DSN)

    except Exception as e:
        logger.error("Alert check failed: %s", e)
        try:
            log_pipeline_run("check_alerts", start_time, 0, str(e), DSN)
        except Exception:
            pass


if __name__ == "__main__":
    main()
