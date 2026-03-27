"""
CoinCap WebSocket Consumer -> Redis Pub/Sub

Connects to CoinCap's WebSocket API for real-time crypto prices
and publishes them to a Redis channel for consumption by FastAPI.

Usage: python -m realtime.consumer
"""
import asyncio
import json
import os
import random
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
# Last reconciled: 2026-03-17 — covers all likely top-50 coins by market cap.
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
    # Additional mappings for top-50 coverage
    "sui": "sui",
    "pepe": "pepe",
    "injective-protocol": "injective-protocol",
    "immutable-x": "immutable-x",
    "sei": "sei-network",
    "celestia": "celestia",
    "jupiter": "jupiter-exchange-solana",
    "ondo-finance": "ondo-finance",
    "mantle": "mantle",
    "optimism": "optimism",
    "arbitrum": "arbitrum",
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
    last_prices: dict[str, str] = {}

    logger.info("Tracking %d coins via CoinCap WebSocket", len(COINCAP_TO_COINGECKO))

    reconnect_attempt = 0

    while not shutdown_event.is_set():
        try:
            logger.info("Connecting to CoinCap WebSocket...")
            async with websockets.connect(COINCAP_WS_URL, ping_interval=30) as ws:
                logger.info("Connected to CoinCap WebSocket")
                reconnect_attempt = 0

                while not shutdown_event.is_set():
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=60)
                        try:
                            data = json.loads(msg)
                        except (json.JSONDecodeError, TypeError):
                            logger.warning("Non-JSON message from CoinCap, skipping: %s", str(msg)[:100])
                            continue

                        if data:
                            # Map CoinCap IDs to CoinGecko IDs and filter unchanged prices
                            mapped_prices: dict[str, float] = {}
                            for coincap_id, price_str in data.items():
                                coingecko_id = COINCAP_TO_COINGECKO.get(coincap_id)
                                if coingecko_id is None:
                                    continue
                                price = float(price_str)
                                if last_prices.get(coingecko_id) == price_str:
                                    continue
                                last_prices[coingecko_id] = price_str
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
            base_delay = min(2 ** reconnect_attempt * 2, 60)
            jitter = random.random()
            delay = base_delay + jitter
            logger.warning("WebSocket connection closed, reconnecting in %.1fs...", delay)
            await asyncio.sleep(delay)
            reconnect_attempt += 1
        except Exception as e:
            base_delay = min(2 ** reconnect_attempt * 2, 60)
            jitter = random.random()
            delay = base_delay + jitter
            logger.error("Error: %s, reconnecting in %.1fs...", e, delay)
            await asyncio.sleep(delay)
            reconnect_attempt += 1

    await r.aclose()
    logger.info("Consumer shutdown complete")


def main():
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    logger.info("Starting CoinCap WebSocket consumer...")
    asyncio.run(consume())


if __name__ == "__main__":
    main()
