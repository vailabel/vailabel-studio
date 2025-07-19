import unittest
from db.models.image_data import ImageData
from datetime import datetime, timezone


def make_image_data(**kwargs):
    now = datetime.now(timezone.utc)
    defaults = {
        "id": "img-id",
        "name": "Test Image",
        "data": "base64string",
        "width": 100,
        "height": 200,
        "url": "/images/test.png",
        "project_id": "proj-1",
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(kwargs)
    return ImageData(**defaults)


class TestDBModelsImageData(unittest.TestCase):
    def test_create_image_data(self):
        img = make_image_data()
        self.assertEqual(img.id, "img-id")
        self.assertEqual(img.name, "Test Image")
        self.assertEqual(img.data, "base64string")
        self.assertEqual(img.width, 100)
        self.assertEqual(img.height, 200)
        self.assertEqual(img.url, "/images/test.png")
        self.assertEqual(img.project_id, "proj-1")

    def test_default_timestamps(self):
        img = make_image_data()
        self.assertIsNotNone(img.created_at)
        self.assertIsNotNone(img.updated_at)
        self.assertIsInstance(img.created_at, datetime)
        self.assertIsInstance(img.updated_at, datetime)
        self.assertEqual(img.created_at.tzinfo, timezone.utc)
        self.assertEqual(img.updated_at.tzinfo, timezone.utc)


if __name__ == "__main__":
    unittest.main()
