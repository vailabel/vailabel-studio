import pytest

from repositories.ai_model_repository import AIModelRepository
from db.models.ai_model import AIModel


@pytest.fixture
def repo():
    # Patch the repository to use our test model
    class TestAIModelRepository(AIModelRepository):
        def __init__(self):
            super().__init__()
            self.model = AIModel

    return TestAIModelRepository()


def test_get_by_project(db_session, repo):
    # Add test data
    ai1 = AIModel(id="1", name="model1", project_id="p1")
    ai2 = AIModel(id="2", name="model2", project_id="p1")
    ai3 = AIModel(id="3", name="model3", project_id="p2")
    db_session.add_all([ai1, ai2, ai3])
    db_session.commit()
    # Test get_by_project
    result = repo.get_by_project(db_session, "p1")
    assert len(result) == 2
    ids = {a.id for a in result}
    assert ids == {"1", "2"}
    result2 = repo.get_by_project(db_session, "p2")
    assert len(result2) == 1
    assert result2[0].id == "3"
    # Test no results
    assert repo.get_by_project(db_session, "notfound") == []
