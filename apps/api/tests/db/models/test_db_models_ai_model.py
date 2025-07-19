def make_ai_model(**kwargs):
    now = datetime.now(timezone.utc)
    defaults = {
        "id": "test-id",
        "name": "Test Model",
        "description": "A test model",
        "version": "1.0",
        "model_path": "/models/test",
        "config_path": "/configs/test",
        "model_size": 123,
        "is_custom": True,
        "project_id": "proj-1",
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(kwargs)
    return AIModel(**defaults)


import unittest
from db.models.ai_model import AIModel
from datetime import datetime, timezone


class TestDBModelsAIModel(unittest.TestCase):
    @staticmethod
    def make_ai_model(**kwargs):
        now = datetime.now(timezone.utc)
        defaults = {
            "id": "test-id",
            "name": "Test Model",
            "description": "A test model",
            "version": "1.0",
            "model_path": "/models/test",
            "config_path": "/configs/test",
            "model_size": 123,
            "is_custom": True,
            "project_id": "proj-1",
            "created_at": now,
            "updated_at": now,
        }
        defaults.update(kwargs)
        return AIModel(**defaults)

    def test_create_ai_model(self):
        model = self.make_ai_model()
        self.assertEqual(model.id, "test-id")
        self.assertEqual(model.name, "Test Model")
        self.assertEqual(model.description, "A test model")
        self.assertEqual(model.version, "1.0")
        self.assertEqual(model.model_path, "/models/test")
        self.assertEqual(model.config_path, "/configs/test")
        self.assertEqual(model.model_size, 123)
        self.assertTrue(model.is_custom)
        self.assertEqual(model.project_id, "proj-1")

    def test_default_is_custom(self):
        model = self.make_ai_model(is_custom=None)
        # SQLAlchemy default is only set on insert, so here it's None
        self.assertIsNone(model.is_custom)

    def test_default_timestamps(self):
        model = self.make_ai_model()
        self.assertIsNotNone(model.created_at)
        self.assertIsNotNone(model.updated_at)
        self.assertIsInstance(model.created_at, datetime)
        self.assertIsInstance(model.updated_at, datetime)
        self.assertEqual(model.created_at.tzinfo, timezone.utc)
        self.assertEqual(model.updated_at.tzinfo, timezone.utc)
