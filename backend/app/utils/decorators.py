from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models.user import User


def role_required(*roles):
    """Decorator to restrict access to specific roles."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                return jsonify({"error": "المستخدم غير موجود"}), 404

            if user.status != "active" and user.role != "super_admin":
                return jsonify({"error": "الحساب غير مفعل"}), 403

            if user.role not in roles:
                return jsonify({"error": "ليس لديك صلاحية للوصول"}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def active_user_required(fn):
    """Decorator to ensure user is active."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "المستخدم غير موجود"}), 404

        if user.status != "active":
            return jsonify({"error": "الحساب غير مفعل"}), 403

        return fn(*args, **kwargs)

    return wrapper
    