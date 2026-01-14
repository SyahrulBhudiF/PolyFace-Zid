import os

import cv2
import numpy as np
from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from . import db
from .insights import generate_ocean_insights, get_insight_for_detection
from .models import Detection, User
from .pdf_generator import generate_pdf_report
from .schemas import DetectionSchema
from .services.predict import predict_ocean

detection_schema = DetectionSchema()

bp = Blueprint("routes", __name__)


def extract_frames(video_path, num_frames=10, target_size=(112, 112)):
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames < num_frames:
        frame_indices = list(range(total_frames)) * (num_frames // total_frames + 1)
        frame_indices = frame_indices[:num_frames]
    else:
        frame_indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)

    frames = []

    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()

        if not ret:
            frame = np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)

        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame = cv2.resize(frame, target_size)

        frames.append(frame)

    cap.release()
    return np.array(frames, dtype=np.uint8)


@bp.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    user_id = get_jwt_identity()

    if "video" not in request.files:
        return jsonify({"error": "No video file uploaded"}), 400

    file = request.files["video"]
    name = request.form.get("name")
    age = request.form.get("age")
    gender = request.form.get("gender")

    os.makedirs("video", exist_ok=True)
    fileName = f"{hash(file.filename)}_{file.filename}"
    save_path = os.path.join("video", fileName)
    file.save(save_path)

    try:
        frames = extract_frames(save_path)

        if frames.size == 0:
            return jsonify({"error": "Failed to extract frames"}), 500

        frames = frames.astype("float32") / 255.0

        try:
            scores = predict_ocean(frames)
        except Exception as e:
            return jsonify({"error": f"Predict failed: {e}"}), 500

    except Exception as e:
        return jsonify({"error": f"Frame extraction failed: {e}"}), 500

    try:
        detection = Detection(
            user_id=int(user_id),
            name=name,
            age=int(age) if age else None,
            gender=gender,
            image_path=save_path,
            openness=scores["Openness"],
            conscientiousness=scores["Conscientiousness"],
            extraversion=scores["Extraversion"],
            agreeableness=scores["Agreeableness"],
            neuroticism=scores["Neuroticism"],
        )

        db.session.add(detection)
        db.session.commit()
    except Exception as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    detection = detection_schema.dump(detection)

    ocean_keys = [
        "openness",
        "conscientiousness",
        "extraversion",
        "agreeableness",
        "neuroticism",
    ]

    results_data = {key: detection.pop(key) for key in ocean_keys if key in detection}
    detection["results"] = results_data

    return jsonify(detection)


@bp.route("/history", methods=["GET"])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()

    try:
        detections = (
            Detection.query.filter_by(user_id=int(user_id))
            .order_by(Detection.id.desc())
            .all()
        )
        serialized_detections = detection_schema.dump(detections, many=True)

        ocean_keys = [
            "openness",
            "conscientiousness",
            "extraversion",
            "agreeableness",
            "neuroticism",
        ]

        transformed_detections = []
        for detection_data in serialized_detections:
            results_data = {
                key: detection_data.pop(key)
                for key in ocean_keys
                if key in detection_data
            }
            detection_data["results"] = results_data
            transformed_detections.append(detection_data)

        return jsonify(transformed_detections)
    except Exception as e:
        return jsonify({"error": f"Could not retrieve history: {e}"}), 500


@bp.route("/history/<int:detection_id>", methods=["GET"])
@jwt_required()
def get_detection(detection_id):
    user_id = get_jwt_identity()

    try:
        detection = Detection.query.filter_by(
            id=detection_id, user_id=int(user_id)
        ).first()

        if not detection:
            return jsonify({"error": "Detection not found"}), 404

        serialized = detection_schema.dump(detection)

        ocean_keys = [
            "openness",
            "conscientiousness",
            "extraversion",
            "agreeableness",
            "neuroticism",
        ]

        results_data = {
            key: serialized.pop(key) for key in ocean_keys if key in serialized
        }
        serialized["results"] = results_data

        return jsonify(serialized)
    except Exception as e:
        return jsonify({"error": f"Could not retrieve detection: {e}"}), 500


@bp.route("/history/<int:detection_id>", methods=["DELETE"])
@jwt_required()
def delete_detection(detection_id):
    user_id = get_jwt_identity()

    try:
        detection = Detection.query.filter_by(
            id=detection_id, user_id=int(user_id)
        ).first()

        if not detection:
            return jsonify({"error": "Detection not found"}), 404

        db.session.delete(detection)
        db.session.commit()

        return jsonify({"message": "Detection deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Could not delete detection: {e}"}), 500


@bp.route("/history/<int:detection_id>/insights", methods=["GET"])
@jwt_required()
def get_detection_insights(detection_id):
    user_id = get_jwt_identity()

    try:
        detection = Detection.query.filter_by(
            id=detection_id, user_id=int(user_id)
        ).first()

        if not detection:
            return jsonify({"error": "Detection not found"}), 404

        insights = get_insight_for_detection(detection)

        return jsonify(
            {
                "detection_id": detection_id,
                "scores": {
                    "openness": detection.openness,
                    "conscientiousness": detection.conscientiousness,
                    "extraversion": detection.extraversion,
                    "agreeableness": detection.agreeableness,
                    "neuroticism": detection.neuroticism,
                },
                "insights": insights,
            }
        )
    except Exception as e:
        return jsonify({"error": f"Could not generate insights: {e}"}), 500


@bp.route("/history/<int:detection_id>/report", methods=["GET"])
@jwt_required()
def generate_report(detection_id):
    user_id = int(get_jwt_identity())

    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.is_admin():
            detection = Detection.query.get(detection_id)
        else:
            detection = Detection.query.filter_by(
                id=detection_id,
                user_id=user_id
            ).first()

        if not detection:
            return jsonify({"error": "Detection not found"}), 404

        owner = User.query.get(detection.user_id)

        pdf_buffer = generate_pdf_report(
            detection=detection,
            user_name=owner.name,
            user_email=owner.email,
        )

        safe_name = detection.name.replace(" ", "_") if detection.name else "report"
        filename = f"OCEAN_Report_{safe_name}_{detection_id}.pdf"

        return Response(
            pdf_buffer.getvalue(),
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/pdf",
            },
        )
    except Exception as e:
        return jsonify({"error": f"Could not generate report: {e}"}), 500


@bp.route("/history/<int:detection_id>/report/preview", methods=["GET"])
@jwt_required()
def preview_report(detection_id):
    user_id = int(get_jwt_identity())

    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.is_admin():
            detection = Detection.query.get(detection_id)
        else:
            detection = Detection.query.filter_by(
                id=detection_id,
                user_id=user_id
            ).first()

        if not detection:
            return jsonify({"error": "Detection not found"}), 404

        owner = User.query.get(detection.user_id)

        pdf_buffer = generate_pdf_report(
            detection=detection,
            user_name=owner.name,
            user_email=owner.email,
        )

        safe_name = detection.name.replace(" ", "_") if detection.name else "report"
        filename = f"OCEAN_Report_{safe_name}_{detection_id}.pdf"

        return Response(
            pdf_buffer.getvalue(),
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Content-Type": "application/pdf",
            },
        )
    except Exception as e:
        return jsonify({"error": f"Could not generate report: {e}"}), 500
