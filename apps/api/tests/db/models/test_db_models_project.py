import unittest
from db.models.project import Project
from datetime import datetime, timezone


def make_project(**kwargs):
    now = datetime.now(timezone.utc)
    defaults = {
        "id": "proj-id",
        "name": "Test Project",
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(kwargs)
    return Project(**defaults)


class TestDBModelsProject(unittest.TestCase):
    def test_create_project(self):
        proj = make_project()
        self.assertEqual(proj.id, "proj-id")
        self.assertEqual(proj.name, "Test Project")

    def test_default_timestamps(self):
        proj = make_project()
        self.assertIsNotNone(proj.created_at)
        self.assertIsNotNone(proj.updated_at)
        self.assertIsInstance(proj.created_at, datetime)
        self.assertIsInstance(proj.updated_at, datetime)
        self.assertEqual(proj.created_at.tzinfo, timezone.utc)
        self.assertEqual(proj.updated_at.tzinfo, timezone.utc)
