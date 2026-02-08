from datetime import datetime
from sqlalchemy import Column, Integer, Text, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class DailyCard(Base):
    """Daily Ramadan card for tracking daily achievements."""

    __tablename__ = "daily_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)

    # Score fields (0-10 each)
    quran = Column(Integer, default=0)
    duas = Column(Integer, default=0)
    taraweeh = Column(Integer, default=0)
    tahajjud = Column(Integer, default=0)
    duha = Column(Integer, default=0)
    rawatib = Column(Integer, default=0)
    main_lesson = Column(Integer, default=0)
    required_lesson = Column(Integer, default=0)
    enrichment_lesson = Column(Integer, default=0)
    charity_worship = Column(Integer, default=0)
    extra_work = Column(Integer, default=0)
    extra_work_description = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="daily_cards")

    # Unique constraint: one card per user per day
    __table_args__ = (UniqueConstraint("user_id", "date", name="unique_user_date"),)

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
