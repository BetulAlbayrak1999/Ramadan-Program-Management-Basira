import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">🌙 المنصة الرمضانية</h1>
        <p className="auth-subtitle">تسجيل الدخول إلى حسابك</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input type="email" className="form-input" value={email}
              onChange={(e) => setEmail(e.target.value)} required placeholder="example@email.com" dir="ltr" />
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input type="password" className="form-input" value={password}
              onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" dir="ltr" />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <Link to="/forgot-password" className="auth-link">نسيت كلمة المرور؟</Link>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="auth-footer">
          ليس لديك حساب؟ <Link to="/register" className="auth-link">سجل الآن</Link>
        </div>
      </div>
    </div>
  );
}
