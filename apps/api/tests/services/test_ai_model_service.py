
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.base import Base
from db.models.ai_model import AIModel
from db.models.project import Project
from models.ai_model import AIModelCreate, AIModelUpdate
from services import ai_model_service
import datetime

class TestAIModelService(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        # Create a project for FK
        session = self.Session()
        self.project = Project(id="p1", name="Test Project")
        session.add(self.project)
        session.commit()
        session.close()

    def tearDown(self):
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_ai_model(self):
        session = self.Session()
        ai_model_data = AIModelCreate(
            id="m1",
            name="Model1",
            description="desc",
            version="v1",
            model_path="/path/model",
            config_path="/path/config",
            model_size=123,
            is_custom=True,
            project_id=self.project.id
        )
        model = ai_model_service.create_ai_model(session, ai_model_data)
        self.assertEqual(model.id, "m1")
        self.assertEqual(model.name, "Model1")
        self.assertTrue(model.is_custom)
        self.assertEqual(model.project_id, self.project.id)
        session.close()

    def test_get_ai_model(self):
        session = self.Session()
        ai_model_data = AIModelCreate(
            id="m2",
            name="Model2",
            description="desc2",
            version="v2",
            model_path="/path/model2",
            config_path="/path/config2",
            model_size=456,
            is_custom=False,
            project_id=self.project.id
        )
        ai_model_service.create_ai_model(session, ai_model_data)
        model = ai_model_service.get_ai_model(session, "m2")
        self.assertIsNotNone(model)
        self.assertEqual(model.name, "Model2")
        session.close()

    def test_get_ai_models_by_project(self):
        session = self.Session()
        for i in range(3):
            ai_model_data = AIModelCreate(
                id=f"m{i+10}",
                name=f"Model{i+10}",
                description=f"desc{i+10}",
                version=f"v{i+10}",
                model_path=f"/path/model{i+10}",
                config_path=f"/path/config{i+10}",
                model_size=100+i,
                is_custom=bool(i%2),
                project_id=self.project.id
            )
            ai_model_service.create_ai_model(session, ai_model_data)
        models = ai_model_service.get_ai_models_by_project(session, self.project.id)
        self.assertEqual(len(models), 3)
        session.close()

    def test_update_ai_model(self):
        session = self.Session()
        ai_model_data = AIModelCreate(
            id="m3",
            name="Model3",
            description="desc3",
            version="v3",
            model_path="/path/model3",
            config_path="/path/config3",
            model_size=789,
            is_custom=False,
            project_id=self.project.id
        )
        ai_model_service.create_ai_model(session, ai_model_data)
        update_data = AIModelUpdate(name="UpdatedName", model_size=999)
        updated = ai_model_service.update_ai_model(session, "m3", update_data)
        self.assertEqual(updated.name, "UpdatedName")
        self.assertEqual(updated.model_size, 999)
        session.close()

    def test_delete_ai_model(self):
        session = self.Session()
        ai_model_data = AIModelCreate(
            id="m4",
            name="Model4",
            description="desc4",
            version="v4",
            model_path="/path/model4",
            config_path="/path/config4",
            model_size=321,
            is_custom=True,
            project_id=self.project.id
        )
        ai_model_service.create_ai_model(session, ai_model_data)
        deleted = ai_model_service.delete_ai_model(session, "m4")
        self.assertIsNotNone(deleted)
        self.assertEqual(deleted.id, "m4")
        # Should not exist anymore
        self.assertIsNone(ai_model_service.get_ai_model(session, "m4"))
        session.close()

if __name__ == "__main__":
    unittest.main()
