
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models.label import Label
from db.models.project import Project
from db.base import Base
import datetime

class TestDBModelsLabel(unittest.TestCase):
    def setUp(self):
        # Use in-memory SQLite for testing
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def tearDown(self):
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_label_table_columns(self):
        session = self.Session()
        project = Project(id="p1", name="Test Project")
        session.add(project)
        session.commit()
        label = Label(
            id="l1",
            name="Test Label",
            category="cat1",
            is_ai_generated=True,
            color="#fff",
            project_id=project.id
        )
        session.add(label)
        session.commit()
        fetched = session.query(Label).filter_by(id="l1").first()
        self.assertEqual(fetched.name, "Test Label")
        self.assertEqual(fetched.category, "cat1")
        self.assertTrue(fetched.is_ai_generated)
        self.assertEqual(fetched.color, "#fff")
        self.assertEqual(fetched.project_id, "p1")
        self.assertIsInstance(fetched.created_at, datetime.datetime)
        self.assertIsInstance(fetched.updated_at, datetime.datetime)

    def test_label_default_values(self):
        session = self.Session()
        project = Project(id="p2", name="Project2")
        session.add(project)
        session.commit()
        label = Label(
            id="l2",
            name="Label2",
            color="#000",
            project_id=project.id
        )
        session.add(label)
        session.commit()
        fetched = session.query(Label).filter_by(id="l2").first()
        self.assertIsNone(fetched.category)
        self.assertFalse(fetched.is_ai_generated)

    def test_label_project_relationship(self):
        session = self.Session()
        project = Project(id="p3", name="Project3")
        label = Label(
            id="l3",
            name="Label3",
            color="#123456",
            project=project
        )
        session.add(label)
        session.commit()
        fetched_label = session.query(Label).filter_by(id="l3").first()
        self.assertIsNotNone(fetched_label.project)
        self.assertEqual(fetched_label.project.name, "Project3")

    def test_label_annotations_relationship(self):
        # This test is a placeholder, as Annotation model is required for full test
        # It checks that the relationship exists and is a list
        session = self.Session()
        project = Project(id="p4", name="Project4")
        label = Label(
            id="l4",
            name="Label4",
            color="#654321",
            project=project
        )
        session.add(label)
        session.commit()
        fetched_label = session.query(Label).filter_by(id="l4").first()
        self.assertTrue(hasattr(fetched_label, "annotations"))
        self.assertIsInstance(fetched_label.annotations, list)

if __name__ == "__main__":
    unittest.main()
