import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function SupervisorPage() {
  const [tab, setTab] = useState('daily');
  const [halqa, setHalqa] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberCards, setMemberCards] = useState([]);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === 'daily') {
      setLoading(true);
      api.get(`/supervisor/daily-summary?date=${targetDate}`)
        .then((res) => { setDailySummary(res.data); setHalqa(res.data.halqa); })
        .catch((err) => toast.error(err.response?.data?.error || 'خطأ'))
        .finally(() => setLoading(false));
    } else if (tab === 'weekly') {
      setLoading(true);
      api.get('/supervisor/weekly-summary')
        .then((res) => { setWeeklySummary(res.data); setHalqa(res.data.halqa); })
        .catch((err) => toast.error(err.response?.data?.error || 'خطأ'))
        .finally(() => setLoading(false));
    }
  }, [tab, targetDate]);

  const viewMemberCards = async (memberId) => {
    try {
      const res = await api.get(`/supervisor/member/${memberId}/cards`);
      setSelectedMember(res.data.member);
      setMemberCards(res.data.cards);
    } catch (err) {
      toast.error('خطأ في تحميل البطاقات');
    }
  };

  return (
    <div>
      <h1 className="page-title">👁 إشراف الحلقة</h1>
      <p className="page-subtitle">{halqa ? `حلقة: ${halqa.name}` : 'جاري التحميل...'}</p>

      <div className="tabs">
        <button className={`tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>الملخص اليومي</button>
        <button className={`tab ${tab === 'weekly' ? 'active' : ''}`} onClick={() => setTab('weekly')}>الملخص الأسبوعي</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : tab === 'daily' && dailySummary ? (
        <div>
          <div className="form-group" style={{ maxWidth: 220 }}>
            <label className="form-label">التاريخ</label>
            <input type="date" className="form-input" value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)} dir="ltr" />
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{dailySummary.submitted_count}</div>
              <div className="stat-label">سلّموا البطاقة ✅</div>
            </div>
            <div className="stat-card">
              <div className="stat-value danger">{dailySummary.not_submitted_count}</div>
              <div className="stat-label">لم يسلّموا ❌</div>
            </div>
            <div className="stat-card">
              <div className="stat-value gold">{dailySummary.total_members}</div>
              <div className="stat-label">إجمالي الأعضاء</div>
            </div>
          </div>

          {/* Submitted */}
          {dailySummary.submitted.length > 0 && (
            <div className="card mb-2">
              <div className="card-title mb-2">✅ سلّموا البطاقة ({dailySummary.submitted.length})</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>الاسم</th><th>المجموع</th><th>النسبة</th><th>وقت التسليم</th><th>التفاصيل</th></tr>
                  </thead>
                  <tbody>
                    {dailySummary.submitted.map(({ member, card }) => (
                      <tr key={member.id}>
                        <td>{member.full_name}</td>
                        <td>{card.total_score}</td>
                        <td><span className="badge badge-success">{card.percentage}%</span></td>
                        <td style={{ fontSize: '0.7rem' }}>{new Date(card.updated_at).toLocaleString('ar-EG')}</td>
                        <td><button className="btn btn-secondary btn-sm" onClick={() => viewMemberCards(member.id)}>عرض</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Not Submitted */}
          {dailySummary.not_submitted.length > 0 && (
            <div className="card">
              <div className="card-title mb-2">❌ لم يسلّموا ({dailySummary.not_submitted.length})</div>
              <div className="table-container">
                <table>
                  <thead><tr><th>الاسم</th><th>الهاتف</th></tr></thead>
                  <tbody>
                    {dailySummary.not_submitted.map((m) => (
                      <tr key={m.id}>
                        <td>{m.full_name}</td>
                        <td dir="ltr">{m.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : tab === 'weekly' && weeklySummary ? (
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            من {weeklySummary.week_start} إلى {weeklySummary.week_end}
          </p>
          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>#</th><th>الاسم</th><th>البطاقات</th><th>المجموع</th><th>النسبة</th><th>التفاصيل</th></tr></thead>
                <tbody>
                  {weeklySummary.summary.map((s, i) => (
                    <tr key={s.member.id}>
                      <td>{i + 1}</td>
                      <td>{s.member.full_name}</td>
                      <td>{s.cards_submitted}</td>
                      <td>{s.total_score}</td>
                      <td><span className="badge badge-success">{s.percentage}%</span></td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => viewMemberCards(s.member.id)}>عرض</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Member Cards Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="flex-between mb-2">
              <div className="modal-title" style={{ margin: 0 }}>📋 بطاقات {selectedMember.full_name}</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMember(null)}>✕</button>
            </div>
            {memberCards.length === 0 ? (
              <div className="empty-state"><div className="empty-state-text">لا توجد بطاقات</div></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>التاريخ</th><th>المجموع</th><th>النسبة</th><th>آخر تعديل</th></tr></thead>
                  <tbody>
                    {memberCards.map((c) => (
                      <tr key={c.id}>
                        <td>{c.date}</td>
                        <td>{c.total_score} / {c.max_score}</td>
                        <td><span className="badge badge-success">{c.percentage}%</span></td>
                        <td style={{ fontSize: '0.7rem' }}>{new Date(c.updated_at).toLocaleString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
