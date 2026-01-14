"""
OCEAN Personality Web System - Flask Application Factory
"""

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from .config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from .auth import auth_bp
    from .routes import bp as routes_bp
    from .admin import admin_bp

    app.register_blueprint(routes_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_bp, url_prefix="/admin")

    @app.errorhandler(400)
    def bad_request(error):
        return {"error": "Bad request"}, 400

    @app.errorhandler(401)
    def unauthorized(error):
        return {"error": "Unauthorized"}, 401

    @app.errorhandler(403)
    def forbidden(error):
        return {"error": "Forbidden"}, 403

    @app.errorhandler(404)
    def not_found(error):
        return {"error": "Not found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {"error": "Internal server error"}, 500

    return app
