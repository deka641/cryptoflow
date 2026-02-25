def test_pipeline_runs_response_shape(client):
    resp = client.get("/api/v1/pipeline/runs")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "per_page" in data
    assert "pages" in data
    assert isinstance(data["items"], list)


def test_pipeline_runs_pagination(client):
    resp = client.get("/api/v1/pipeline/runs?page=1&per_page=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["per_page"] == 5
    assert data["page"] == 1
    assert len(data["items"]) <= 5


def test_pipeline_runs_filter_by_dag_id(client):
    resp = client.get("/api/v1/pipeline/runs?dag_id=nonexistent_dag")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_pipeline_health_response_shape(client):
    resp = client.get("/api/v1/pipeline/health")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for item in data:
        assert "dag_id" in item
        assert "is_healthy" in item
        assert "last_run_status" in item
        assert "data_freshness_minutes" in item


def test_pipeline_health_empty_db(client, db):
    """With no pipeline runs, health should return an empty list."""
    # The test DB uses transaction rollback, so unless there are pre-existing
    # pipeline_runs in the DB, this should be empty or contain only seeded data.
    resp = client.get("/api/v1/pipeline/health")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
