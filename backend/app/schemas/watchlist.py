from pydantic import BaseModel


class WatchlistResponse(BaseModel):
    coin_ids: list[int]
