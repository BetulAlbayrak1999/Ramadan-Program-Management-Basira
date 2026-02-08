from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.daily_card import DailyCard
from app.models.halqa import Halqa
from app.dependencies import RoleChecker
from app.schemas.user import user_to_response
from app.schemas.daily_card import card_to_response
from app.schemas.halqa import halqa_to_response

router = APIRouter(prefix="/api/supervisor", tags=["supervisor"])

require_supervisor = RoleChecker("supervisor", "super_admin")


@router.get("/members")
def get_halqa_members(
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get members in supervisor's halqa."""
    halqa = db.query(Halqa).filter_by(supervisor_id=user.id).first()
    if not halqa:
        raise HTTPException(404, detail="لا توجد حلقة مسندة إليك")

    members = db.query(User).filter_by(halqa_id=halqa.id, status="active").all()
    return {
        "halqa": halqa_to_response(halqa),
        "members": [user_to_response(m) for m in members],
    }


@router.get("/member/{member_id}/cards")
def get_member_cards(
    member_id: int,
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get all cards for a specific member in halqa."""
    halqa = db.query(Halqa).filter_by(supervisor_id=user.id).first()
    if not halqa:
        raise HTTPException(404, detail="لا توجد حلقة مسندة إليك")

    member = db.get(User, member_id)
    if not member or member.halqa_id != halqa.id:
        raise HTTPException(403, detail="المشارك ليس في حلقتك")

    cards = db.query(DailyCard).filter_by(user_id=member_id).order_by(DailyCard.date.desc()).all()
    return {
        "member": user_to_response(member),
        "cards": [card_to_response(c) for c in cards],
    }


@router.get("/daily-summary")
def get_daily_summary(
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
    date_param: str = Query(None, alias="date"),
):
    """Get daily submission summary for the halqa."""
    target_date_str = date_param or date.today().isoformat()
    target_date = date.fromisoformat(target_date_str)

    halqa = db.query(Halqa).filter_by(supervisor_id=user.id).first()
    if not halqa:
        raise HTTPException(404, detail="لا توجد حلقة مسندة إليك")

    members = db.query(User).filter_by(halqa_id=halqa.id, status="active").all()

    submitted = []
    not_submitted = []

    for member in members:
        card = db.query(DailyCard).filter_by(user_id=member.id, date=target_date).first()
        if card:
            submitted.append({
                "member": user_to_response(member),
                "card": card_to_response(card),
            })
        else:
            not_submitted.append(user_to_response(member))

    return {
        "date": target_date.isoformat(),
        "halqa": halqa_to_response(halqa),
        "submitted": submitted,
        "not_submitted": not_submitted,
        "submitted_count": len(submitted),
        "not_submitted_count": len(not_submitted),
        "total_members": len(members),
    }


@router.get("/weekly-summary")
def get_weekly_summary(
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get weekly summary for the halqa."""
    halqa = db.query(Halqa).filter_by(supervisor_id=user.id).first()
    if not halqa:
        raise HTTPException(404, detail="لا توجد حلقة مسندة إليك")

    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    members = db.query(User).filter_by(halqa_id=halqa.id, status="active").all()
    summary = []

    for member in members:
        cards = db.query(DailyCard).filter(
            DailyCard.user_id == member.id,
            DailyCard.date >= week_start,
            DailyCard.date <= today,
        ).all()

        total = sum(c.total_score for c in cards)
        max_total = sum(c.max_score for c in cards) if cards else 0
        pct = round((total / max_total) * 100, 1) if max_total > 0 else 0

        summary.append({
            "member": user_to_response(member),
            "cards_submitted": len(cards),
            "total_score": total,
            "percentage": pct,
        })

    summary.sort(key=lambda x: x["total_score"], reverse=True)

    return {
        "halqa": halqa_to_response(halqa),
        "week_start": week_start.isoformat(),
        "week_end": today.isoformat(),
        "summary": summary,
    }
