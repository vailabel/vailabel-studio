import pytest
from repositories.settings_repository import SettingsRepository
from db.models.settings import Settings
from models.settings import SettingsCreate


@pytest.fixture
def repo():
    class TestSettingsRepository(SettingsRepository):
        def __init__(self):
            super().__init__()
            self.model = Settings

    return TestSettingsRepository()


def test_get_by_key_and_create_or_update(db_session, repo):    
    db_session.query(Settings).delete()
    db_session.commit()
    # Test create
    data = SettingsCreate(id="1", key="theme", value="dark")
    created = repo.create_or_update(db_session, data)
    assert created.key == "theme"
    assert created.value == "dark"
    # Test get_by_key
    fetched = repo.get_by_key(db_session, "theme")
    assert fetched.key == "theme"
    assert fetched.value == "dark"
    # Test update
    data2 = SettingsCreate(id="1", key="theme", value="light")
    updated = repo.create_or_update(db_session, data2)
    assert updated.key == "theme"
    assert updated.value == "light"
    # Test create new key
    data3 = SettingsCreate(id="2", key="lang", value="en")
    created2 = repo.create_or_update(db_session, data3)
    assert created2.key == "lang"
    assert created2.value == "en"
    # Test get_by_key for new key
    fetched2 = repo.get_by_key(db_session, "lang")
    assert fetched2.key == "lang"
    assert fetched2.value == "en"
    # Test get_by_key for non-existent key
    assert repo.get_by_key(db_session, "notfound") is None
