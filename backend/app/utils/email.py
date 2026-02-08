from flask import current_app
from flask_mail import Message
from app import mail
from app.models.site_settings import SiteSettings


def send_new_registration_email(user_data):
    """Send email notification to super admin about new registration."""
    settings = SiteSettings.query.first()
    if not settings or not settings.enable_email_notifications:
        return

    admin_email = current_app.config.get("SUPER_ADMIN_EMAIL")
    if not admin_email:
        return

    try:
        msg = Message(
            subject="طلب تسجيل جديد في البرنامج الرمضاني",
            sender=current_app.config.get("MAIL_USERNAME"),
            recipients=[admin_email],
        )
        msg.html = f"""
        <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>طلب تسجيل جديد</h2>
            <p><strong>الاسم:</strong> {user_data.get('full_name')}</p>
            <p><strong>البريد الإلكتروني:</strong> {user_data.get('email')}</p>
            <p><strong>الهاتف:</strong> {user_data.get('phone')}</p>
            <p><strong>الجنس:</strong> {user_data.get('gender')}</p>
            <p><strong>العمر:</strong> {user_data.get('age')}</p>
            <p><strong>الدولة:</strong> {user_data.get('country')}</p>
            <p><strong>مصدر المعرفة:</strong> {user_data.get('referral_source', '-')}</p>
            <hr>
            <p>يرجى مراجعة الطلب من لوحة التحكم.</p>
        </div>
        """
        mail.send(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")


def send_password_reset_email(user_email, reset_token):
    """Send password reset email."""
    try:
        msg = Message(
            subject="إعادة تعيين كلمة المرور",
            sender=current_app.config.get("MAIL_USERNAME"),
            recipients=[user_email],
        )
        msg.html = f"""
        <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>إعادة تعيين كلمة المرور</h2>
            <p>لقد طلبت إعادة تعيين كلمة المرور. استخدم الرمز التالي:</p>
            <h3 style="background: #f0f0f0; padding: 10px; text-align: center;">{reset_token}</h3>
            <p>إذا لم تطلب ذلك، يرجى تجاهل هذا البريد.</p>
        </div>
        """
        mail.send(msg)
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        