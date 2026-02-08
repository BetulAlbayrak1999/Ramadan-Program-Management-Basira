from datetime import datetime
from app import db


class Halqa(db.Model):
    """Halqa (circle/group) model for organizing participants."""

    __tablename__ = "halqas"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True)
    supervisor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    supervisor = db.relationship(
        "User", back_populates="supervised_halqa", foreign_keys=[supervisor_id]
    )
    members = db.relationship(
        "User", back_populates="halqa", foreign_keys="User.halqa_id"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "supervisor_id": self.supervisor_id,
            "supervisor_name": self.supervisor.full_name if self.supervisor else None,
            "member_count": len([m for m in self.members if m.status == "active"]),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        