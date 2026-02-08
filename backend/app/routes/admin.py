import io
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings as app_settings
from app.models.user import User
from app.models.daily_card import DailyCard
from app.models.halqa import Halqa
from app.dependencies import RoleChecker
from app.schemas.user import (
    AdminUserUpdate, AdminResetPassword, SetRole,
    AssignHalqa, RejectRegistration, user_to_response,
)
from app.schemas.halqa import HalqaCreate, HalqaUpdate, AssignMembers, halqa_to_response

router = APIRouter(prefix="/api/admin", tags=["admin"])

require_admin = RoleChecker("super_admin")


# ─── User Management ──────────────────────────────────────────────────────────


@router.get("/registrations")
def get_registrations(
    status: str = Query("pending"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all pending registrations."""
    if status == "all":
        users = db.query(User).order_by(User.created_at.desc()).all()
    else:
        users = db.query(User).filter_by(status=status).order_by(User.created_at.desc()).all()
    return {"users": [user_to_response(u) for u in users]}


@router.post("/registration/{user_id}/approve")
def approve_registration(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Approve a registration request."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")

    user.status = "active"
    user.rejection_note = None
    db.commit()
    db.refresh(user)
    return {"message": "تم قبول الطلب", "user": user_to_response(user)}


@router.post("/registration/{user_id}/reject")
def reject_registration(
    user_id: int,
    data: RejectRegistration = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reject a registration request."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")

    user.status = "rejected"
    user.rejection_note = data.note if data else ""
    db.commit()
    db.refresh(user)
    return {"message": "تم رفض الطلب", "user": user_to_response(user)}


@router.get("/users")
def get_all_users(
    status: str = Query(None),
    gender: str = Query(None),
    halqa_id: int = Query(None),
    search: str = Query(""),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all users with optional filters."""
    query = db.query(User)

    if status:
        query = query.filter_by(status=status)
    if gender:
        query = query.filter_by(gender=gender)
    if halqa_id:
        query = query.filter_by(halqa_id=halqa_id)
    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    users = query.order_by(User.created_at.desc()).all()
    return {"users": [user_to_response(u) for u in users]}


@router.get("/user/{user_id}")
def get_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get user details."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")
    return {"user": user_to_response(user)}


@router.put("/user/{user_id}")
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update user details."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")

    allowed = ["full_name", "gender", "age", "phone", "country", "referral_source", "status", "halqa_id"]
    for field in allowed:
        value = getattr(data, field, None)
        if value is not None:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return {"message": "تم تحديث البيانات", "user": user_to_response(user)}


@router.post("/user/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    data: AdminResetPassword,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reset user password by admin."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")

    user.set_password(data.new_password)
    db.commit()
    return {"message": "تم إعادة تعيين كلمة المرور"}


@router.post("/user/{user_id}/withdraw")
def withdraw_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Mark user as withdrawn."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")

    user.status = "withdrawn"
    db.commit()
    db.refresh(user)
    return {"message": "تم سحب المشارك", "user": user_to_response(user)}


@router.post("/user/{user_id}/activate")
def activate_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Re-activate user."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")

    user.status = "active"
    db.commit()
    db.refresh(user)
    return {"message": "تم تفعيل المشارك", "user": user_to_response(user)}


# ─── Role Management ──────────────────────────────────────────────────────────


@router.post("/user/{user_id}/set-role")
def set_user_role(
    user_id: int,
    data: SetRole,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Set user role (supervisor, super_admin, participant)."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, detail="المستخدم غير موجود")

    if data.role not in ["participant", "supervisor", "super_admin"]:
        raise HTTPException(400, detail="الصلاحية غير صالحة")

    # Only primary admin can manage super_admin roles
    primary_email = app_settings.SUPER_ADMIN_EMAIL.lower()
    if data.role == "super_admin" or target.role == "super_admin":
        if admin.email != primary_email:
            raise HTTPException(403, detail="فقط المشرف الرئيسي يمكنه إدارة صلاحيات السوبر آدمن")

    target.role = data.role
    db.commit()
    db.refresh(target)
    return {"message": "تم تحديث الصلاحية", "user": user_to_response(target)}


# ─── Halqa Management ─────────────────────────────────────────────────────────


@router.get("/halqas")
def get_halqas(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all halqas."""
    halqas = db.query(Halqa).all()
    return {"halqas": [halqa_to_response(h) for h in halqas]}


@router.post("/halqa")
def create_halqa(
    data: HalqaCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new halqa."""
    name = data.name.strip()
    if not name:
        raise HTTPException(400, detail="اسم الحلقة مطلوب")

    if db.query(Halqa).filter_by(name=name).first():
        raise HTTPException(400, detail="اسم الحلقة موجود مسبقاً")

    halqa = Halqa(name=name, supervisor_id=data.supervisor_id)
    db.add(halqa)
    db.commit()
    db.refresh(halqa)
    return {"message": "تم إنشاء الحلقة", "halqa": halqa_to_response(halqa)}


@router.put("/halqa/{halqa_id}")
def update_halqa(
    halqa_id: int,
    data: HalqaUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update halqa details."""
    halqa = db.get(Halqa, halqa_id)
    if not halqa:
        raise HTTPException(404, detail="الحلقة غير موجودة")

    if data.name is not None:
        halqa.name = data.name
    if data.supervisor_id is not None:
        halqa.supervisor_id = data.supervisor_id

    db.commit()
    db.refresh(halqa)
    return {"message": "تم تحديث الحلقة", "halqa": halqa_to_response(halqa)}


@router.post("/halqa/{halqa_id}/assign-members")
def assign_members_to_halqa(
    halqa_id: int,
    data: AssignMembers,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Assign members to a halqa."""
    halqa = db.get(Halqa, halqa_id)
    if not halqa:
        raise HTTPException(404, detail="الحلقة غير موجودة")

    for uid in data.user_ids:
        user = db.get(User, uid)
        if user:
            user.halqa_id = halqa_id

    db.commit()
    return {"message": "تم تعيين المشاركين"}


@router.post("/user/{user_id}/assign-halqa")
def assign_user_halqa(
    user_id: int,
    data: AssignHalqa,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Assign a single user to a halqa."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="المستخدم غير موجود")

    user.halqa_id = data.halqa_id
    db.commit()
    db.refresh(user)
    return {"message": "تم تعيين الحلقة", "user": user_to_response(user)}


# ─── Analytics Dashboard ──────────────────────────────────────────────────────


@router.get("/analytics")
def get_analytics(
    gender: str = Query(None),
    halqa_id: int = Query(None),
    supervisor: str = Query(None),
    member: str = Query(None),
    min_pct: float = Query(None),
    max_pct: float = Query(None),
    period: str = Query("all"),
    sort_by: str = Query("score"),
    sort_order: str = Query("desc"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get comprehensive analytics."""
    query = db.query(User).filter_by(status="active")

    if gender:
        query = query.filter_by(gender=gender)
    if halqa_id:
        query = query.filter_by(halqa_id=halqa_id)
    if member:
        query = query.filter(User.full_name.ilike(f"%{member}%"))
    if supervisor:
        halqas = db.query(Halqa).join(User, Halqa.supervisor_id == User.id).filter(
            User.full_name.ilike(f"%{supervisor}%")
        ).all()
        halqa_ids = [h.id for h in halqas]
        if halqa_ids:
            query = query.filter(User.halqa_id.in_(halqa_ids))

    users = query.all()

    # Date range
    today = date.today()
    if period == "weekly":
        start_date = today - timedelta(days=today.weekday())
    elif period == "monthly":
        start_date = today.replace(day=1)
    else:
        start_date = None

    results = []
    for u in users:
        card_query = db.query(DailyCard).filter_by(user_id=u.id)
        if start_date:
            card_query = card_query.filter(DailyCard.date >= start_date)

        cards = card_query.all()
        total = sum(c.total_score for c in cards)
        max_total = sum(c.max_score for c in cards) if cards else 0
        pct = round((total / max_total) * 100, 1) if max_total > 0 else 0

        # Apply percentage filter
        if min_pct is not None and pct < min_pct:
            continue
        if max_pct is not None and pct > max_pct:
            continue

        results.append({
            "user_id": u.id,
            "full_name": u.full_name,
            "gender": u.gender,
            "halqa_name": u.halqa.name if u.halqa else "بدون حلقة",
            "supervisor_name": u.halqa.supervisor.full_name if u.halqa and u.halqa.supervisor else "-",
            "total_score": total,
            "max_score": max_total,
            "percentage": pct,
            "cards_count": len(cards),
        })

    # Sorting
    if sort_by == "name":
        results.sort(key=lambda x: x["full_name"], reverse=(sort_order == "desc"))
    else:
        results.sort(key=lambda x: x["total_score"], reverse=(sort_order == "desc"))

    # Add ranks
    for i, r in enumerate(results):
        r["rank"] = i + 1

    # Summary stats
    total_active = db.query(User).filter_by(status="active").count()
    total_pending = db.query(User).filter_by(status="pending").count()
    total_halqas = db.query(Halqa).count()

    return {
        "results": results,
        "summary": {
            "total_active": total_active,
            "total_pending": total_pending,
            "total_halqas": total_halqas,
            "filtered_count": len(results),
        },
    }


# ─── Import / Export ──────────────────────────────────────────────────────────


@router.get("/export")
def export_data(
    format: str = Query("csv"),
    gender: str = Query(None),
    halqa_id: int = Query(None),
    period: str = Query("all"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Export analytics data as CSV or XLSX."""
    import csv
    from openpyxl import Workbook

    query = db.query(User).filter_by(status="active")
    if gender:
        query = query.filter_by(gender=gender)
    if halqa_id:
        query = query.filter_by(halqa_id=halqa_id)

    users = query.all()
    today = date.today()
    if period == "weekly":
        start_date = today - timedelta(days=today.weekday())
    elif period == "monthly":
        start_date = today.replace(day=1)
    else:
        start_date = None

    rows = []
    for u in users:
        card_query = db.query(DailyCard).filter_by(user_id=u.id)
        if start_date:
            card_query = card_query.filter(DailyCard.date >= start_date)
        cards = card_query.all()
        total = sum(c.total_score for c in cards)
        max_total = sum(c.max_score for c in cards) if cards else 0
        pct = round((total / max_total) * 100, 1) if max_total > 0 else 0

        rows.append({
            "الاسم": u.full_name,
            "الجنس": u.gender,
            "الحلقة": u.halqa.name if u.halqa else "-",
            "المشرف": u.halqa.supervisor.full_name if u.halqa and u.halqa.supervisor else "-",
            "مجموع النقاط": total,
            "الحد الأعلى": max_total,
            "النسبة %": pct,
            "عدد البطاقات": len(cards),
        })

    rows.sort(key=lambda x: x["مجموع النقاط"], reverse=True)

    if format == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.title = "النتائج"

        if rows:
            headers = list(rows[0].keys())
            ws.append(headers)
            for row in rows:
                ws.append([row[h] for h in headers])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=ramadan_results.xlsx"},
        )
    else:
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

        return Response(
            content=output.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=ramadan_results.csv"},
        )


@router.post("/import")
def import_users(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Import users from Excel file."""
    from openpyxl import load_workbook

    wb = load_workbook(file.file)
    ws = wb.active

    headers = [cell.value for cell in ws[1]]
    required_headers = ["الاسم", "الجنس", "العمر", "الهاتف", "البريد", "الدولة"]

    for h in required_headers:
        if h not in headers:
            raise HTTPException(400, detail=f"العمود {h} مفقود من الملف")

    imported = 0
    errors = []

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        row_data = dict(zip(headers, row))
        try:
            email = str(row_data.get("البريد", "")).lower().strip()
            if not email or db.query(User).filter_by(email=email).first():
                errors.append(f"صف {row_idx}: بريد مكرر أو فارغ")
                continue

            user = User(
                full_name=str(row_data.get("الاسم", "")).strip(),
                gender=str(row_data.get("الجنس", "")).strip(),
                age=int(row_data.get("العمر", 0)),
                phone=str(row_data.get("الهاتف", "")).strip(),
                email=email,
                country=str(row_data.get("الدولة", "")).strip(),
                referral_source=str(row_data.get("المصدر", "")).strip(),
                status="active",
                role="participant",
            )
            user.set_password("123456")  # Default password
            db.add(user)
            imported += 1
        except Exception as e:
            errors.append(f"صف {row_idx}: {str(e)}")

    db.commit()
    return {
        "message": f"تم استيراد {imported} مشارك",
        "errors": errors,
    }


@router.get("/import-template")
def get_import_template(
    admin: User = Depends(require_admin),
):
    """Download import template."""
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = "قالب الاستيراد"
    ws.sheet_view.rightToLeft = True

    headers = ["الاسم", "الجنس", "العمر", "الهاتف", "البريد", "الدولة", "المصدر"]
    ws.append(headers)

    # Example row
    ws.append(["أحمد محمد علي", "ذكر", 25, "+966500000000", "ahmed@example.com", "السعودية", "صديق"])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=import_template.xlsx"},
    )
