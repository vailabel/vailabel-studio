import pytest

from repositories.annotation_repository import AnnotationRepository
from db.models.image_data import ImageData as Image
from db.models.annotation import Annotation


@pytest.fixture
def repo():
    class TestAnnotationRepository(AnnotationRepository):
        def __init__(self):
            super().__init__()
            self.model = Annotation

    return TestAnnotationRepository()


def test_get_by_project(db_session, repo):
    # Ensure tables exist
    Image.metadata.create_all(db_session.bind)
    Annotation.metadata.create_all(db_session.bind)
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    # Create images (ImageData)
    img1 = Image(
        id="img1",
        name="img1",
        data="base64string",
        width=100,
        height=100,
        url=None,
        project_id="p1",
        created_at=now,
        updated_at=now,
    )
    img2 = Image(
        id="img2",
        name="img2",
        data="base64string",
        width=100,
        height=100,
        url=None,
        project_id="p2",
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([img1, img2])
    db_session.commit()
    # Create annotations
    ann1 = Annotation(
        id="a1",
        name="ann1",
        type="bbox",
        coordinates={"x": 1, "y": 2, "w": 3, "h": 4},
        image_id="img1",
        label_id="label1",
        color="#ff0000",
        is_ai_generated=False,
        created_at=now,
        updated_at=now,
    )
    ann2 = Annotation(
        id="a2",
        name="ann2",
        type="bbox",
        coordinates={"x": 5, "y": 6, "w": 7, "h": 8},
        image_id="img1",
        label_id="label1",
        color="#00ff00",
        is_ai_generated=False,
        created_at=now,
        updated_at=now,
    )
    ann3 = Annotation(
        id="a3",
        name="ann3",
        type="bbox",
        coordinates={"x": 9, "y": 10, "w": 11, "h": 12},
        image_id="img2",
        label_id="label1",
        color="#0000ff",
        is_ai_generated=False,
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([ann1, ann2, ann3])
    db_session.commit()
    result = repo.get_by_project(db_session, "p1")
    assert len(result) == 2
    ids = {a.id for a in result}
    assert ids == {"a1", "a2"}
    result2 = repo.get_by_project(db_session, "p2")
    assert len(result2) == 1
    assert result2[0].id == "a3"
    assert repo.get_by_project(db_session, "notfound") == []


def test_get_by_image(db_session, repo):
    # Ensure tables exist
    Image.metadata.create_all(db_session.bind)
    Annotation.metadata.create_all(db_session.bind)
    import datetime

    now = datetime.datetime.now(datetime.timezone.utc)
    import uuid

    unique_img_id = f"img1_{uuid.uuid4()}"
    img = Image(
        id=unique_img_id,
        name="img1",
        data="base64string",
        width=100,
        height=100,
        url=None,
        project_id="p1",
        created_at=now,
        updated_at=now,
    )
    db_session.add(img)
    db_session.commit()
    ann1 = Annotation(
        id=f"a1_{uuid.uuid4()}",
        name="ann1",
        type="bbox",
        coordinates={"x": 1, "y": 2, "w": 3, "h": 4},
        image_id=unique_img_id,
        label_id="label1",
        color="#ff0000",
        is_ai_generated=False,
        created_at=now,
        updated_at=now,
    )
    ann2 = Annotation(
        id=f"a2_{uuid.uuid4()}",
        name="ann2",
        type="bbox",
        coordinates={"x": 5, "y": 6, "w": 7, "h": 8},
        image_id=unique_img_id,
        label_id="label1",
        color="#00ff00",
        is_ai_generated=False,
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([ann1, ann2])
    db_session.commit()
    result = repo.get_by_image(db_session, unique_img_id)
    assert len(result) == 2
    ids = {a.id for a in result}
    assert ids == {ann1.id, ann2.id}
    assert repo.get_by_image(db_session, "notfound") == []
