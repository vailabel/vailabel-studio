import pytest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from repositories.label_repository import LabelRepository
from db.models.label import Label


@pytest.fixture
def repo(monkeypatch):
    class TestLabelRepository(LabelRepository):
        def __init__(self):
            super().__init__()
            self.model = Label

    return TestLabelRepository()


def test_get_by_project(db_session, repo):
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    label1 = Label(
        id="1", name="l1", color="#fff", project_id="p1", created_at=now, updated_at=now
    )
    label2 = Label(
        id="2", name="l2", color="#000", project_id="p1", created_at=now, updated_at=now
    )
    label3 = Label(
        id="3", name="l3", color="#333", project_id="p2", created_at=now, updated_at=now
    )
    db_session.add_all([label1, label2, label3])
    db_session.commit()
    result = repo.get_by_project(db_session, "p1")
    assert len(result) == 2
    ids = {l.id for l in result}
    assert ids == {"1", "2"}
    result2 = repo.get_by_project(db_session, "p2")
    assert len(result2) == 1
    assert result2[0].id == "3"
    assert repo.get_by_project(db_session, "notfound") == []
