from datetime import datetime
from app import db


class DailyCard(db.Model):
    """Daily Ramadan card for tracking daily achievements."""

    __tablename__ = "daily_cards"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)

    # Score fields (0-10 each)
    quran = db.Column(db.Integer, default=0)
    duas = db.Column(db.Integer, default=0)
    taraweeh = db.Column(db.Integer, default=0)
    tahajjud = db.Column(db.Integer, default=0)
    duha = db.Column(db.Integer, default=0)
    rawatib = db.Column(db.Integer, default=0)
    main_lesson = db.Column(db.Integer, default=0)
    required_lesson = db.Column(db.Integer, default=0)
    enrichment_lesson = db.Column(db.Integer, default=0)
    charity_worship = db.Column(db.Integer, default=0)
    extra_work = db.Column(db.Integer, default=0)
    extra_work_description = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship("User", back_populates="daily_cards")

    # Unique constraint: one card per user per day
    __table_args__ = (db.UniqueConstraint("user_id", "date", name="unique_user_date"),)

    SCORE_FIELDS = [
        "quran", "duas", "taraweeh", "tahajjud", "duha",
        "rawatib", "main_lesson", "required_lesson",
        "enrichment_lesson", "charity_worship", "extra_work",
    ]

    @property
    def total_score(self):
        return sum(getattr(self, field, 0) or 0 for field in self.SCORE_FIELDS)

    @property
    def max_score(self):
        return len(self.SCORE_FIELDS) * 10  # 110

    @property
    def percentage(self):
        if self.max_score == 0:
            return 0
        return round((self.total_score / self.max_score) * 100, 1)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date": self.date.isoformat(),
            "quran": self.quran,
            "duas": self.duas,
            "taraweeh": self.taraweeh,
            "tahajjud": self.tahajjud,
            "duha": self.duha,
            "rawatib": self.rawatib,
            "main_lesson": self.main_lesson,
            "required_lesson": self.required_lesson,
            "enrichment_lesson": self.enrichment_lesson,
            "charity_worship": self.charity_worship,
            "extra_work": self.extra_work,
            "extra_work_description": self.extra_work_description,
            "total_score": self.total_score,
            "max_score": self.max_score,
            "percentage": self.percentage,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        