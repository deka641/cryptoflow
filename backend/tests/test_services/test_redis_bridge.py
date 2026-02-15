import pytest

from app.websocket.manager import ConnectionManager


@pytest.fixture
def mgr():
    return ConnectionManager()


def test_manager_initial_state(mgr):
    """Manager starts with no connections and no broadcast history."""
    assert mgr.connection_count == 0
    assert mgr.last_broadcast_time is None
    assert mgr.message_count == 0


def test_manager_disconnect_not_in_list(mgr):
    """Disconnecting a websocket not in the list should not raise."""

    class FakeWS:
        pass

    mgr.disconnect(FakeWS())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_manager_broadcast_updates_stats(mgr):
    """Broadcasting increments message count and sets last broadcast time."""
    await mgr.broadcast({"type": "test"})
    assert mgr.message_count == 1
    assert mgr.last_broadcast_time is not None

    await mgr.broadcast({"type": "test2"})
    assert mgr.message_count == 2
