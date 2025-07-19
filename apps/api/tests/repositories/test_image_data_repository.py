import pytest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from repositories.image_data_repository import ImageDataRepository
from db.models.image_data import ImageData


@pytest.fixture
def repo(monkeypatch):
    class TestImageDataRepository(ImageDataRepository):
        def __init__(self):
            super().__init__()
            self.model = ImageData

    return TestImageDataRepository()


def test_get_by_project(db_session, repo):
    # Clean up table to ensure test isolation
    db_session.query(ImageData).delete()
    db_session.commit()
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    img1 = ImageData(
        id="1",
        name="img1",
        data="base64string",
        width=100,
        height=100,
        url=None,
        project_id="p1",
        created_at=now,
        updated_at=now,
    )
    img2 = ImageData(
        id="2",
        name="img2",
        data="base64string",
        width=100,
        height=100,
        url=None,
        project_id="p1",
        created_at=now,
        updated_at=now,
    )
    img3 = ImageData(
        id="3",
        name="img3",
        data="base64string",
        width=100,
        height=100,
        url=None,
        project_id="p2",
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([img1, img2, img3])
    db_session.commit()
    result = repo.get_by_project(db_session, "p1")
    assert len(result) == 2
    ids = {i.id for i in result}
    assert ids == {"1", "2"}
    result2 = repo.get_by_project(db_session, "p2")
    assert len(result2) == 1
    assert result2[0].id == "3"
    assert repo.get_by_project(db_session, "notfound") == []
