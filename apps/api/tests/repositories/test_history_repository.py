import pytest

from repositories.history_repository import HistoryRepository
from db.models.history import History


@pytest.fixture
def repo():
    # Patch the repository to use our test model
    class TestHistoryRepository(HistoryRepository):
        def __init__(self):
            super().__init__()
            self.model = History

    return TestHistoryRepository()


def test_get_by_project(db_session, repo):
    # Ensure the table exists in the test database
    History.metadata.create_all(db_session.bind)
    # Provide all required NOT NULL fields for History
    import datetime

    h1 = History(
        id="1",
        project_id="p1",
        labels=[],
        history_index=0,
        can_undo=False,
        can_redo=False,
        created_at=datetime.datetime.now(),
        updated_at=datetime.datetime.now(),
    )
    h2 = History(
        id="2",
        project_id="p1",
        labels=[],
        history_index=0,
        can_undo=False,
        can_redo=False,
        created_at=datetime.datetime.now(),
        updated_at=datetime.datetime.now(),
    )
    h3 = History(
        id="3",
        project_id="p2",
        labels=[],
        history_index=0,
        can_undo=False,
        can_redo=False,
        created_at=datetime.datetime.now(),
        updated_at=datetime.datetime.now(),
    )
    db_session.add_all([h1, h2, h3])
    db_session.commit()
    result = repo.get_by_project(db_session, "p1")
    assert len(result) == 2
    ids = {h.id for h in result}
    assert ids == {"1", "2"}
    result2 = repo.get_by_project(db_session, "p2")
    assert len(result2) == 1
    assert result2[0].id == "3"
    assert repo.get_by_project(db_session, "notfound") == []
