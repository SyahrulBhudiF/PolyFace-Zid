"""
Configuration module for OCEAN Personality Web System.
"""

import os
from datetime import timedelta


class Config:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    MAX_CONTENT_LENGTH: int = 50 * 1024 * 1024

    # Database
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://ocean_user:ocean_pass@localhost:3306/ocean_db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # JWT with httpOnly cookies
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=24)
    JWT_TOKEN_LOCATION: list[str] = ["cookies"]
    JWT_COOKIE_SECURE: bool = os.getenv("FLASK_ENV", "development") == "production"
    JWT_COOKIE_HTTPONLY: bool = True
    JWT_COOKIE_SAMESITE: str = "Lax"
    JWT_COOKIE_CSRF_PROTECT: bool = True
    JWT_ACCESS_COOKIE_NAME: str = "access_token"
    JWT_ACCESS_CSRF_COOKIE_NAME: str = "csrf_access_token"

    # Debug mode
    DEBUG: bool = os.getenv("FLASK_ENV", "development") != "production"

    # Model paths
    BASE_DIR: str = os.path.dirname(os.path.realpath(__file__))
    MODEL_DIR: str = os.path.join(BASE_DIR, "services", "models")
    MODEL_CHECKPOINT_PATH: str = os.path.join(MODEL_DIR, "1127_145313", "polyface.t5")
    MODEL_H5_PATH: str = os.path.join(MODEL_DIR, "keras", "polyface_adagrad.h5")

    # Upload paths
    UPLOAD_FOLDER: str = os.path.join(BASE_DIR, "..", "video")
    STATIC_FOLDER: str = os.path.join(BASE_DIR, "..", "static")

    # OCEAN thresholds
    HIGH_THRESHOLD: float = 60.0
    MEDIUM_THRESHOLD: float = 40.0

    # Frame extraction
    NUM_FRAMES: int = 10
    FRAME_SIZE: tuple[int, int] = (112, 112)


OCEAN_TRAITS: list[str] = [
    "Openness",
    "Conscientiousness",
    "Extraversion",
    "Agreeableness",
    "Neuroticism",
]

OCEAN_TRAIT_KEYS: list[str] = [trait.lower() for trait in OCEAN_TRAITS]
