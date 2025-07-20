import datetime
from pydantic import BaseModel
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = {
        "validate_by_name": True,
        "alias_generator": to_camel,
        "populate_by_name": True,
    }
