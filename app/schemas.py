from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from datetime import timezone
from zoneinfo import ZoneInfo

from .models import Detection, User

class JakartaDateTime(fields.DateTime):
    def _serialize(self, value, attr, obj, **kwargs):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        value = value.astimezone(ZoneInfo("Asia/Jakarta"))
        return super()._serialize(value, attr, obj, **kwargs)


class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ("password", "detections")

    created_at = JakartaDateTime(format="%Y-%m-%d %H:%M:%S")
    role = fields.String(dump_only=True)


class DetectionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Detection
        load_instance = True
        include_fk = True

    created_at = JakartaDateTime(format="%Y-%m-%d %H:%M:%S")
    user = fields.Nested(UserSchema, dump_only=True)
