import unittest
from db.base import Base
from sqlalchemy.ext.declarative import DeclarativeMeta


class TestDBBase(unittest.TestCase):
    def test_base_is_declarative(self):
        self.assertTrue(isinstance(Base, DeclarativeMeta))


if __name__ == "__main__":
    unittest.main()
