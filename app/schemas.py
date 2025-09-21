from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import fields
from .models import Detection

class DetectionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Detection
        load_instance = True
        include_fk = True

    created_at = fields.DateTime(format="%Y-%m-%d %H:%M:%S")
