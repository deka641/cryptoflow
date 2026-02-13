from fastapi import APIRouter

from app.routers import auth, coins, market, analytics, pipeline, quality, websocket

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(coins.router, prefix="/coins", tags=["coins"])
api_router.include_router(market.router, prefix="/market", tags=["market"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
api_router.include_router(quality.router, prefix="/quality", tags=["quality"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])
