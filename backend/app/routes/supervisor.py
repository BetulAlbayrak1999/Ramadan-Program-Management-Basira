from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.daily_card import DailyCard
from app.models.halqa import Halqa
from app.dependencies import RoleChecker
from app.schemas.user import user_to_response
from app.schemas.daily_card import DailyCardCreate, card_to_response
from app.schemas.halqa import halqa_to_response

router = APIRouter(prefix="/api/supervisor", tags=["supervisor"])

require_supervisor = RoleChecker("supervisor", "super_admin")


def _resolve_halqa(user, db, halqa_id=None):
    """Resolve which halqa to use.
    - super_admin: can pick any halqa via halqa_id, or None for all members.
    - supervisor: always uses their own halqa (halqa_id ignored).
    """
    if user.role == "super_admin":
        if halqa_id:
            halqa = db.get(Halqa, halqa_id)
            if not halqa:
                raise HTTPException(404, detail="الحلقة غير موجودة")
            return halqa
        return None  # means "all halqas"
    # Regular supervisor
    halqa = db.query(Halqa).filter_by(supervisor_id=user.id).first()
    if not halqa:
        raise HTTPException(404, detail="لا توجد حلقة مسندة إليك")
    return halqa


def _get_members(db, halqa):
    """Get active members for a halqa, or all active participants if halqa is None."""
    if halqa:
        return db.query(User).filter_by(halqa_id=halqa.id, status="active").all()
    return db.query(User).filter_by(status="active", role="participant").all()


def _verify_member_access(user, member_id, db):
    """Verify the supervisor/admin can access this member."""
    member = db.get(User, member_id)
    if not member:
        raise HTTPException(404, detail="المشارك غير موجود")
    if user.role == "super_admin":
        return member
    halqa = db.query(Halqa).filter_by(supervisor_id=user.id).first()
    if not halqa or member.halqa_id != halqa.id:
        raise HTTPException(403, detail="المشارك ليس في حلقتك")
    return member


@router.get("/halqas")
def get_all_halqas(
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get halqas available to this user. Super admin sees all, supervisor sees own."""
    if user.role == "super_admin":
        halqas = db.query(Halqa).all()
    else:
        halqa = db.query(Halqa).filter_by(supervisor_id=user.id).first()
        halqas = [halqa] if halqa else []
    return {"halqas": [halqa_to_response(h) for h in halqas]}


@router.get("/members")
def get_halqa_members(
    halqa_id: int = Query(None),
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get members. Super admin can filter by halqa_id or see all."""
    halqa = _resolve_halqa(user, db, halqa_id)
    members = _get_members(db, halqa)
    return {
        "halqa": halqa_to_response(halqa) if halqa else None,
        "members": [user_to_response(m) for m in members],
    }


@router.get("/member/{member_id}/cards")
def get_member_cards(
    member_id: int,
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get all cards for a specific member."""
    member = _verify_member_access(user, member_id, db)
    cards = db.query(DailyCard).filter_by(user_id=member_id).order_by(DailyCard.date.desc()).all()
    return {
        "member": user_to_response(member),
        "cards": [card_to_response(c) for c in cards],
    }


@router.get("/member/{member_id}/card/{card_date}")
def get_member_card_detail(
    member_id: int,
    card_date: str,
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get a specific daily card for a member (full detail)."""
    member = _verify_member_access(user, member_id, db)
    card = db.query(DailyCard).filter_by(
        user_id=member_id, date=date.fromisoformat(card_date)
    ).first()

    if not card:
        return {"member": user_to_response(member), "card": None}
    return {"member": user_to_response(member), "card": card_to_response(card)}


@router.put("/member/{member_id}/card/{card_date}")
def update_member_card(
    member_id: int,
    card_date: str,
    data: DailyCardCreate,
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Create or update a daily card for a member."""
    member = _verify_member_access(user, member_id, db)

    target_date = date.fromisoformat(card_date)
    if target_date > date.today():
        raise HTTPException(400, detail="لا يمكن إدخال بطاقة بتاريخ مستقبلي")

    card = db.query(DailyCard).filter_by(user_id=member_id, date=target_date).first()
    if not card:
        card = DailyCard(user_id=member_id, date=target_date)
        db.add(card)

    for field in DailyCard.SCORE_FIELDS:
        setattr(card, field, getattr(data, field, 0))
    card.extra_work_description = data.extra_work_description

    db.commit()
    db.refresh(card)
    return {"message": "تم تحديث بطاقة المشارك", "card": card_to_response(card)}


@router.get("/leaderboard")
def get_leaderboard(
    halqa_id: int = Query(None),
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get leaderboard. Super admin can filter by halqa or see all."""
    halqa = _resolve_halqa(user, db, halqa_id)
    members = _get_members(db, halqa)

    leaderboard = []
    for m in members:
        cards = db.query(DailyCard).filter_by(user_id=m.id).all()
        total = sum(c.total_score for c in cards)
        max_total = sum(c.max_score for c in cards) if cards else 0
        pct = round((total / max_total) * 100, 1) if max_total > 0 else 0
        leaderboard.append({
            "user_id": m.id,
            "full_name": m.full_name,
            "halqa_name": m.halqa.name if m.halqa else "-",
            "total_score": total,
            "percentage": pct,
            "cards_count": len(cards),
        })

    leaderboard.sort(key=lambda x: x["total_score"], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1

    return {
        "halqa": halqa_to_response(halqa) if halqa else None,
        "leaderboard": leaderboard,
    }


@router.get("/daily-summary")
def get_daily_summary(
    halqa_id: int = Query(None),
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
    date_param: str = Query(None, alias="date"),
):
    """Get daily submission summary. Super admin can filter by halqa."""
    target_date_str = date_param or date.today().isoformat()
    target_date = date.fromisoformat(target_date_str)

    halqa = _resolve_halqa(user, db, halqa_id)
    members = _get_members(db, halqa)

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
        "halqa": halqa_to_response(halqa) if halqa else None,
        "submitted": submitted,
        "not_submitted": not_submitted,
        "submitted_count": len(submitted),
        "not_submitted_count": len(not_submitted),
        "total_members": len(members),
    }


@router.get("/range-summary")
def get_range_summary(
    halqa_id: int = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get summary for a custom date range."""
    today = date.today()
    start = date.fromisoformat(date_from) if date_from else today - timedelta(days=6)
    end = date.fromisoformat(date_to) if date_to else today
    total_days = (end - start).days + 1

    halqa = _resolve_halqa(user, db, halqa_id)
    members = _get_members(db, halqa)
    summary = []

    for member in members:
        cards = db.query(DailyCard).filter(
            DailyCard.user_id == member.id,
            DailyCard.date >= start,
            DailyCard.date <= end,
        ).all()

        total = sum(c.total_score for c in cards)
        max_total = sum(c.max_score for c in cards) if cards else 0
        pct = round((total / max_total) * 100, 1) if max_total > 0 else 0

        summary.append({
            "member": user_to_response(member),
            "cards_submitted": len(cards),
            "total_days": total_days,
            "total_score": total,
            "percentage": pct,
        })

    summary.sort(key=lambda x: x["total_score"], reverse=True)

    return {
        "halqa": halqa_to_response(halqa) if halqa else None,
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        "total_days": total_days,
        "summary": summary,
    }


@router.get("/weekly-summary")
def get_weekly_summary(
    halqa_id: int = Query(None),
    user: User = Depends(require_supervisor),
    db: Session = Depends(get_db),
):
    """Get weekly summary. Super admin can filter by halqa."""
    halqa = _resolve_halqa(user, db, halqa_id)

    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    members = _get_members(db, halqa)
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
        "halqa": halqa_to_response(halqa) if halqa else None,
        "week_start": week_start.isoformat(),
        "week_end": today.isoformat(),
        "summary": summary,
    }
