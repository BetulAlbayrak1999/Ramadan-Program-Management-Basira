import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('تم إرسال رمز إعادة التعيين إلى بريدك');
      setStep(2);
    } catch (err) {
      toast.error('حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, token, new_password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">🔑 إعادة تعيين كلمة المرور</h1>

        {step === 1 && (
          <form onSubmit={requestReset}>
            <p className="auth-subtitle">أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين</p>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input type="email" className="form-input" value={email}
                onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'جاري الإرسال...' : 'إرسال الرمز'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword}>
            <p className="auth-subtitle">أدخل الرمز المرسل إلى بريدك وكلمة المرور الجديدة</p>
            <div className="form-group">
              <label className="form-label">رمز التحقق</label>
              <input className="form-input" value={token}
                onChange={(e) => setToken(e.target.value)} required dir="ltr" placeholder="الرمز المكون من 6 أرقام" />
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور الجديدة</label>
              <input type="password" className="form-input" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required dir="ltr" minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'جاري التعيين...' : 'تعيين كلمة المرور'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center">
            <p className="auth-subtitle" style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>✅ تم إعادة تعيين كلمة المرور بنجاح</p>
            <Link to="/login" className="btn btn-primary mt-2">العودة لتسجيل الدخول</Link>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/login" className="auth-link">العودة لتسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}
