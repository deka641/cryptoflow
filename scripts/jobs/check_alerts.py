#!/usr/bin/env python3
"""Check all active price alerts and trigger notifications via webhook."""

import logging
import os
import sys
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

# Ensure project root is on the path for app imports
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)
from app.utils.url_validation import is_safe_webhook_url

# Ensure project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
load_dotenv()

# Must be after sys.path setup so _common is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import db_connection, log_pipeline_run

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DSN = os.getenv("DATABASE_URL", "postgresql://cryptoflow:cryptoflow123@localhost:5432/cryptoflow")

MAX_WEBHOOK_ATTEMPTS = 3
IN_RUN_RETRY_DELAY = 2  # seconds


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


def _attempt_webhook_delivery(webhook_url: str, payload: dict) -> bool:
    """Attempt webhook delivery with one in-run retry on failure."""
    if send_webhook(webhook_url, payload):
        return True
    # In-run retry: wait and try once more
    logger.info("Webhook failed, retrying in %ds...", IN_RUN_RETRY_DELAY)
    time.sleep(IN_RUN_RETRY_DELAY)
    return send_webhook(webhook_url, payload)


def _build_webhook_payload(name: str, symbol: str, direction: str, target: float, price: float) -> dict:
    """Build a Discord/Slack-compatible webhook payload."""
    return {
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

                # Mark as triggered; set webhook_status to 'pending' if user has a webhook
                has_webhook = webhook_url and is_safe_webhook_url(webhook_url)
                if has_webhook:
                    cur.execute(
                        "UPDATE price_alerts SET triggered = true, triggered_at = %s, "
                        "webhook_status = 'pending', webhook_attempts = 0 WHERE id = %s",
                        (now, alert_id),
                    )
                else:
                    cur.execute(
                        "UPDATE price_alerts SET triggered = true, triggered_at = %s WHERE id = %s",
                        (now, alert_id),
                    )
                triggered_count += 1

            conn.commit()

            # --- Second pass: deliver pending webhooks ---
            cur.execute("""
                SELECT a.id, a.target_price, a.direction, a.webhook_attempts,
                       u.webhook_url, c.symbol, c.name, a.coin_id
                FROM price_alerts a
                JOIN users u ON u.id = a.user_id
                JOIN dim_coin c ON c.id = a.coin_id
                WHERE a.triggered = true
                  AND a.webhook_status = 'pending'
                  AND a.webhook_attempts < %s
            """, (MAX_WEBHOOK_ATTEMPTS,))
            pending = cur.fetchall()

            for alert_id, target_price, direction, attempts, webhook_url, symbol, name, coin_id in pending:
                target = float(target_price)
                price = prices.get(coin_id, 0.0)
                payload = _build_webhook_payload(name, symbol, direction, target, price)

                if _attempt_webhook_delivery(webhook_url, payload):
                    cur.execute(
                        "UPDATE price_alerts SET webhook_status = 'sent', "
                        "webhook_attempts = webhook_attempts + 1 WHERE id = %s",
                        (alert_id,),
                    )
                    webhook_sent += 1
                else:
                    new_attempts = attempts + 1
                    if new_attempts >= MAX_WEBHOOK_ATTEMPTS:
                        cur.execute(
                            "UPDATE price_alerts SET webhook_status = 'failed', "
                            "webhook_attempts = %s WHERE id = %s",
                            (new_attempts, alert_id),
                        )
                        errors.append(f"Webhook permanently failed for alert {alert_id} after {MAX_WEBHOOK_ATTEMPTS} attempts")
                    else:
                        cur.execute(
                            "UPDATE price_alerts SET webhook_attempts = %s WHERE id = %s",
                            (new_attempts, alert_id),
                        )
                        errors.append(f"Webhook failed for alert {alert_id} (attempt {new_attempts}/{MAX_WEBHOOK_ATTEMPTS})")

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
