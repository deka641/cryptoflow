"""
CoinCap WebSocket Consumer -> Redis Pub/Sub

Connects to CoinCap's WebSocket API for real-time crypto prices
and publishes them to a Redis channel for consumption by FastAPI.

Usage: python -m realtime.consumer
"""
import asyncio
import json
import os
import signal
import logging

import redis.asyncio as aioredis
import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_CHANNEL = "crypto:prices"

# Mapping from CoinCap asset IDs to CoinGecko IDs.
# CoinCap uses its own ID scheme; the frontend expects CoinGecko IDs.
COINCAP_TO_COINGECKO = {
    "bitcoin": "bitcoin",
    "ethereum": "ethereum",
    "tether": "tether",
    "binance-coin": "binancecoin",
    "solana": "solana",
    "xrp": "ripple",
    "usd-coin": "usd-coin",
    "cardano": "cardano",
    "dogecoin": "dogecoin",
    "avalanche": "avalanche-2",
    "polkadot": "polkadot",
    "chainlink": "chainlink",
    "tron": "tron",
    "polygon": "matic-network",
    "shiba-inu": "shiba-inu",
    "litecoin": "litecoin",
    "bitcoin-cash": "bitcoin-cash",
    "uniswap": "uniswap",
    "stellar": "stellar",
    "monero": "monero",
    "wrapped-bitcoin": "wrapped-bitcoin",
    "ethereum-classic": "ethereum-classic",
    "cosmos": "cosmos",
    "internet-computer": "internet-computer",
    "hedera-hashgraph": "hedera-hashgraph",
    "filecoin": "filecoin",
    "lido-dao": "lido-dao",
    "aptos": "aptos",
    "cronos": "crypto-com-chain",
    "near-protocol": "near",
    "vechain": "vechain",
    "stacks": "blockstack",
    "the-graph": "the-graph",
    "algorand": "algorand",
    "fantom": "fantom",
    "eos": "eos",
    "aave": "aave",
    "the-sandbox": "the-sandbox",
    "decentraland": "decentraland",
    "tezos": "tezos",
    "theta": "theta-token",
    "axie-infinity": "axie-infinity",
    "maker": "maker",
    "neo": "neo",
    "kucoin-token": "kucoin-shares",
    "flow": "flow",
    "iota": "iota",
    "bittorrent": "bittorrent",
    "arweave": "arweave",
    "gala": "gala",
    "render-token": "render-token",
}

# Build CoinCap WebSocket URL with all asset IDs
_coincap_assets = ",".join(COINCAP_TO_COINGECKO.keys())
COINCAP_WS_URL = f"wss://ws.coincap.io/prices?assets={_coincap_assets}"

shutdown_event = asyncio.Event()


def handle_shutdown(sig, frame):
    logger.info("Received signal %s, shutting down...", sig)
    shutdown_event.set()


async def consume():
    """Connect to CoinCap WebSocket, publish prices to Redis."""
    r = aioredis.from_url(REDIS_URL)
    # In-memory cache of last published price per coin to filter redundant updates
    last_prices: dict[str, float] = {}

    logger.info("Tracking %d coins via CoinCap WebSocket", len(COINCAP_TO_COINGECKO))

    while not shutdown_event.is_set():
        try:
            logger.info("Connecting to CoinCap WebSocket...")
            async with websockets.connect(COINCAP_WS_URL, ping_interval=30) as ws:
                logger.info("Connected to CoinCap WebSocket")

                while not shutdown_event.is_set():
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=60)
                        data = json.loads(msg)

                        if data:
                            # Map CoinCap IDs to CoinGecko IDs and filter unchanged prices
                            mapped_prices: dict[str, float] = {}
                            for coincap_id, price_str in data.items():
                                coingecko_id = COINCAP_TO_COINGECKO.get(coincap_id)
                                if coingecko_id is None:
                                    continue
                                price = float(price_str)
                                if last_prices.get(coingecko_id) == price:
                                    continue
                                last_prices[coingecko_id] = price
                                mapped_prices[coingecko_id] = price

                            if mapped_prices:
                                payload = json.dumps({
                                    "type": "price_update",
                                    "prices": mapped_prices,
                                })
                                await r.publish(REDIS_CHANNEL, payload)

                    except asyncio.TimeoutError:
                        try:
                            await ws.ping()
                        except Exception:
                            break

        except websockets.ConnectionClosed:
            logger.warning("WebSocket connection closed, reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.error("Error: %s, reconnecting in 10s...", e)
            await asyncio.sleep(10)

    await r.aclose()
    logger.info("Consumer shutdown complete")


def main():
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    logger.info("Starting CoinCap WebSocket consumer...")
    asyncio.run(consume())


if __name__ == "__main__":
    main()
