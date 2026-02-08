import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const FIELDS = [
  { key: 'quran', label: 'وِرد القرآن', icon: '📖' },
  { key: 'duas', label: 'الأدعية', icon: '🤲' },
  { key: 'taraweeh', label: 'صلاة التراويح', icon: '🕌' },
  { key: 'tahajjud', label: 'التهجد والوتر', icon: '🌙' },
  { key: 'duha', label: 'صلاة الضحى', icon: '☀️' },
  { key: 'rawatib', label: 'السنن الرواتب', icon: '📿' },
  { key: 'main_lesson', label: 'المقطع الأساسي', icon: '🎧' },
  { key: 'required_lesson', label: 'المقطع الواجب', icon: '📚' },
  { key: 'enrichment_lesson', label: 'المقطع الإثرائي', icon: '💡' },
  { key: 'charity_worship', label: 'عبادة متعدية للغير', icon: '🤝' },
  { key: 'extra_work', label: 'أعمال إضافية', icon: '⭐' },
];

function formatDate(d) {
  return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function toISODate(d) {
  return d.toISOString().split('T')[0];
}

export default function DailyCardPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [card, setCard] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/participant/card/${toISODate(currentDate)}`);
      if (res.data.card) {
        setCard(res.data.card);
      } else {
        const empty = {};
        FIELDS.forEach((f) => { empty[f.key] = 0; });
        empty.extra_work_description = '';
        setCard(empty);
      }
    } catch {
      toast.error('خطأ في تحميل البطاقة');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setCurrentDate(d);
  };

  const setScore = (field, value) => {
    setCard((c) => ({ ...c, [field]: parseInt(value) }));
  };

  const totalScore = FIELDS.reduce((sum, f) => sum + (card[f.key] || 0), 0);
  const maxScore = FIELDS.length * 10;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { date: toISODate(currentDate) };
      FIELDS.forEach((f) => { payload[f.key] = card[f.key] || 0; });
      payload.extra_work_description = card.extra_work_description || '';

      await api.post('/participant/card', payload);
      toast.success('تم حفظ البطاقة بنجاح ✅');
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطأ في حفظ البطاقة');
    } finally {
      setSaving(false);
    }
  };

  const isToday = toISODate(currentDate) === toISODate(new Date());
  const isFuture = currentDate > new Date();

  return (
    <div>
      <h1 className="page-title">📝 البطاقة الرمضانية</h1>
      <p className="page-subtitle">سجّل إنجازك اليومي</p>

      {/* Date Navigator */}
      <div className="date-nav">
        <button className="date-nav-btn" onClick={prevDay}>→</button>
        <span className="date-nav-current">
          {formatDate(currentDate)} {isToday && <span className="badge badge-success" style={{ marginRight: 8 }}>اليوم</span>}
        </span>
        <button className="date-nav-btn" onClick={nextDay} disabled={isFuture}>←</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <>
          {/* Score Summary */}
          <div className="card mb-2">
            <div className="flex-between">
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>المجموع</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>{totalScore} / {maxScore}</span>
            </div>
            <div className="progress-bar mt-1">
              <div className="progress-fill green" style={{ width: `${percentage}%` }} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)' }}>
              {percentage}%
            </div>
          </div>

          {/* Score Fields */}
          <div className="card mb-2">
            {FIELDS.map((f) => (
              <div className="score-field" key={f.key}>
                <div className="score-field-header">
                  <span className="score-field-label">{f.icon} {f.label}</span>
                  <span className="score-field-value">{card[f.key] || 0}</span>
                </div>
                <input
                  type="range" className="score-slider" min="0" max="10" step="1"
                  value={card[f.key] || 0}
                  onChange={(e) => setScore(f.key, e.target.value)}
                />
              </div>
            ))}

            {/* Extra description */}
            <div className="form-group mt-2">
              <label className="form-label">وصف الأعمال الإضافية (اختياري)</label>
              <textarea className="form-textarea"
                value={card.extra_work_description || ''}
                onChange={(e) => setCard((c) => ({ ...c, extra_work_description: e.target.value }))}
                placeholder="اكتب وصفاً للأعمال الإضافية..."
              />
            </div>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : '💾 حفظ البطاقة'}
          </button>
        </>
      )}
    </div>
  );
}
