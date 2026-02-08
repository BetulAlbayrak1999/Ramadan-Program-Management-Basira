from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.daily_card import DailyCard
from app.models.halqa import Halqa
from app.utils.decorators import role_required

supervisor_bp = Blueprint("supervisor", __name__)


@supervisor_bp.route("/members", methods=["GET"])
@jwt_required()
@role_required("supervisor", "super_admin")
def get_halqa_members():
    """Get members in supervisor's halqa."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    halqa = Halqa.query.filter_by(supervisor_id=user_id).first()
    if not halqa:
        return jsonify({"error": "لا توجد حلقة مسندة إليك"}), 404

    members = User.query.filter_by(halqa_id=halqa.id, status="active").all()
    return jsonify({
        "halqa": halqa.to_dict(),
        "members": [m.to_dict() for m in members],
    }), 200


@supervisor_bp.route("/member/<int:member_id>/cards", methods=["GET"])
@jwt_required()
@role_required("supervisor", "super_admin")
def get_member_cards(member_id):
    """Get all cards for a specific member in halqa."""
    user_id = get_jwt_identity()

    # Verify supervisor owns the halqa
    halqa = Halqa.query.filter_by(supervisor_id=user_id).first()
    if not halqa:
        return jsonify({"error": "لا توجد حلقة مسندة إليك"}), 404

    member = User.query.get(member_id)
    if not member or member.halqa_id != halqa.id:
        return jsonify({"error": "المشارك ليس في حلقتك"}), 403

    cards = DailyCard.query.filter_by(user_id=member_id).order_by(DailyCard.date.desc()).all()
    return jsonify({
        "member": member.to_dict(),
        "cards": [c.to_dict() for c in cards],
    }), 200


@supervisor_bp.route("/daily-summary", methods=["GET"])
@jwt_required()
@role_required("supervisor", "super_admin")
def get_daily_summary():
    """Get daily submission summary for the halqa."""
    user_id = get_jwt_identity()
    target_date_str = request.args.get("date", date.today().isoformat())
    target_date = date.fromisoformat(target_date_str)

    halqa = Halqa.query.filter_by(supervisor_id=user_id).first()
    if not halqa:
        return jsonify({"error": "لا توجد حلقة مسندة إليك"}), 404

    members = User.query.filter_by(halqa_id=halqa.id, status="active").all()

    submitted = []
    not_submitted = []

    for member in members:
        card = DailyCard.query.filter_by(user_id=member.id, date=target_date).first()
        if card:
            submitted.append({
                "member": member.to_dict(),
                "card": card.to_dict(),
            })
        else:
            not_submitted.append(member.to_dict())

    return jsonify({
        "date": target_date.isoformat(),
        "halqa": halqa.to_dict(),
        "submitted": submitted,
        "not_submitted": not_submitted,
        "submitted_count": len(submitted),
        "not_submitted_count": len(not_submitted),
        "total_members": len(members),
    }), 200


@supervisor_bp.route("/weekly-summary", methods=["GET"])
@jwt_required()
@role_required("supervisor", "super_admin")
def get_weekly_summary():
    """Get weekly summary for the halqa."""
    user_id = get_jwt_identity()

    halqa = Halqa.query.filter_by(supervisor_id=user_id).first()
    if not halqa:
        return jsonify({"error": "لا توجد حلقة مسندة إليك"}), 404

    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    members = User.query.filter_by(halqa_id=halqa.id, status="active").all()
    summary = []

    for member in members:
        cards = DailyCard.query.filter(
            DailyCard.user_id == member.id,
            DailyCard.date >= week_start,
            DailyCard.date <= today,
        ).all()

        total = sum(c.total_score for c in cards)
        max_total = sum(c.max_score for c in cards) if cards else 0
        pct = round((total / max_total) * 100, 1) if max_total > 0 else 0

        summary.append({
            "member": member.to_dict(),
            "cards_submitted": len(cards),
            "total_score": total,
            "percentage": pct,
        })

    summary.sort(key=lambda x: x["total_score"], reverse=True)

    return jsonify({
        "halqa": halqa.to_dict(),
        "week_start": week_start.isoformat(),
        "week_end": today.isoformat(),
        "summary": summary,
    }), 200
    