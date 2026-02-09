import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  BookOpen, Heart, Building2, Moon, Sun, Gem,
  Headphones, BookMarked, Lightbulb, HeartHandshake, Star, Save,
} from 'lucide-react';

const FIELDS = [
  { key: 'quran', label: 'وِرد القرآن', icon: <BookOpen size={16} /> },
  { key: 'duas', label: 'الأدعية', icon: <Heart size={16} /> },
  { key: 'taraweeh', label: 'صلاة التراويح', icon: <Building2 size={16} /> },
  { key: 'tahajjud', label: 'التهجد والوتر', icon: <Moon size={16} /> },
  { key: 'duha', label: 'صلاة الضحى', icon: <Sun size={16} /> },
  { key: 'rawatib', label: 'السنن الرواتب', icon: <Gem size={16} /> },
  { key: 'main_lesson', label: 'المقطع الأساسي', icon: <Headphones size={16} /> },
  { key: 'required_lesson', label: 'المقطع الواجب', icon: <BookMarked size={16} /> },
  { key: 'enrichment_lesson', label: 'المقطع الإثرائي', icon: <Lightbulb size={16} /> },
  { key: 'charity_worship', label: 'عبادة متعدية للغير', icon: <HeartHandshake size={16} /> },
  { key: 'extra_work', label: 'أعمال إضافية', icon: <Star size={16} /> },
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
  const [submitted, setSubmitted] = useState(false);

  const fetchCard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/participant/card/${toISODate(currentDate)}`);
      if (res.data.card) {
        setCard(res.data.card);
        setSubmitted(true);
      } else {
        const empty = {};
        FIELDS.forEach((f) => { empty[f.key] = 0; });
        empty.extra_work_description = '';
        setCard(empty);
        setSubmitted(false);
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
    const num = parseFloat(value);
    if (value === '' || value === '-') {
      setCard((c) => ({ ...c, [field]: '' }));
      return;
    }
    if (!isNaN(num) && num >= 0 && num <= 10) {
      setCard((c) => ({ ...c, [field]: num }));
    }
  };

  const totalScore = FIELDS.reduce((sum, f) => sum + (parseFloat(card[f.key]) || 0), 0);
  const maxScore = FIELDS.length * 10;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { date: toISODate(currentDate) };
      FIELDS.forEach((f) => { payload[f.key] = parseFloat(card[f.key]) || 0; });
      payload.extra_work_description = card.extra_work_description || '';

      await api.post('/participant/card', payload);
      toast.success('تم حفظ البطاقة بنجاح');
      setSubmitted(true);
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
      <h1 className="page-title">البطاقة الرمضانية</h1>
      <p className="page-subtitle">سجّل إنجازك اليومي</p>

      {/* Date Navigator */}
      <div className="date-nav">
        <button className="date-nav-btn" onClick={prevDay}>&rarr;</button>
        <span className="date-nav-current">
          {formatDate(currentDate)} {isToday && <span className="badge badge-success" style={{ marginRight: 8 }}>اليوم</span>}
        </span>
        <button className="date-nav-btn" onClick={nextDay} disabled={isFuture}>&larr;</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : submitted ? (
        /* Read-only view for already submitted cards */
        <>
          <div className="card mb-2">
            <div className="flex-between">
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>المجموع</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>
                {card.total_score ?? totalScore} / {card.max_score ?? maxScore}
              </span>
            </div>
            <div className="progress-bar mt-1">
              <div className="progress-fill green" style={{ width: `${card.percentage ?? percentage}%` }} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)' }}>
              {card.percentage ?? percentage}%
            </div>
          </div>

          <div className="card mb-2">
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              تم تسجيل بطاقة هذا اليوم مسبقاً (للعرض فقط)
            </div>
            {FIELDS.map((f) => (
              <div key={f.key} className="score-field" style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  {f.icon} {f.label}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 40, textAlign: 'center' }}>
                  {card[f.key] ?? 0}
                </span>
              </div>
            ))}
            {card.extra_work_description && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 8, fontSize: '0.85rem' }}>
                <strong>وصف الأعمال الإضافية:</strong> {card.extra_work_description}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Editable form for new cards */
        <>
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

          <div className="card mb-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="score-field" style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  {f.icon} {f.label}
                </span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={card[f.key] ?? 0}
                  onChange={(e) => setScore(f.key, e.target.value)}
                  style={{
                    width: 65,
                    textAlign: 'center',
                    padding: '0.3rem',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    background: 'var(--background)',
                  }}
                />
              </div>
            ))}

            <div className="form-group mt-2">
              <label className="form-label">وصف الأعمال الإضافية (اختياري)</label>
              <textarea className="form-textarea"
                value={card.extra_work_description || ''}
                onChange={(e) => setCard((c) => ({ ...c, extra_work_description: e.target.value }))}
                placeholder="اكتب وصفاً للأعمال الإضافية..."
                rows={2}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            <Save size={16} style={{ marginLeft: 6 }} />
            {saving ? 'جاري الحفظ...' : 'حفظ البطاقة'}
          </button>
        </>
      )}
    </div>
  );
}
