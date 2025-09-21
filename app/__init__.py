from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)

    CORS(app)

    # config
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://ocean_user:ocean_pass@localhost:3306/ocean_db"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # register blueprints / routes
    from .routes import bp as routes_bp
    app.register_blueprint(routes_bp)

    return app
