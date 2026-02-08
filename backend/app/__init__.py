from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_mail import Mail

# Extensions
db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
mail = Mail()


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    CORS(app, supports_credentials=True)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.participant import participant_bp
    from app.routes.supervisor import supervisor_bp
    from app.routes.admin import admin_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(participant_bp, url_prefix="/api/participant")
    app.register_blueprint(supervisor_bp, url_prefix="/api/supervisor")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")

    # Create tables
    with app.app_context():
        from app.models import user, daily_card, halqa, site_settings
        db.create_all()

        # Create default site settings if not exist
        from app.models.site_settings import SiteSettings
        if not SiteSettings.query.first():
            default_settings = SiteSettings(enable_email_notifications=True)
            db.session.add(default_settings)
            db.session.commit()

    return app
    