from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.coin import DimCoin
from app.models.alert import PriceAlert

router = APIRouter()


class AlertCreate(BaseModel):
    coin_id: int
    target_price: float
    direction: str  # "above" or "below"

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in ("above", "below"):
            raise ValueError("direction must be 'above' or 'below'")
        return v

    @field_validator("target_price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("target_price must be positive")
        return v


class AlertResponse(BaseModel):
    id: int
    coin_id: int
    coingecko_id: str
    symbol: str
    name: str
    image_url: str | None
    target_price: float
    direction: str
    triggered: bool
    created_at: str
    triggered_at: str | None


@router.get("", response_model=list[AlertResponse])
def get_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all price alerts for the current user."""
    alerts = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == current_user.id)
        .order_by(PriceAlert.created_at.desc())
        .all()
    )

    coins = {c.id: c for c in db.query(DimCoin).filter(DimCoin.id.in_([a.coin_id for a in alerts])).all()}

    return [
        AlertResponse(
            id=a.id,
            coin_id=a.coin_id,
            coingecko_id=coins[a.coin_id].coingecko_id if a.coin_id in coins else "",
            symbol=coins[a.coin_id].symbol if a.coin_id in coins else "",
            name=coins[a.coin_id].name if a.coin_id in coins else "",
            image_url=coins[a.coin_id].image_url if a.coin_id in coins else None,
            target_price=a.target_price,
            direction=a.direction,
            triggered=a.triggered,
            created_at=a.created_at.isoformat() if a.created_at else "",
            triggered_at=a.triggered_at.isoformat() if a.triggered_at else None,
        )
        for a in alerts
        if a.coin_id in coins
    ]


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new price alert."""
    coin = db.query(DimCoin).filter(DimCoin.id == data.coin_id).first()
    if not coin:
        raise HTTPException(status_code=404, detail="Coin not found")

    # Check for duplicate (same user, coin, direction)
    existing = (
        db.query(PriceAlert)
        .filter(
            PriceAlert.user_id == current_user.id,
            PriceAlert.coin_id == data.coin_id,
            PriceAlert.direction == data.direction,
            PriceAlert.triggered == False,  # noqa: E712
        )
        .first()
    )
    if existing:
        # Update existing alert
        existing.target_price = data.target_price
        db.commit()
        db.refresh(existing)
        alert = existing
    else:
        alert = PriceAlert(
            user_id=current_user.id,
            coin_id=data.coin_id,
            target_price=data.target_price,
            direction=data.direction,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

    return AlertResponse(
        id=alert.id,
        coin_id=alert.coin_id,
        coingecko_id=coin.coingecko_id,
        symbol=coin.symbol,
        name=coin.name,
        image_url=coin.image_url,
        target_price=alert.target_price,
        direction=alert.direction,
        triggered=alert.triggered,
        created_at=alert.created_at.isoformat() if alert.created_at else "",
        triggered_at=alert.triggered_at.isoformat() if alert.triggered_at else None,
    )


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a price alert (only own alerts)."""
    deleted = (
        db.query(PriceAlert)
        .filter(PriceAlert.id == alert_id, PriceAlert.user_id == current_user.id)
        .delete()
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return None


@router.get("/check")
def check_alerts(
    db: Session = Depends(get_db),
):
    """Check all untriggered alerts against latest prices (called internally)."""
    from sqlalchemy import text

    # Get latest prices
    latest = db.execute(text("SELECT coin_id, price_usd FROM mv_latest_market_data")).fetchall()
    price_map = {r.coin_id: float(r.price_usd) for r in latest if r.price_usd is not None}

    # Get untriggered alerts
    alerts = db.query(PriceAlert).filter(PriceAlert.triggered == False).all()  # noqa: E712

    triggered = []
    coins = {}

    for alert in alerts:
        price = price_map.get(alert.coin_id)
        if price is None:
            continue

        should_trigger = (
            (alert.direction == "above" and price >= alert.target_price) or
            (alert.direction == "below" and price <= alert.target_price)
        )

        if should_trigger:
            alert.triggered = True
            alert.triggered_at = datetime.now(timezone.utc)

            if alert.coin_id not in coins:
                coin = db.query(DimCoin).filter(DimCoin.id == alert.coin_id).first()
                if coin:
                    coins[alert.coin_id] = coin

            coin = coins.get(alert.coin_id)
            if coin:
                triggered.append({
                    "alert_id": alert.id,
                    "user_id": alert.user_id,
                    "coin_id": alert.coin_id,
                    "coingecko_id": coin.coingecko_id,
                    "symbol": coin.symbol,
                    "name": coin.name,
                    "direction": alert.direction,
                    "target_price": alert.target_price,
                    "current_price": price,
                })

    if triggered:
        db.commit()

    return {"triggered": triggered, "checked": len(alerts)}
