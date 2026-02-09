import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  Eye, CheckCircle, XCircle, ClipboardList, Trophy, Save,
  BookOpen, Heart, Building2, Moon, Sun, Gem,
  Headphones, BookMarked, Lightbulb, HeartHandshake, Star, X, Filter,
} from 'lucide-react';

const SCORE_FIELDS = [
  { key: 'quran', label: 'وِرد القرآن', icon: <BookOpen size={14} /> },
  { key: 'duas', label: 'الأدعية', icon: <Heart size={14} /> },
  { key: 'taraweeh', label: 'صلاة التراويح', icon: <Building2 size={14} /> },
  { key: 'tahajjud', label: 'التهجد والوتر', icon: <Moon size={14} /> },
  { key: 'duha', label: 'صلاة الضحى', icon: <Sun size={14} /> },
  { key: 'rawatib', label: 'السنن الرواتب', icon: <Gem size={14} /> },
  { key: 'main_lesson', label: 'المقطع الأساسي', icon: <Headphones size={14} /> },
  { key: 'required_lesson', label: 'المقطع الواجب', icon: <BookMarked size={14} /> },
  { key: 'enrichment_lesson', label: 'المقطع الإثرائي', icon: <Lightbulb size={14} /> },
  { key: 'charity_worship', label: 'عبادة متعدية للغير', icon: <HeartHandshake size={14} /> },
  { key: 'extra_work', label: 'أعمال إضافية', icon: <Star size={14} /> },
];

export default function SupervisorPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [tab, setTab] = useState('daily');
  const [halqas, setHalqas] = useState([]);
  const [selectedHalqaId, setSelectedHalqaId] = useState('');
  const [halqa, setHalqa] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberCards, setMemberCards] = useState([]);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Card detail/edit state
  const [cardMember, setCardMember] = useState(null);
  const [cardDetail, setCardDetail] = useState(null);
  const [cardDate, setCardDate] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch halqas list for super_admin
  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/supervisor/halqas')
        .then((res) => setHalqas(res.data.halqas))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  const halqaParam = selectedHalqaId ? `&halqa_id=${selectedHalqaId}` : '';

  useEffect(() => {
    setLoading(true);
    if (tab === 'daily') {
      api.get(`/supervisor/daily-summary?date=${targetDate}${halqaParam}`)
        .then((res) => { setDailySummary(res.data); setHalqa(res.data.halqa); })
        .catch((err) => toast.error(err.response?.data?.detail || 'خطأ'))
        .finally(() => setLoading(false));
    } else if (tab === 'weekly') {
      api.get(`/supervisor/weekly-summary?_=1${halqaParam}`)
        .then((res) => { setWeeklySummary(res.data); setHalqa(res.data.halqa); })
        .catch((err) => toast.error(err.response?.data?.detail || 'خطأ'))
        .finally(() => setLoading(false));
    } else if (tab === 'leaderboard') {
      api.get(`/supervisor/leaderboard?_=1${halqaParam}`)
        .then((res) => { setLeaderboard(res.data.leaderboard); setHalqa(res.data.halqa); })
        .catch((err) => toast.error(err.response?.data?.detail || 'خطأ'))
        .finally(() => setLoading(false));
    }
  }, [tab, targetDate, halqaParam]);

  const viewMemberCards = async (memberId) => {
    try {
      const res = await api.get(`/supervisor/member/${memberId}/cards`);
      setSelectedMember(res.data.member);
      setMemberCards(res.data.cards);
    } catch {
      toast.error('خطأ في تحميل البطاقات');
    }
  };

  const openCardDetail = async (memberId, dateStr) => {
    try {
      const res = await api.get(`/supervisor/member/${memberId}/card/${dateStr}`);
      setCardMember(res.data.member);
      setCardDate(dateStr);
      if (res.data.card) {
        setCardDetail(res.data.card);
        setEditData({ ...res.data.card });
      } else {
        const empty = {};
        SCORE_FIELDS.forEach((f) => { empty[f.key] = 0; });
        empty.extra_work_description = '';
        setCardDetail(null);
        setEditData(empty);
      }
      setEditMode(false);
    } catch {
      toast.error('خطأ في تحميل البطاقة');
    }
  };

  const handleSaveCard = async () => {
    setSaving(true);
    try {
      const payload = { date: cardDate };
      SCORE_FIELDS.forEach((f) => { payload[f.key] = parseFloat(editData[f.key]) || 0; });
      payload.extra_work_description = editData.extra_work_description || '';

      const res = await api.put(`/supervisor/member/${cardMember.id}/card/${cardDate}`, payload);
      toast.success(res.data.message);
      setCardDetail(res.data.card);
      setEditData({ ...res.data.card });
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطأ في حفظ البطاقة');
    } finally {
      setSaving(false);
    }
  };

  const closeCardDetail = () => {
    setCardMember(null);
    setCardDetail(null);
    setEditMode(false);
  };

  const setScore = (field, value) => {
    const num = parseFloat(value);
    if (value === '' || value === '-') {
      setEditData((d) => ({ ...d, [field]: '' }));
      return;
    }
    if (!isNaN(num) && num >= 0 && num <= 10) {
      setEditData((d) => ({ ...d, [field]: num }));
    }
  };

  return (
    <div>
      <h1 className="page-title"><Eye size={22} /> إشراف الحلقة</h1>
      <p className="page-subtitle">
        {isSuperAdmin
          ? (halqa ? `حلقة: ${halqa.name}` : 'جميع الحلقات')
          : (halqa ? `حلقة: ${halqa.name}` : 'جاري التحميل...')}
      </p>

      {isSuperAdmin && (
        <div className="filters-bar mb-2">
          <Filter size={16} />
          <select className="filter-input" value={selectedHalqaId}
            onChange={(e) => setSelectedHalqaId(e.target.value)}>
            <option value="">كل الحلقات</option>
            {halqas.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
          <ClipboardList size={14} /> الملخص اليومي
        </button>
        <button className={`tab ${tab === 'weekly' ? 'active' : ''}`} onClick={() => setTab('weekly')}>
          <ClipboardList size={14} /> الملخص الأسبوعي
        </button>
        <button className={`tab ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>
          <Trophy size={14} /> ترتيب الحلقة
        </button>
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
              <div className="stat-icon"><CheckCircle size={20} /></div>
              <div className="stat-value">{dailySummary.submitted_count}</div>
              <div className="stat-label">سلّموا البطاقة</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><XCircle size={20} /></div>
              <div className="stat-value danger">{dailySummary.not_submitted_count}</div>
              <div className="stat-label">لم يسلّموا</div>
            </div>
            <div className="stat-card">
              <div className="stat-value gold">{dailySummary.total_members}</div>
              <div className="stat-label">إجمالي الأعضاء</div>
            </div>
          </div>

          {dailySummary.submitted.length > 0 && (
            <div className="card mb-2">
              <div className="card-title mb-2"><CheckCircle size={16} /> سلّموا البطاقة ({dailySummary.submitted.length})</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>الاسم</th><th>المجموع</th><th>النسبة</th><th>التفاصيل</th></tr>
                  </thead>
                  <tbody>
                    {dailySummary.submitted.map(({ member, card }) => (
                      <tr key={member.id}>
                        <td>{member.full_name}</td>
                        <td>{card.total_score}</td>
                        <td><span className="badge badge-success">{card.percentage}%</span></td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openCardDetail(member.id, targetDate)}>
                            عرض / تعديل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dailySummary.not_submitted.length > 0 && (
            <div className="card">
              <div className="card-title mb-2"><XCircle size={16} /> لم يسلّموا ({dailySummary.not_submitted.length})</div>
              <div className="table-container">
                <table>
                  <thead><tr><th>الاسم</th><th>الهاتف</th><th>إجراء</th></tr></thead>
                  <tbody>
                    {dailySummary.not_submitted.map((m) => (
                      <tr key={m.id}>
                        <td>{m.full_name}</td>
                        <td dir="ltr">{m.phone}</td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => openCardDetail(m.id, targetDate)}>
                            إدخال بطاقة
                          </button>
                        </td>
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
      ) : tab === 'leaderboard' ? (
        <div className="card">
          {leaderboard.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Trophy size={48} /></div>
              <div className="empty-state-text">لا توجد بيانات بعد</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>#</th><th>الاسم</th><th>المجموع</th><th>البطاقات</th><th>النسبة</th></tr>
                </thead>
                <tbody>
                  {leaderboard.map((r) => (
                    <tr key={r.user_id}>
                      <td style={{ fontWeight: 800, color: r.rank <= 3 ? 'var(--gold)' : 'var(--text-muted)' }}>
                        {r.rank}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.total_score}</td>
                      <td>{r.cards_count}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="progress-bar" style={{ width: 60, height: 6 }}>
                            <div className="progress-fill green" style={{ width: `${r.percentage}%` }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{r.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Member Cards History Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="flex-between mb-2">
              <div className="modal-title" style={{ margin: 0 }}>
                <ClipboardList size={18} /> بطاقات {selectedMember.full_name}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMember(null)}>
                <X size={16} />
              </button>
            </div>
            {memberCards.length === 0 ? (
              <div className="empty-state"><div className="empty-state-text">لا توجد بطاقات</div></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>التاريخ</th><th>المجموع</th><th>النسبة</th><th>التفاصيل</th></tr></thead>
                  <tbody>
                    {memberCards.map((c) => (
                      <tr key={c.id}>
                        <td>{c.date}</td>
                        <td>{c.total_score} / {c.max_score}</td>
                        <td><span className="badge badge-success">{c.percentage}%</span></td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            setSelectedMember(null);
                            openCardDetail(c.user_id, c.date);
                          }}>
                            عرض / تعديل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Detail / Edit Modal */}
      {cardMember && (
        <div className="modal-overlay" onClick={closeCardDetail}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="flex-between mb-2">
              <div className="modal-title" style={{ margin: 0 }}>
                بطاقة {cardMember.full_name} — {cardDate}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={closeCardDetail}>
                <X size={16} />
              </button>
            </div>

            {editMode ? (
              <>
                {SCORE_FIELDS.map((f) => (
                  <div key={f.key} style={{ padding: '0.35rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      {f.icon} {f.label}
                    </span>
                    <input
                      type="number" min="0" max="10" step="0.5"
                      value={editData[f.key] ?? 0}
                      onChange={(e) => setScore(f.key, e.target.value)}
                      style={{
                        width: 65, textAlign: 'center', padding: '0.3rem',
                        border: '1px solid var(--border)', borderRadius: 8,
                        fontSize: '0.9rem', fontWeight: 600, background: 'var(--background)',
                      }}
                    />
                  </div>
                ))}
                <div className="form-group mt-2">
                  <label className="form-label">وصف الأعمال الإضافية</label>
                  <textarea className="form-textarea" rows={2}
                    value={editData.extra_work_description || ''}
                    onChange={(e) => setEditData((d) => ({ ...d, extra_work_description: e.target.value }))}
                  />
                </div>
                <div className="btn-group mt-2">
                  <button className="btn btn-primary" onClick={handleSaveCard} disabled={saving}>
                    <Save size={14} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setEditMode(false)}>إلغاء</button>
                </div>
              </>
            ) : (
              <>
                {cardDetail ? (
                  <>
                    <div className="flex-between mb-2">
                      <span style={{ fontWeight: 600 }}>المجموع</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent)' }}>
                        {cardDetail.total_score} / {cardDetail.max_score} ({cardDetail.percentage}%)
                      </span>
                    </div>
                    <div className="progress-bar mb-2">
                      <div className="progress-fill green" style={{ width: `${cardDetail.percentage}%` }} />
                    </div>
                    {SCORE_FIELDS.map((f) => (
                      <div key={f.key} style={{ padding: '0.3rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {f.icon} {f.label}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 40, textAlign: 'center' }}>
                          {cardDetail[f.key] ?? 0}
                        </span>
                      </div>
                    ))}
                    {cardDetail.extra_work_description && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 8, fontSize: '0.85rem' }}>
                        <strong>وصف الأعمال الإضافية:</strong> {cardDetail.extra_work_description}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: '1rem 0' }}>
                    <div className="empty-state-text">لم يتم تسجيل بطاقة لهذا اليوم</div>
                  </div>
                )}
                <div className="mt-2">
                  <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                    {cardDetail ? 'تعديل البطاقة' : 'إدخال بطاقة'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
