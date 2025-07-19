import unittest
from db.models.annotation import Annotation
from datetime import datetime, timezone


def make_annotation(**kwargs):
    now = datetime.now(timezone.utc)
    defaults = {
        "id": "ann-id",
        "name": "Test Annotation",
        "type": "bbox",
        "coordinates": {"x": 1, "y": 2, "w": 3, "h": 4},
        "image_id": "img-1",
        "label_id": "label-1",
        "color": "#ff0000",
        "is_ai_generated": False,
        "created_at": now,
        "updated_at": now,
    }
    defaults.update(kwargs)
    return Annotation(**defaults)


class TestDBModelsAnnotation(unittest.TestCase):
    def test_create_annotation(self):
        ann = make_annotation()
        self.assertEqual(ann.id, "ann-id")
        self.assertEqual(ann.name, "Test Annotation")
        self.assertEqual(ann.type, "bbox")
        self.assertEqual(ann.coordinates, {"x": 1, "y": 2, "w": 3, "h": 4})
        self.assertEqual(ann.image_id, "img-1")
        self.assertEqual(ann.label_id, "label-1")
        self.assertEqual(ann.color, "#ff0000")
        self.assertFalse(ann.is_ai_generated)

    def test_default_timestamps(self):
        ann = make_annotation()
        self.assertIsNotNone(ann.created_at)
        self.assertIsNotNone(ann.updated_at)
        self.assertIsInstance(ann.created_at, datetime)
        self.assertIsInstance(ann.updated_at, datetime)
        self.assertEqual(ann.created_at.tzinfo, timezone.utc)
        self.assertEqual(ann.updated_at.tzinfo, timezone.utc)