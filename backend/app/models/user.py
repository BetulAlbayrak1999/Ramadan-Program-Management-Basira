from datetime import datetime
from app import db
import bcrypt


class User(db.Model):
    """User model for participants, supervisors, and admins."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(200), nullable=False)
    gender = db.Column(db.String(10), nullable=False)  # male / female
    age = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    referral_source = db.Column(db.Text, nullable=True)

    # Status & Roles
    status = db.Column(
        db.String(20), default="pending"
    )  # pending, active, rejected, withdrawn
    role = db.Column(db.String(20), default="participant")  # participant, supervisor, super_admin
    rejection_note = db.Column(db.Text, nullable=True)

    # Halqa (circle) assignment
    halqa_id = db.Column(db.Integer, db.ForeignKey("halqas.id"), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    halqa = db.relationship("Halqa", back_populates="members", foreign_keys=[halqa_id])
    daily_cards = db.relationship("DailyCard", back_populates="user", cascade="all, delete-orphan")
    supervised_halqa = db.relationship(
        "Halqa", back_populates="supervisor", foreign_keys="Halqa.supervisor_id", uselist=False
    )

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, password):
        return bcrypt.checkpw(
            password.encode("utf-8"), self.password_hash.encode("utf-8")
        )

    def to_dict(self, include_sensitive=False):
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "gender": self.gender,
            "age": self.age,
            "phone": self.phone,
            "email": self.email,
            "country": self.country,
            "referral_source": self.referral_source,
            "status": self.status,
            "role": self.role,
            "rejection_note": self.rejection_note,
            "halqa_id": self.halqa_id,
            "halqa_name": self.halqa.name if self.halqa else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if self.supervised_halqa:
            data["supervised_halqa_name"] = self.supervised_halqa.name
        if self.halqa and self.halqa.supervisor:
            data["supervisor_name"] = self.halqa.supervisor.full_name
            data["supervisor_phone"] = self.halqa.supervisor.phone
        return data
        