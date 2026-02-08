import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/participant/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <h1 className="page-title">أهلاً {user?.full_name} 🌙</h1>
      <p className="page-subtitle">مرحباً بك في البرنامج الرمضاني — واصل إنجازك اليومي</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats?.today_percentage || 0}%</div>
          <div className="stat-label">إنجاز اليوم</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value gold">{stats?.week_percentage || 0}%</div>
          <div className="stat-label">إنجاز الأسبوع</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-value">{stats?.rank || '-'}</div>
          <div className="stat-label">ترتيبك من {stats?.total_participants || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value gold">{stats?.overall_total || 0}</div>
          <div className="stat-label">مجموع نقاطك</div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="card mb-2">
        <div className="card-header">
          <div className="card-title">📈 نسبة الإنجاز الكلية</div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>
            {stats?.overall_percentage || 0}%
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill green" style={{ width: `${stats?.overall_percentage || 0}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>عدد البطاقات: {stats?.cards_count || 0}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-title mb-2">⚡ إجراءات سريعة</div>
        <div className="btn-group">
          <Link to="/daily-card" className="btn btn-primary">📝 تعبئة بطاقة اليوم</Link>
          <Link to="/leaderboard" className="btn btn-gold">🏆 الترتيب العام</Link>
          <Link to="/profile" className="btn btn-secondary">👤 الملف الشخصي</Link>
        </div>
      </div>

      {/* Supervisor Info */}
      {user?.supervisor_name && (
        <div className="card mt-2">
          <div className="card-title mb-2">👁 معلومات الإشراف</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <p><strong>المشرف:</strong> {user.supervisor_name}</p>
            <p><strong>الهاتف:</strong> {user.supervisor_phone}</p>
            <p><strong>الحلقة:</strong> {user.halqa_name || 'غير محدد'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
