from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app import db
from app.models.user import User
from app.models.daily_card import DailyCard
from app.utils.decorators import active_user_required

participant_bp = Blueprint("participant", __name__)


@participant_bp.route("/card", methods=["POST"])
@jwt_required()
@active_user_required
def save_card():
    """Create or update a daily card."""
    user_id = get_jwt_identity()
    data = request.get_json()

    card_date_str = data.get("date")
    if not card_date_str:
        return jsonify({"error": "التاريخ مطلوب"}), 400

    card_date = date.fromisoformat(card_date_str)

    # No future dates
    if card_date > date.today():
        return jsonify({"error": "لا يمكن إدخال بطاقة بتاريخ مستقبلي"}), 400

    # Validate scores
    score_fields = DailyCard.SCORE_FIELDS
    for field in score_fields:
        val = data.get(field, 0)
        if not isinstance(val, int) or val < 0 or val > 10:
            return jsonify({"error": f"القيمة {field} يجب أن تكون بين 0 و 10"}), 400

    # Find or create card
    card = DailyCard.query.filter_by(user_id=user_id, date=card_date).first()
    if not card:
        card = DailyCard(user_id=user_id, date=card_date)
        db.session.add(card)

    for field in score_fields:
        setattr(card, field, data.get(field, 0))
    card.extra_work_description = data.get("extra_work_description", "")

    db.session.commit()
    return jsonify({"message": "تم حفظ البطاقة", "card": card.to_dict()}), 200


@participant_bp.route("/card/<card_date>", methods=["GET"])
@jwt_required()
@active_user_required
def get_card(card_date):
    """Get daily card for a specific date."""
    user_id = get_jwt_identity()
    card = DailyCard.query.filter_by(
        user_id=user_id, date=date.fromisoformat(card_date)
    ).first()

    if not card:
        return jsonify({"card": None}), 200
    return jsonify({"card": card.to_dict()}), 200


@participant_bp.route("/cards", methods=["GET"])
@jwt_required()
@active_user_required
def get_all_cards():
    """Get all cards for current user."""
    user_id = get_jwt_identity()
    cards = DailyCard.query.filter_by(user_id=user_id).order_by(DailyCard.date.desc()).all()
    return jsonify({"cards": [c.to_dict() for c in cards]}), 200


@participant_bp.route("/stats", methods=["GET"])
@jwt_required()
@active_user_required
def get_stats():
    """Get participant statistics."""
    user_id = get_jwt_identity()
    today = date.today()

    # Today's card
    today_card = DailyCard.query.filter_by(user_id=user_id, date=today).first()
    today_percentage = today_card.percentage if today_card else 0

    # Weekly stats (current week)
    week_start = today - timedelta(days=today.weekday())
    week_cards = DailyCard.query.filter(
        DailyCard.user_id == user_id,
        DailyCard.date >= week_start,
        DailyCard.date <= today,
    ).all()

    week_total = sum(c.total_score for c in week_cards)
    week_max = sum(c.max_score for c in week_cards) if week_cards else 0
    week_percentage = round((week_total / week_max) * 100, 1) if week_max > 0 else 0

    # Overall stats
    all_cards = DailyCard.query.filter_by(user_id=user_id).all()
    overall_total = sum(c.total_score for c in all_cards)
    overall_max = sum(c.max_score for c in all_cards) if all_cards else 0
    overall_percentage = round((overall_total / overall_max) * 100, 1) if overall_max > 0 else 0

    # Leaderboard position
    active_users = User.query.filter_by(status="active").all()
    user_scores = []
    for u in active_users:
        cards = DailyCard.query.filter_by(user_id=u.id).all()
        total = sum(c.total_score for c in cards)
        user_scores.append({"user_id": u.id, "total": total})

    user_scores.sort(key=lambda x: x["total"], reverse=True)
    rank = next(
        (i + 1 for i, s in enumerate(user_scores) if s["user_id"] == user_id),
        len(user_scores),
    )

    return jsonify({
        "today_percentage": today_percentage,
        "week_percentage": week_percentage,
        "overall_percentage": overall_percentage,
        "overall_total": overall_total,
        "rank": rank,
        "total_participants": len(active_users),
        "cards_count": len(all_cards),
    }), 200


@participant_bp.route("/leaderboard", methods=["GET"])
@jwt_required()
@active_user_required
def get_leaderboard():
    """Get top participants leaderboard."""
    active_users = User.query.filter_by(status="active").all()
    leaderboard = []

    for u in active_users:
        cards = DailyCard.query.filter_by(user_id=u.id).all()
        total = sum(c.total_score for c in cards)
        max_total = sum(c.max_score for c in cards) if cards else 0
        pct = round((total / max_total) * 100, 1) if max_total > 0 else 0
        leaderboard.append({
            "user_id": u.id,
            "full_name": u.full_name,
            "total_score": total,
            "percentage": pct,
            "cards_count": len(cards),
        })

    leaderboard.sort(key=lambda x: x["total_score"], reverse=True)

    # Add rank
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1

    return jsonify({"leaderboard": leaderboard}), 200
    