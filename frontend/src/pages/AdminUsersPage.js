import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === 'all' ? '' : tab;
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.users);
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

  const handleImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const res = await api.post('/admin/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      if (res.data.errors?.length) toast.error(`أخطاء: ${res.data.errors.length}`);
      setImportFile(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ'); }
  };

  const downloadTemplate = async () => {
    const res = await api.get('/admin/import-template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'import_template.xlsx'; a.click();
  };

  const statusLabel = { active: 'نشط', pending: 'قيد المراجعة', rejected: 'مرفوض', withdrawn: 'منسحب' };
  const statusBadge = { active: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger', withdrawn: 'badge-info' };
  const roleLabel = { participant: 'مشارك', supervisor: 'مشرف', super_admin: 'سوبر آدمن' };

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
          <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => setImportFile(e.target.files[0])} />
        </label>
        {importFile && <button className="btn btn-primary btn-sm" onClick={handleImport}>تأكيد الاستيراد</button>}
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
                {users.map((u) => (
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
    </div>
  );
}
