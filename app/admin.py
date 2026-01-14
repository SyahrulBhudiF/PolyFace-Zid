

from functools import wraps

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from . import db
from .insights import generate_ocean_insights
from .models import Detection, User
from .schemas import DetectionSchema, UserSchema

admin_bp = Blueprint("admin", __name__)

user_schema = UserSchema()
detection_schema = DetectionSchema()


def admin_required(fn):

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        if not user:
            return jsonify({"error": "User not found"}), 404

        if not user.is_admin():
            return jsonify({"error": "Admin access required"}), 403

        return fn(*args, **kwargs)

    return wrapper




@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def get_all_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "", type=str)

    query = User.query

    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    users_data = []
    for user in pagination.items:
        user_dict = user_schema.dump(user)
        user_dict["detection_count"] = Detection.query.filter_by(user_id=user.id).count()
        user_dict["is_admin"] = user.is_admin()
        user_dict["role"] = user.role
        users_data.append(user_dict)

    return jsonify(
        {
            "users": users_data,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total_pages": pagination.pages,
                "total_items": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    ), 200


@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_user_detail(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    user_data = user_schema.dump(user)
    user_data["role"] = user.role

    detections = (
        Detection.query.filter_by(user_id=user_id)
        .order_by(Detection.created_at.desc())
        .all()
    )

    detections_data = []
    for detection in detections:
        det_dict = detection_schema.dump(detection)
        ocean_keys = [
            "openness",
            "conscientiousness",
            "extraversion",
            "agreeableness",
            "neuroticism",
        ]
        results_data = {key: det_dict.pop(key) for key in ocean_keys if key in det_dict}
        det_dict["results"] = results_data

        detections_data.append(det_dict)

    user_data["detections"] = detections_data
    user_data["detection_count"] = len(detections)

    if detections:
        avg_scores = {
            "openness": sum(d.openness for d in detections) / len(detections),
            "conscientiousness": sum(d.conscientiousness for d in detections)
            / len(detections),
            "extraversion": sum(d.extraversion for d in detections) / len(detections),
            "agreeableness": sum(d.agreeableness for d in detections) / len(detections),
            "neuroticism": sum(d.neuroticism for d in detections) / len(detections),
        }
        user_data["average_scores"] = {k: round(v, 2) for k, v in avg_scores.items()}

    return jsonify(user_data), 200


@admin_bp.route("/users/<int:user_id>/role", methods=["PUT"])
@jwt_required()
@admin_required
def update_user_role(user_id):
    current_user_id = get_jwt_identity()

    if int(current_user_id) == user_id:
        return jsonify({"error": "Cannot change your own role"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    new_role = data.get("role")

    if new_role not in ["admin", "user"]:
        return jsonify({"error": "Invalid role. Must be 'admin' or 'user'"}), 400

    user.role = new_role

    try:
        db.session.commit()
        return jsonify(
            {"message": f"User role updated to {new_role}", "user": user_schema.dump(user)}
        ), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update role: {str(e)}"}), 500


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_user(user_id):
    current_user_id = get_jwt_identity()

    if int(current_user_id) == user_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        Detection.query.filter_by(user_id=user_id).delete()
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500




@admin_bp.route("/detections", methods=["GET"])
@jwt_required()
@admin_required
def get_all_detections():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    user_id = request.args.get("user_id", None, type=int)
    search = request.args.get("search", "", type=str)

    query = Detection.query

    if user_id:
        query = query.filter_by(user_id=user_id)

    if search:
        query = query.filter(Detection.name.ilike(f"%{search}%"))

    query = query.order_by(Detection.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    detections_data = []
    for detection in pagination.items:
        det_dict = detection_schema.dump(detection)
        ocean_keys = [
            "openness",
            "conscientiousness",
            "extraversion",
            "agreeableness",
            "neuroticism",
        ]
        results_data = {key: det_dict.pop(key) for key in ocean_keys if key in det_dict}
        det_dict["results"] = results_data

        user = User.query.get(detection.user_id)
        if user:
            det_dict["user"] = {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            }

        detections_data.append(det_dict)

    return jsonify(
        {
            "detections": detections_data,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total_pages": pagination.pages,
                "total_items": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    ), 200


@admin_bp.route("/detections/<int:detection_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_detection_detail(detection_id):
    detection = Detection.query.get(detection_id)

    if not detection:
        return jsonify({"error": "Detection not found"}), 404

    det_dict = detection_schema.dump(detection)
    ocean_keys = [
        "openness",
        "conscientiousness",
        "extraversion",
        "agreeableness",
        "neuroticism",
    ]
    results_data = {key: det_dict.pop(key) for key in ocean_keys if key in det_dict}
    det_dict["results"] = results_data

    insights = generate_ocean_insights(results_data)
    det_dict["insights"] = insights

    user = User.query.get(detection.user_id)
    if user:
        det_dict["user"] = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }

    return jsonify(det_dict), 200


@admin_bp.route("/detections/<int:detection_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_detection(detection_id):
    detection = Detection.query.get(detection_id)

    if not detection:
        return jsonify({"error": "Detection not found"}), 404

    try:
        db.session.delete(detection)
        db.session.commit()
        return jsonify({"message": "Detection deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete detection: {str(e)}"}), 500


@admin_bp.route("/statistics", methods=["GET"])
@jwt_required()
@admin_required
def get_statistics():
    total_users = User.query.count()
    total_detections = Detection.query.count()
    total_admins = User.query.filter_by(role="admin").count()

    avg_scores = db.session.query(
        func.avg(Detection.openness).label("openness"),
        func.avg(Detection.conscientiousness).label("conscientiousness"),
        func.avg(Detection.extraversion).label("extraversion"),
        func.avg(Detection.agreeableness).label("agreeableness"),
        func.avg(Detection.neuroticism).label("neuroticism"),
    ).first()

    average_scores = None
    if avg_scores and avg_scores.openness is not None:
        average_scores = {
            "openness": round(float(avg_scores.openness), 2),
            "conscientiousness": round(float(avg_scores.conscientiousness), 2),
            "extraversion": round(float(avg_scores.extraversion), 2),
            "agreeableness": round(float(avg_scores.agreeableness), 2),
            "neuroticism": round(float(avg_scores.neuroticism), 2),
        }

    score_distribution = {
        "openness": {"high": 0, "medium": 0, "low": 0},
        "conscientiousness": {"high": 0, "medium": 0, "low": 0},
        "extraversion": {"high": 0, "medium": 0, "low": 0},
        "agreeableness": {"high": 0, "medium": 0, "low": 0},
        "neuroticism": {"high": 0, "medium": 0, "low": 0},
    }

    detections = Detection.query.all()
    for det in detections:
        for trait in ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]:
            score = getattr(det, trait)
            if score >= 60:
                score_distribution[trait]["high"] += 1
            elif score >= 40:
                score_distribution[trait]["medium"] += 1
            else:
                score_distribution[trait]["low"] += 1

    from datetime import datetime, timedelta

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_detections = Detection.query.filter(
        Detection.created_at >= seven_days_ago
    ).count()
    recent_users = User.query.filter(User.created_at >= seven_days_ago).count()

    gender_distribution = (
        db.session.query(Detection.gender, func.count(Detection.id))
        .group_by(Detection.gender)
        .all()
    )
    gender_stats = {g or "unknown": c for g, c in gender_distribution}

    age_ranges = {
        "under_18": Detection.query.filter(Detection.age < 18).count(),
        "18_25": Detection.query.filter(Detection.age >= 18, Detection.age <= 25).count(),
        "26_35": Detection.query.filter(Detection.age >= 26, Detection.age <= 35).count(),
        "36_50": Detection.query.filter(Detection.age >= 36, Detection.age <= 50).count(),
        "over_50": Detection.query.filter(Detection.age > 50).count(),
    }

    top_users = (
        db.session.query(User.id, User.name, User.email, func.count(Detection.id).label("count"))
        .join(Detection, User.id == Detection.user_id)
        .group_by(User.id, User.name, User.email)
        .order_by(func.count(Detection.id).desc())
        .limit(5)
        .all()
    )

    top_users_data = [
        {"id": u.id, "name": u.name, "email": u.email, "detection_count": u.count}
        for u in top_users
    ]

    return jsonify(
        {
            "overview": {
                "total_users": total_users,
                "total_detections": total_detections,
                "total_admins": total_admins,
                "recent_detections_7d": recent_detections,
                "recent_users_7d": recent_users,
            },
            "average_scores": average_scores,
            "score_distribution": score_distribution,
            "gender_distribution": gender_stats,
            "age_distribution": age_ranges,
            "top_users": top_users_data,
        }
    ), 200


@admin_bp.route("/statistics/timeline", methods=["GET"])
@jwt_required()
@admin_required
def get_timeline_statistics():
    days = request.args.get("days", 30, type=int)

    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    daily_stats = (
        db.session.query(
            func.date(Detection.created_at).label("date"),
            func.count(Detection.id).label("count"),
            func.avg(Detection.openness).label("avg_openness"),
            func.avg(Detection.conscientiousness).label("avg_conscientiousness"),
            func.avg(Detection.extraversion).label("avg_extraversion"),
            func.avg(Detection.agreeableness).label("avg_agreeableness"),
            func.avg(Detection.neuroticism).label("avg_neuroticism"),
        )
        .filter(Detection.created_at >= start_date)
        .group_by(func.date(Detection.created_at))
        .order_by(func.date(Detection.created_at))
        .all()
    )

    timeline_data = []
    for stat in daily_stats:
        timeline_data.append(
            {
                "date": str(stat.date),
                "detection_count": stat.count,
                "average_scores": {
                    "openness": round(float(stat.avg_openness), 2) if stat.avg_openness else None,
                    "conscientiousness": round(float(stat.avg_conscientiousness), 2)
                    if stat.avg_conscientiousness
                    else None,
                    "extraversion": round(float(stat.avg_extraversion), 2)
                    if stat.avg_extraversion
                    else None,
                    "agreeableness": round(float(stat.avg_agreeableness), 2)
                    if stat.avg_agreeableness
                    else None,
                    "neuroticism": round(float(stat.avg_neuroticism), 2)
                    if stat.avg_neuroticism
                    else None,
                },
            }
        )

    return jsonify({"days": days, "timeline": timeline_data}), 200


@admin_bp.route("/check", methods=["GET"])
@jwt_required()
def check_admin_status():
    """Check if current user is an admin."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(
        {
            "is_admin": user.is_admin(),
            "role": user.role,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            },
        }
    ), 200
