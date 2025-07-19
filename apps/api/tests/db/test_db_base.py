import unittest
from db.base import Base
from sqlalchemy.ext.declarative import DeclarativeMeta


class TestDBBase(unittest.TestCase):
    def test_base_is_declarative(self):
        self.assertIsInstance(Base, DeclarativeMeta)
