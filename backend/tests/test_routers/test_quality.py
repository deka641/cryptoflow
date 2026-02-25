def test_quality_checks_response_shape(client):
    resp = client.get("/api/v1/quality/checks")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data
    assert "pages" in data
    assert isinstance(data["items"], list)


def test_quality_checks_pagination(client):
    resp = client.get("/api/v1/quality/checks?page=1&per_page=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["per_page"] == 5
    assert data["page"] == 1
    assert len(data["items"]) <= 5


def test_quality_checks_filter_by_status(client):
    resp = client.get("/api/v1/quality/checks?status=nonexistent")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_quality_checks_filter_by_table_name(client):
    resp = client.get("/api/v1/quality/checks?table_name=nonexistent_table")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_quality_summary_response_shape(client):
    resp = client.get("/api/v1/quality/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for item in data:
        assert "table_name" in item
        assert "score" in item
        assert "total_checks" in item
        assert "passed" in item
        assert "failed" in item
        assert "warnings" in item
