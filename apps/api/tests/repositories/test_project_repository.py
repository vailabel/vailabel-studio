import pytest
from repositories.project_repository import ProjectRepository
from db.models.project import Project


@pytest.fixture
def repo():
    class TestProjectRepository(ProjectRepository):
        def __init__(self):
            super().__init__()
            self.model = Project

    return TestProjectRepository()


def test_get_and_get_all(db_session, repo):
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    p1 = Project(id="1", name="Project1", created_at=now, updated_at=now)
    p2 = Project(id="2", name="Project2", created_at=now, updated_at=now)
    db_session.query(Project).delete()
    db_session.commit()
    db_session.add_all([p1, p2])
    db_session.commit()
    all_projects = repo.get_all(db_session)
    assert len(all_projects) == 2
    ids = {p.id for p in all_projects}
    assert ids == {"1", "2"}
    fetched = repo.get(db_session, "1")
    assert fetched.id == "1"
    assert fetched.name == "Project1"


def test_create_update_delete(db_session, repo):
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)

    class ObjIn:
        def __init__(self, id, name):
            self.id = id
            self.name = name

        def dict(self):
            return {
                "id": self.id,
                "name": self.name,
                "created_at": now,
                "updated_at": now,
            }

    db_session.query(Project).delete()
    db_session.commit()
    obj_in = ObjIn("3", "Project3")
    created = repo.create(db_session, obj_in)
    assert created.id == "3"
    assert created.name == "Project3"

    class Updates:
        def dict(self, exclude_unset=True):
            return {"name": "Project3Updated"}

    updated = repo.update(db_session, "3", Updates())
    assert updated.name == "Project3Updated"
    deleted = repo.delete(db_session, "3")
    assert deleted.id == "3"
    assert repo.get(db_session, "3") is None
