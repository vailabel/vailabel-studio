import pytest
from repositories.user_repository import UserRepository
from db.models.user import User


@pytest.fixture
def repo():
    class TestUserRepository(UserRepository):
        def __init__(self):
            super().__init__()
            self.model = User

    return TestUserRepository()


def test_get_all(db_session, repo):
    # Clean up table
    db_session.query(User).delete()
    db_session.commit()
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    u1 = User(
        id="1",
        name="user1",
        email="user1@example.com",
        password="pw1",
        role="user",
        created_at=now,
        updated_at=now,
    )
    u2 = User(
        id="2",
        name="user2",
        email="user2@example.com",
        password="pw2",
        role="user",
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([u1, u2])
    db_session.commit()
    result = repo.get_all(db_session)
    assert len(result) == 2
    ids = {u.id for u in result}
    assert ids == {"1", "2"}
    assert {u.name for u in result} == {"user1", "user2"}
    # Test empty
    db_session.query(User).delete()
    db_session.commit()
    assert repo.get_all(db_session) == []
