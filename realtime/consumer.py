"""
CoinCap WebSocket Consumer → Redis Pub/Sub

Connects to CoinCap's WebSocket API for real-time crypto prices
and publishes them to a Redis channel for consumption by FastAPI.

Usage: python -m realtime.consumer
"""
import asyncio
import json
import signal
import sys
import logging

import redis
import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REDIS_URL = "redis://localhost:6379/0"
REDIS_CHANNEL = "crypto:prices"
COINCAP_WS_URL = "wss://ws.coincap.io/prices?assets=bitcoin,ethereum,tether,binancecoin,solana,ripple,usd-coin,cardano,dogecoin,avalanche-2,polkadot,chainlink,tron,polygon,shiba-inu,litecoin,bitcoin-cash,uniswap,stellar,monero"

# Top 20 assets matching CoinGecko IDs

shutdown_event = asyncio.Event()


def handle_shutdown(sig, frame):
    logger.info(f"Received signal {sig}, shutting down...")
    shutdown_event.set()


async def consume():
    """Connect to CoinCap WebSocket, publish prices to Redis."""
    r = redis.from_url(REDIS_URL)

    while not shutdown_event.is_set():
        try:
            logger.info(f"Connecting to CoinCap WebSocket...")
            async with websockets.connect(COINCAP_WS_URL, ping_interval=30) as ws:
                logger.info("Connected to CoinCap WebSocket")

                while not shutdown_event.is_set():
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=60)
                        data = json.loads(msg)

                        # data is like {"bitcoin": "43521.12", "ethereum": "2234.56", ...}
                        if data:
                            payload = json.dumps({
                                "type": "price_update",
                                "prices": {k: float(v) for k, v in data.items()},
                            })
                            r.publish(REDIS_CHANNEL, payload)

                    except asyncio.TimeoutError:
                        # Send ping to keep alive
                        try:
                            await ws.ping()
                        except Exception:
                            break

        except websockets.ConnectionClosed:
            logger.warning("WebSocket connection closed, reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"Error: {e}, reconnecting in 10s...")
            await asyncio.sleep(10)

    r.close()
    logger.info("Consumer shutdown complete")


def main():
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    logger.info("Starting CoinCap WebSocket consumer...")
    asyncio.run(consume())


if __name__ == "__main__":
    main()
