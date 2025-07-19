import pytest
from repositories.task_repository import TaskRepository
from db.models.task import Task


@pytest.fixture
def repo():
    class TestTaskRepository(TaskRepository):
        def __init__(self):
            super().__init__()
            self.model = Task

    return TestTaskRepository()


def test_get_by_project(db_session, repo):
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    # Clean up table
    db_session.query(Task).delete()
    db_session.commit()
    t1 = Task(
        id="1",
        name="Task1",
        description="desc1",
        status="todo",
        project_id="p1",
        created_at=now,
        updated_at=now,
    )
    t2 = Task(
        id="2",
        name="Task2",
        description="desc2",
        status="todo",
        project_id="p1",
        created_at=now,
        updated_at=now,
    )
    t3 = Task(
        id="3",
        name="Task3",
        description="desc3",
        status="todo",
        project_id="p2",
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([t1, t2, t3])
    db_session.commit()
    result = repo.get_by_project(db_session, "p1")
    assert len(result) == 2
    ids = {t.id for t in result}
    assert ids == {"1", "2"}
    result2 = repo.get_by_project(db_session, "p2")
    assert len(result2) == 1
    assert result2[0].id == "3"
    assert repo.get_by_project(db_session, "notfound") == []
