from pydantic import BaseModel
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    class Config:
        alias_generator = to_camel
        allow_population_by_field_name = True
        populate_by_name = True
