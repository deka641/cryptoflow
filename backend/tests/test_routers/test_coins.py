def test_list_coins(client):
    resp = client.get("/api/v1/coins/")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


def test_list_coins_pagination(client):
    resp = client.get("/api/v1/coins/?page=1&per_page=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["per_page"] == 5
    assert len(data["items"]) <= 5


def test_list_coins_search(client):
    resp = client.get("/api/v1/coins/?search=bitcoin")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert "bitcoin" in item["name"].lower() or "btc" in item["symbol"].lower()


def test_get_coin_not_found(client):
    resp = client.get("/api/v1/coins/99999")
    assert resp.status_code == 404


def test_get_coin_history_not_found(client):
    resp = client.get("/api/v1/coins/99999/history")
    assert resp.status_code == 404
