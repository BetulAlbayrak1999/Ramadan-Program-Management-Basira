import random
import string
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from app import db
from app.models.user import User
from app.utils.email import send_new_registration_email, send_password_reset_email

auth_bp = Blueprint("auth", __name__)

# In-memory store for reset tokens (use Redis in production)
reset_tokens = {}


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new participant."""
    data = request.get_json()

    # Validation
    required = ["full_name", "gender", "age", "phone", "email", "password", "confirm_password", "country"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"الحقل {field} مطلوب"}), 400

    if data["password"] != data["confirm_password"]:
        return jsonify({"error": "كلمتا المرور غير متطابقتين"}), 400

    if len(data["password"]) < 6:
        return jsonify({"error": "كلمة المرور يجب أن تكون 6 أحرف على الأقل"}), 400

    if User.query.filter_by(email=data["email"].lower().strip()).first():
        return jsonify({"error": "البريد الإلكتروني مسجل مسبقاً"}), 400

    user = User(
        full_name=data["full_name"].strip(),
        gender=data["gender"],
        age=int(data["age"]),
        phone=data["phone"].strip(),
        email=data["email"].lower().strip(),
        country=data["country"].strip(),
        referral_source=data.get("referral_source", "").strip(),
        status="pending",
        role="participant",
    )
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    # Send notification email
    try:
        send_new_registration_email(user.to_dict())
    except Exception:
        pass

    return jsonify({"message": "تم إرسال طلب التسجيل بنجاح. يرجى انتظار الموافقة."}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login with email and password."""
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "بيانات الدخول غير صحيحة"}), 401

    if user.status == "pending":
        return jsonify({"error": "طلبك قيد المراجعة. يرجى انتظار الموافقة."}), 403

    if user.status == "rejected":
        note = user.rejection_note or ""
        return jsonify({"error": f"تم رفض طلبك. {note}"}), 403

    if user.status == "withdrawn":
        return jsonify({"error": "حسابك منسحب. تواصل مع الإدارة."}), 403

    # Check if user is primary super admin
    is_primary_admin = email == current_app.config.get("SUPER_ADMIN_EMAIL", "").lower()
    if is_primary_admin and user.role != "super_admin":
        user.role = "super_admin"
        user.status = "active"
        db.session.commit()

    token = create_access_token(identity=user.id)
    return jsonify({
        "token": token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current user profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "المستخدم غير موجود"}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """Update current user profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    allowed_fields = ["full_name", "phone", "country", "age"]
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])

    db.session.commit()
    return jsonify({"message": "تم تحديث الملف الشخصي", "user": user.to_dict()}), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Change password from within account."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    if not user.check_password(data.get("current_password", "")):
        return jsonify({"error": "كلمة المرور الحالية غير صحيحة"}), 400

    if data.get("new_password") != data.get("confirm_password"):
        return jsonify({"error": "كلمتا المرور غير متطابقتين"}), 400

    if len(data.get("new_password", "")) < 6:
        return jsonify({"error": "كلمة المرور يجب أن تكون 6 أحرف على الأقل"}), 400

    user.set_password(data["new_password"])
    db.session.commit()
    return jsonify({"message": "تم تغيير كلمة المرور بنجاح"}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Request password reset."""
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "إذا كان البريد مسجلاً، سيتم إرسال رمز إعادة التعيين"}), 200

    token = "".join(random.choices(string.digits, k=6))
    reset_tokens[email] = token

    try:
        send_password_reset_email(email, token)
    except Exception:
        pass

    return jsonify({"message": "إذا كان البريد مسجلاً، سيتم إرسال رمز إعادة التعيين"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset password with token."""
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    token = data.get("token", "")
    new_password = data.get("new_password", "")

    if reset_tokens.get(email) != token:
        return jsonify({"error": "رمز إعادة التعيين غير صحيح"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "المستخدم غير موجود"}), 404

    user.set_password(new_password)
    db.session.commit()
    del reset_tokens[email]

    return jsonify({"message": "تم إعادة تعيين كلمة المرور بنجاح"}), 200
    