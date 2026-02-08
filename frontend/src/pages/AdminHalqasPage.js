import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function AdminHalqasPage() {
  const [halqas, setHalqas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editHalqa, setEditHalqa] = useState(null);
  const [newName, setNewName] = useState('');
  const [newSupervisor, setNewSupervisor] = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hRes, uRes] = await Promise.all([
        api.get('/admin/halqas'),
        api.get('/admin/users?status=active'),
      ]);
      setHalqas(hRes.data.halqas);
      setUsers(uRes.data.users);
    } catch { toast.error('خطأ'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const createHalqa = async () => {
    if (!newName.trim()) { toast.error('اسم الحلقة مطلوب'); return; }
    try {
      await api.post('/admin/halqa', { name: newName, supervisor_id: newSupervisor || null });
      toast.success('تم إنشاء الحلقة');
      setShowCreate(false); setNewName(''); setNewSupervisor('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ'); }
  };

  const updateHalqa = async () => {
    try {
      await api.put(`/admin/halqa/${editHalqa.id}`, {
        name: editHalqa.name,
        supervisor_id: editHalqa.supervisor_id || null,
      });
      toast.success('تم تحديث الحلقة');
      setEditHalqa(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'خطأ'); }
  };

  const openAssign = (halqa) => {
    const currentMembers = users.filter((u) => u.halqa_id === halqa.id).map((u) => u.id);
    setSelectedMembers(currentMembers);
    setAssignModal(halqa);
  };

  const saveAssign = async () => {
    try {
      await api.post(`/admin/halqa/${assignModal.id}/assign-members`, { user_ids: selectedMembers });
      // Remove members not in list
      const otherUsers = users.filter((u) => u.halqa_id === assignModal.id && !selectedMembers.includes(u.id));
      for (const u of otherUsers) {
        await api.post(`/admin/user/${u.id}/assign-halqa`, { halqa_id: null });
      }
      toast.success('تم تعيين المشاركين');
      setAssignModal(null);
      fetchData();
    } catch { toast.error('خطأ'); }
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const supervisors = users.filter((u) => u.role === 'supervisor' || u.role === 'super_admin');
  const unassignedUsers = users.filter((u) => !u.halqa_id || u.halqa_id === assignModal?.id);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <h1 className="page-title">🔵 إدارة الحلقات</h1>
      <p className="page-subtitle">إنشاء وإدارة الحلقات وتعيين المشاركين والمشرفين</p>

      <button className="btn btn-primary mb-2" onClick={() => setShowCreate(true)}>+ إنشاء حلقة جديدة</button>

      {halqas.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🔵</div><div className="empty-state-text">لا توجد حلقات بعد</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {halqas.map((h) => (
            <div className="card" key={h.id}>
              <div className="card-header">
                <div className="card-title">📌 {h.name}</div>
                <div className="btn-group">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditHalqa({ ...h })}>✏️</button>
                  <button className="btn btn-gold btn-sm" onClick={() => openAssign(h)}>👥 تعيين</button>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <p>المشرف: <strong>{h.supervisor_name || 'غير محدد'}</strong></p>
                <p>عدد الأعضاء: <strong>{h.member_count}</strong></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">إنشاء حلقة جديدة</div>
            <div className="form-group">
              <label className="form-label">اسم الحلقة</label>
              <input className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">المشرف</label>
              <select className="form-select" value={newSupervisor} onChange={(e) => setNewSupervisor(e.target.value)}>
                <option value="">بدون مشرف</option>
                {supervisors.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={createHalqa}>إنشاء</button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editHalqa && (
        <div className="modal-overlay" onClick={() => setEditHalqa(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">تعديل الحلقة</div>
            <div className="form-group">
              <label className="form-label">اسم الحلقة</label>
              <input className="form-input" value={editHalqa.name}
                onChange={(e) => setEditHalqa((h) => ({ ...h, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">المشرف</label>
              <select className="form-select" value={editHalqa.supervisor_id || ''}
                onChange={(e) => setEditHalqa((h) => ({ ...h, supervisor_id: e.target.value ? parseInt(e.target.value) : null }))}>
                <option value="">بدون مشرف</option>
                {supervisors.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={updateHalqa}>حفظ</button>
              <button className="btn btn-secondary" onClick={() => setEditHalqa(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Members Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-title">تعيين مشاركين لحلقة: {assignModal.name}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              اختر المشاركين ({selectedMembers.length} محدد)
            </p>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {users.map((u) => (
                <label key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selectedMembers.includes(u.id) ? 'var(--accent-glow)' : 'transparent',
                }}>
                  <input type="checkbox" checked={selectedMembers.includes(u.id)}
                    onChange={() => toggleMember(u.id)} />
                  <span style={{ fontSize: '0.85rem' }}>
                    {u.full_name}
                    {u.halqa_id && u.halqa_id !== assignModal.id && (
                      <span className="badge badge-warning" style={{ marginRight: 8 }}>في حلقة أخرى</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={saveAssign}>💾 حفظ التعيين</button>
              <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
