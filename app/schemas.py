from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from .models import Detection, User


class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ("password", "detections")

    created_at = fields.DateTime(format="%Y-%m-%d %H:%M:%S")
    role = fields.String(dump_only=True)


class DetectionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Detection
        load_instance = True
        include_fk = True

    created_at = fields.DateTime(format="%Y-%m-%d %H:%M:%S")
    user = fields.Nested(UserSchema, dump_only=True)
