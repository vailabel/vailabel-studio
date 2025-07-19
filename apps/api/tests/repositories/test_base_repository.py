import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String
from repositories.base_repository import BaseRepository

Base = declarative_base()


class TestModel(Base):
    __tablename__ = "test_model"
    id = Column(String, primary_key=True)
    name = Column(String)


class ObjIn:
    def __init__(self, id, name):
        self.id = id
        self.name = name

    def dict(self, exclude_unset=False):
        return {"id": self.id, "name": self.name}


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def repo():
    return BaseRepository(TestModel)


def test_create_and_get(db_session, repo):
    obj_in = ObjIn("1", "test")
    created = repo.create(db_session, obj_in)
    assert created.id == "1"
    assert created.name == "test"
    fetched = repo.get(db_session, "1")
    assert fetched.id == "1"
    assert fetched.name == "test"


def test_get_all(db_session, repo):
    obj1 = ObjIn("1", "a")
    obj2 = ObjIn("2", "b")
    repo.create(db_session, obj1)
    repo.create(db_session, obj2)
    all_objs = repo.get_all(db_session)
    assert len(all_objs) == 2
    ids = {o.id for o in all_objs}
    assert ids == {"1", "2"}


def test_update(db_session, repo):
    obj_in = ObjIn("1", "old")
    repo.create(db_session, obj_in)

    class Updates:
        def dict(self, exclude_unset=True):
            return {"name": "new"}

    updated = repo.update(db_session, "1", Updates())
    assert updated.name == "new"
    # Test update non-existent
    assert repo.update(db_session, "2", Updates()) is None


def test_delete(db_session, repo):
    obj_in = ObjIn("1", "to_delete")
    repo.create(db_session, obj_in)
    deleted = repo.delete(db_session, "1")
    assert deleted.id == "1"
    assert repo.get(db_session, "1") is None
    # Test delete non-existent
    assert repo.delete(db_session, "2") is None
