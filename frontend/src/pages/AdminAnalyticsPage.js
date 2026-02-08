import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState({ results: [], summary: {} });
  const [halqas, setHalqas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    gender: '', halqa_id: '', member: '', supervisor: '',
    min_pct: '', max_pct: '', period: 'all', sort_by: 'score', sort_order: 'desc',
  });

  useEffect(() => {
    api.get('/admin/halqas').then((res) => setHalqas(res.data.halqas)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    api.get(`/admin/analytics?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch(() => toast.error('خطأ'))
      .finally(() => setLoading(false));
  }, [filters]);

  const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const exportData = async (format) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('format', format);
      const res = await api.get(`/admin/export?${params.toString()}`, {
        responseType: format === 'xlsx' ? 'blob' : 'text',
      });
      const blob = format === 'xlsx' ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ramadan_results.${format}`;
      a.click();
      toast.success('تم التصدير بنجاح');
    } catch { toast.error('خطأ في التصدير'); }
  };

  return (
    <div>
      <h1 className="page-title">📈 التحليلات والنقاط</h1>
      <p className="page-subtitle">داشبورد النقاط والتحليلات المتقدمة</p>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{data.summary.total_active || 0}</div>
          <div className="stat-label">مشاركون نشطون</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value gold">{data.summary.total_pending || 0}</div>
          <div className="stat-label">طلبات معلقة</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔵</div>
          <div className="stat-value">{data.summary.total_halqas || 0}</div>
          <div className="stat-label">عدد الحلقات</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-value gold">{data.summary.filtered_count || 0}</div>
          <div className="stat-label">نتائج الفلترة</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-input" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
          <option value="all">كل الفترة</option>
          <option value="weekly">أسبوعي</option>
          <option value="monthly">شهري</option>
        </select>
        <select className="filter-input" value={filters.gender} onChange={(e) => updateFilter('gender', e.target.value)}>
          <option value="">كل الجنسين</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </select>
        <select className="filter-input" value={filters.halqa_id} onChange={(e) => updateFilter('halqa_id', e.target.value)}>
          <option value="">كل الحلقات</option>
          {halqas.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input className="filter-input" placeholder="اسم المشارك" value={filters.member}
          onChange={(e) => updateFilter('member', e.target.value)} />
        <input className="filter-input" placeholder="اسم المشرف" value={filters.supervisor}
          onChange={(e) => updateFilter('supervisor', e.target.value)} />
        <input className="filter-input" type="number" placeholder="أدنى %" style={{ width: 80 }}
          value={filters.min_pct} onChange={(e) => updateFilter('min_pct', e.target.value)} />
        <input className="filter-input" type="number" placeholder="أعلى %" style={{ width: 80 }}
          value={filters.max_pct} onChange={(e) => updateFilter('max_pct', e.target.value)} />
        <select className="filter-input" value={filters.sort_by} onChange={(e) => updateFilter('sort_by', e.target.value)}>
          <option value="score">ترتيب بالنقاط</option>
          <option value="name">ترتيب أبجدي</option>
        </select>
        <select className="filter-input" value={filters.sort_order} onChange={(e) => updateFilter('sort_order', e.target.value)}>
          <option value="desc">تنازلي</option>
          <option value="asc">تصاعدي</option>
        </select>
      </div>

      {/* Export */}
      <div className="btn-group mb-2">
        <button className="btn btn-gold btn-sm" onClick={() => exportData('xlsx')}>📥 تصدير XLSX</button>
        <button className="btn btn-secondary btn-sm" onClick={() => exportData('csv')}>📥 تصدير CSV</button>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : data.results.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">لا توجد نتائج</div></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>الاسم</th><th>الجنس</th><th>الحلقة</th><th>المشرف</th>
                  <th>المجموع</th><th>الحد الأعلى</th><th>النسبة</th><th>البطاقات</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.user_id}>
                    <td style={{ fontWeight: 700, color: r.rank <= 3 ? 'var(--gold)' : 'var(--text-muted)' }}>{r.rank}</td>
                    <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                    <td>{r.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                    <td>{r.halqa_name}</td>
                    <td>{r.supervisor_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.total_score}</td>
                    <td>{r.max_score}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="progress-bar" style={{ width: 60, height: 6 }}>
                          <div className="progress-fill green" style={{ width: `${r.percentage}%` }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{r.percentage}%</span>
                      </div>
                    </td>
                    <td>{r.cards_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
