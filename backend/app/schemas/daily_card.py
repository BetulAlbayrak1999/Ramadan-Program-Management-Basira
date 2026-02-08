from datetime import date
from pydantic import BaseModel, Field


class DailyCardCreate(BaseModel):
    date: date
    quran: int = Field(default=0, ge=0, le=10)
    duas: int = Field(default=0, ge=0, le=10)
    taraweeh: int = Field(default=0, ge=0, le=10)
    tahajjud: int = Field(default=0, ge=0, le=10)
    duha: int = Field(default=0, ge=0, le=10)
    rawatib: int = Field(default=0, ge=0, le=10)
    main_lesson: int = Field(default=0, ge=0, le=10)
    required_lesson: int = Field(default=0, ge=0, le=10)
    enrichment_lesson: int = Field(default=0, ge=0, le=10)
    charity_worship: int = Field(default=0, ge=0, le=10)
    extra_work: int = Field(default=0, ge=0, le=10)
    extra_work_description: str = ""


def card_to_response(card) -> dict:
    """Build card response dict matching the frontend expected format."""
    return {
        "id": card.id,
        "user_id": card.user_id,
        "date": card.date.isoformat(),
        "quran": card.quran,
        "duas": card.duas,
        "taraweeh": card.taraweeh,
        "tahajjud": card.tahajjud,
        "duha": card.duha,
        "rawatib": card.rawatib,
        "main_lesson": card.main_lesson,
        "required_lesson": card.required_lesson,
        "enrichment_lesson": card.enrichment_lesson,
        "charity_worship": card.charity_worship,
        "extra_work": card.extra_work,
        "extra_work_description": card.extra_work_description,
        "total_score": card.total_score,
        "max_score": card.max_score,
        "percentage": card.percentage,
        "created_at": card.created_at.isoformat() if card.created_at else None,
        "updated_at": card.updated_at.isoformat() if card.updated_at else None,
    }
