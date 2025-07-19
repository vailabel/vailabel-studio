import unittest
from db.models.settings import Settings
from datetime import datetime, timezone


def make_settings(**kwargs):
    now = datetime.now(timezone.utc)
    defaults = {
        "id": "settings-id",
        "key": "test_key",
        "value": "test_value",
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(kwargs)
    return Settings(**defaults)


class TestDBModelsSettings(unittest.TestCase):
    def test_create_settings(self):
        s = make_settings()
        self.assertEqual(s.id, "settings-id")
        self.assertEqual(s.key, "test_key")
        self.assertEqual(s.value, "test_value")

    def test_default_timestamps(self):
        s = make_settings()
        self.assertIsNotNone(s.created_at)
        self.assertIsNotNone(s.updated_at)
        self.assertIsInstance(s.created_at, datetime)
        self.assertIsInstance(s.updated_at, datetime)
        self.assertEqual(s.created_at.tzinfo, timezone.utc)
        self.assertEqual(s.updated_at.tzinfo, timezone.utc)


if __name__ == "__main__":
    unittest.main()
