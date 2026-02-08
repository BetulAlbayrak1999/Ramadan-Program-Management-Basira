from app import db


class SiteSettings(db.Model):
    """Global site settings."""

    __tablename__ = "site_settings"

    id = db.Column(db.Integer, primary_key=True)
    enable_email_notifications = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "enable_email_notifications": self.enable_email_notifications,
        }
        