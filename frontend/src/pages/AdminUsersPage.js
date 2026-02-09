import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Pagination, { paginate } from '../components/Pagination';

export default function AdminUsersPage() {
  const [tab, setTab] = useState('pending');
  const [users, setUsers] = useState([]);
  const [halqas, setHalqas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [resetPwd, setResetPwd] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === 'all' ? '' : tab;
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.users);
      setPage(1);
    } catch { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, [tab, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    api.get('/admin/halqas').then((res) => setHalqas(res.data.halqas)).catch(() => {});
  }, []);

  const approve = async (id) => {
    await api.post(`/admin/registration/${id}/approve`);
    toast.success('تم قبول الطلب');
    fetchUsers();
  };

  const reject = async (id) => {
    await api.post(`/admin/registration/${id}/reject`, { note: rejectNote });
    toast.success('تم رفض الطلب');
    setShowRejectModal(null);
    setRejectNote('');
    fetchUsers();
  };

  const withdraw = async (id) => {
    await api.post(`/admin/user/${id}/withdraw`);
    toast.success('تم سحب المشارك');
    fetchUsers();
  };

  const activate = async (id) => {
    await api.post(`/admin/user/${id}/activate`);
    toast.success('تم تفعيل المشارك');
    fetchUsers();
  };

  const setRole = async (id, role) => {
    try {
      await api.post(`/admin/user/${id}/set-role`, { role });
      toast.success('تم تحديث الصلاحية');
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ'); }
  };

  const openEdit = (u) => {
    setSelectedUser(u);
    setEditForm({
      full_name: u.full_name, gender: u.gender, age: u.age,
      phone: u.phone, country: u.country, halqa_id: u.halqa_id || '',
    });
  };

  const saveUserEdit = async () => {
    try {
      await api.put(`/admin/user/${selectedUser.id}`, editForm);
      toast.success('تم تحديث البيانات');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ'); }
  };

  const resetPassword = async (id) => {
    if (!resetPwd || resetPwd.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    try {
      await api.post(`/admin/user/${id}/reset-password`, { new_password: resetPwd });
      toast.success('تم إعادة تعيين كلمة المرور');
      setResetPwd('');
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ'); }
  };

  const assignHalqa = async (userId, halqaId) => {
    await api.post(`/admin/user/${userId}/assign-halqa`, { halqa_id: halqaId || null });
    toast.success('تم تعيين الحلقة');
    fetchUsers();
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const validRows = rows.filter((r) => {
          const name = String(r['الاسم'] || '').trim();
          const email = String(r['البريد'] || '').trim();
          return name && email;
        });
        if (!validRows.length) { toast.error('الملف فارغ أو لا يحتوي بيانات صالحة'); setImportFile(null); return; }
        const genderCount = { male: 0, female: 0 };
        validRows.forEach((r) => {
          const g = String(r['الجنس'] || '').trim().toLowerCase();
          if (g === 'ذكر' || g === 'male') genderCount.male++;
          else if (g === 'أنثى' || g === 'female') genderCount.female++;
        });
        setImportPreview({ rows: validRows, genderCount });
      } catch { toast.error('خطأ في قراءة الملف'); setImportFile(null); }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await api.post('/admin/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      setImportFile(null);
      setImportPreview(null);
      if (res.data.errors?.length) {
        setImportResult(res.data);
      }
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || 'خطأ'); }
    finally { setImporting(false); }
  };

  const cancelImport = () => {
    setImportFile(null);
    setImportPreview(null);
  };

  const downloadTemplate = async () => {
    const res = await api.get('/admin/import-template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'import_template.xlsx'; a.click();
  };

  const statusLabel = { active: 'نشط', pending: 'قيد المراجعة', rejected: 'مرفوض', withdrawn: 'منسحب' };
  const statusBadge = { active: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger', withdrawn: 'badge-info' };
  const roleLabel = { participant: 'مشارك', supervisor: 'مشرف', super_admin: 'سوبر آدمن' };

  const { paged, totalPages, total } = paginate(users, page);

  return (
    <div>
      <h1 className="page-title">👥 إدارة المستخدمين</h1>
      <p className="page-subtitle">إدارة المشاركين وطلبات التسجيل</p>

      <div className="tabs">
        {['pending', 'active', 'rejected', 'withdrawn', 'all'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'الكل' : statusLabel[t]}
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <input className="filter-input" style={{ flex: 1, minWidth: 200 }} placeholder="🔍 بحث بالاسم أو البريد..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>📥 قالب الاستيراد</button>
        <label className="btn btn-gold btn-sm" style={{ cursor: 'pointer' }}>
          📤 استيراد Excel
          <input type="file" accept=".xlsx" style={{ display: 'none' }}
            onChange={(e) => { handleFileSelect(e.target.files[0]); e.target.value = ''; }} />
        </label>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">لا يوجد مستخدمون</div></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th><th>البريد</th><th>الجنس</th><th>الدولة</th>
                  <th>الحالة</th><th>الصلاحية</th><th>الحلقة</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td dir="ltr" style={{ fontSize: '0.75rem' }}>{u.email}</td>
                    <td>{u.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                    <td>{u.country}</td>
                    <td><span className={`badge ${statusBadge[u.status]}`}>{statusLabel[u.status]}</span></td>
                    <td><span className="badge badge-info">{roleLabel[u.role]}</span></td>
                    <td>
                      <select className="filter-input" style={{ minWidth: 100, padding: '0.3rem' }}
                        value={u.halqa_id || ''} onChange={(e) => assignHalqa(u.id, e.target.value ? parseInt(e.target.value) : null)}>
                        <option value="">بدون</option>
                        {halqas.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="btn-group">
                        {u.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => approve(u.id)}>قبول</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setShowRejectModal(u.id)}>رفض</button>
                          </>
                        )}
                        {(u.status === 'rejected' || u.status === 'withdrawn') && (
                          <button className="btn btn-primary btn-sm" onClick={() => activate(u.id)}>تفعيل</button>
                        )}
                        {u.status === 'active' && (
                          <button className="btn btn-danger btn-sm" onClick={() => withdraw(u.id)}>سحب</button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>✏️</button>
                        <select className="filter-input" style={{ minWidth: 80, padding: '0.3rem', fontSize: '0.7rem' }}
                          value={u.role} onChange={(e) => setRole(u.id, e.target.value)}>
                          <option value="participant">مشارك</option>
                          <option value="supervisor">مشرف</option>
                          <option value="super_admin">سوبر آدمن</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">رفض طلب التسجيل</div>
            <div className="form-group">
              <label className="form-label">ملاحظة الرفض (اختياري)</label>
              <textarea className="form-textarea" value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)} placeholder="سبب الرفض..." />
            </div>
            <div className="btn-group">
              <button className="btn btn-danger" onClick={() => reject(showRejectModal)}>تأكيد الرفض</button>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">تعديل بيانات {selectedUser.full_name}</div>

            <div className="form-group">
              <label className="form-label">الاسم</label>
              <input className="form-input" value={editForm.full_name || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الجنس</label>
                <select className="form-select" value={editForm.gender}
                  onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">العمر</label>
                <input type="number" className="form-input" value={editForm.age || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, age: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">الهاتف</label>
              <input className="form-input" dir="ltr" value={editForm.phone || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الدولة</label>
              <input className="form-input" value={editForm.country || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} />
            </div>

            {/* Reset Password */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <label className="form-label">إعادة تعيين كلمة المرور</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="form-input" dir="ltr" placeholder="كلمة المرور الجديدة"
                  value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
                <button className="btn btn-gold btn-sm" onClick={() => resetPassword(selectedUser.id)}>تعيين</button>
              </div>
            </div>

            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={saveUserEdit}>💾 حفظ التعديلات</button>
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {importPreview && (
        <div className="modal-overlay" onClick={cancelImport}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-title">معاينة ملف الاستيراد</div>

            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
              <div className="stat-card">
                <div className="stat-value">{importPreview.rows.length}</div>
                <div className="stat-label">إجمالي المشاركين</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{importPreview.genderCount.male}</div>
                <div className="stat-label">ذكور</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{importPreview.genderCount.female}</div>
                <div className="stat-label">إناث</div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              سيتم إضافة المشاركين في قائمة "قيد المراجعة" بكلمة مرور افتراضية (123456)
            </p>

            <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>الاسم</th><th>البريد</th><th>الجنس</th><th>الهاتف</th><th>الدولة</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r['الاسم'] || '-'}</td>
                      <td dir="ltr" style={{ fontSize: '0.75rem' }}>{r['البريد'] || '-'}</td>
                      <td>{r['الجنس'] || '-'}</td>
                      <td dir="ltr">{r['الهاتف'] || '-'}</td>
                      <td>{r['الدولة'] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>
                {importing ? 'جاري الاستيراد...' : `تأكيد استيراد ${importPreview.rows.length} مشارك`}
              </button>
              <button className="btn btn-secondary" onClick={cancelImport} disabled={importing}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Result Modal (errors) */}
      {importResult && (
        <div className="modal-overlay" onClick={() => setImportResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-title">نتيجة الاستيراد</div>
            <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '0.5rem' }}>{importResult.message}</p>
            {importResult.errors?.length > 0 && (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  أخطاء ({importResult.errors.length}):
                </p>
                <div style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--background)', borderRadius: 8, padding: '0.5rem' }}>
                  {importResult.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.2rem 0', borderBottom: '1px solid var(--border)' }}>
                      {err}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={() => setImportResult(null)}>حسناً</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
