from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.coin import DimCoin
from app.models.watchlist import UserWatchlist
from app.schemas.watchlist import WatchlistResponse

router = APIRouter()


@router.get("", response_model=WatchlistResponse)
def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's watchlist coin IDs."""
    rows = (
        db.query(UserWatchlist.coin_id)
        .filter(UserWatchlist.user_id == current_user.id)
        .order_by(UserWatchlist.created_at.asc())
        .all()
    )
    return WatchlistResponse(coin_ids=[r.coin_id for r in rows])


@router.post("/{coin_id}", status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    coin_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a coin to the current user's watchlist."""
    coin = db.query(DimCoin).filter(DimCoin.id == coin_id).first()
    if not coin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coin not found")

    existing = (
        db.query(UserWatchlist)
        .filter(UserWatchlist.user_id == current_user.id, UserWatchlist.coin_id == coin_id)
        .first()
    )
    if existing:
        return {"detail": "Already in watchlist"}

    entry = UserWatchlist(user_id=current_user.id, coin_id=coin_id)
    db.add(entry)
    db.commit()
    return {"detail": "Added to watchlist"}


@router.delete("/{coin_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(
    coin_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a coin from the current user's watchlist."""
    deleted = (
        db.query(UserWatchlist)
        .filter(UserWatchlist.user_id == current_user.id, UserWatchlist.coin_id == coin_id)
        .delete()
    )
    db.commit()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coin not in watchlist")
    return None
