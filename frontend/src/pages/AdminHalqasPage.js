import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { CircleDot, Pin, Pencil, Users, Save, Search, X, UserPlus, UserMinus, ArrowLeftRight, CheckCircle } from 'lucide-react';
import Pagination, { paginate } from '../components/Pagination';

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

  // Assign modal filters
  const [assignSearch, setAssignSearch] = useState('');
  const [assignGender, setAssignGender] = useState('');
  const [assignSort, setAssignSort] = useState('asc');
  const [assignPage, setAssignPage] = useState(1);
  const [confirmAssign, setConfirmAssign] = useState(null);

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
    setAssignSearch('');
    setAssignGender('');
    setAssignSort('asc');
    setAssignPage(1);
    setAssignModal(halqa);
  };

  const prepareConfirm = () => {
    const currentIds = users.filter((u) => u.halqa_id === assignModal.id).map((u) => u.id);
    const added = selectedMembers.filter((id) => !currentIds.includes(id));
    const removed = currentIds.filter((id) => !selectedMembers.includes(id));
    const movedFromOther = added.filter((id) => {
      const u = users.find((x) => x.id === id);
      return u && u.halqa_id && u.halqa_id !== assignModal.id;
    });
    const addedNew = added.filter((id) => !movedFromOther.includes(id));

    const getName = (id) => users.find((u) => u.id === id)?.full_name || '';
    const getHalqa = (id) => users.find((u) => u.id === id)?.halqa_name || '';

    setConfirmAssign({
      added: addedNew.map((id) => getName(id)),
      moved: movedFromOther.map((id) => ({ name: getName(id), from: getHalqa(id) })),
      removed: removed.map((id) => getName(id)),
      unchanged: selectedMembers.length - addedNew.length - movedFromOther.length,
    });
  };

  const saveAssign = async () => {
    try {
      await api.post(`/admin/halqa/${assignModal.id}/assign-members`, { user_ids: selectedMembers });
      const otherUsers = users.filter((u) => u.halqa_id === assignModal.id && !selectedMembers.includes(u.id));
      for (const u of otherUsers) {
        await api.post(`/admin/user/${u.id}/assign-halqa`, { halqa_id: null });
      }
      toast.success('تم تعيين المشاركين');
      setConfirmAssign(null);
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

  // Filter, sort, and paginate users for assign modal
  const genderMatches = (userGender, filterGender) => {
    if (filterGender === 'male') return ['male', 'ذكر'].includes(userGender);
    if (filterGender === 'female') return ['female', 'أنثى'].includes(userGender);
    return true;
  };

  const filteredAssignUsers = users
    .filter((u) => {
      if (assignSearch && !u.full_name.includes(assignSearch)) return false;
      if (assignGender && !genderMatches(u.gender, assignGender)) return false;
      return true;
    })
    .sort((a, b) => {
      const cmp = (a.full_name || '').localeCompare(b.full_name || '', 'ar');
      return assignSort === 'asc' ? cmp : -cmp;
    });

  const assignPaginated = paginate(filteredAssignUsers, assignPage);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <h1 className="page-title"><CircleDot size={22} /> إدارة الحلقات</h1>
      <p className="page-subtitle">إنشاء وإدارة الحلقات وتعيين المشاركين والمشرفين</p>

      <button className="btn btn-primary mb-2" onClick={() => setShowCreate(true)}>+ إنشاء حلقة جديدة</button>

      {halqas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CircleDot size={48} /></div>
          <div className="empty-state-text">لا توجد حلقات بعد</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {halqas.map((h) => (
            <div className="card" key={h.id}>
              <div className="card-header">
                <div className="card-title"><Pin size={16} /> {h.name}</div>
                <div className="btn-group">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditHalqa({ ...h })}><Pencil size={14} /></button>
                  <button className="btn btn-gold btn-sm" onClick={() => openAssign(h)}><Users size={14} /> تعيين</button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 750, width: '95vw' }}>
            <div className="flex-between mb-2">
              <div className="modal-title" style={{ margin: 0 }}>
                <Users size={18} /> تعيين مشاركين لحلقة: {assignModal.name}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setAssignModal(null)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              اختر المشاركين ({selectedMembers.length} محدد)
            </p>

            {/* Filters */}
            <div className="filters-bar mb-2" style={{ flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 180px' }}>
                <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="filter-input" placeholder="بحث بالاسم..."
                  value={assignSearch} onChange={(e) => { setAssignSearch(e.target.value); setAssignPage(1); }}
                  style={{ paddingRight: 32, width: '100%' }} />
              </div>
              <select className="filter-input" value={assignGender}
                onChange={(e) => { setAssignGender(e.target.value); setAssignPage(1); }}>
                <option value="">كل الجنسين</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
              <select className="filter-input" value={assignSort}
                onChange={(e) => { setAssignSort(e.target.value); setAssignPage(1); }}>
                <option value="asc">الاسم تصاعدي</option>
                <option value="desc">الاسم تنازلي</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="table-container" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>الاسم</th>
                    <th>الجنس</th>
                    <th>الحلقة الحالية</th>
                  </tr>
                </thead>
                <tbody>
                  {assignPaginated.paged.map((u) => (
                    <tr key={u.id}
                      onClick={() => toggleMember(u.id)}
                      style={{
                        cursor: 'pointer',
                        background: selectedMembers.includes(u.id) ? 'var(--primary-light)' : 'transparent',
                      }}>
                      <td>
                        <input type="checkbox" checked={selectedMembers.includes(u.id)}
                          onChange={() => toggleMember(u.id)}
                          onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td>{['male', 'ذكر'].includes(u.gender) ? 'ذكر' : 'أنثى'}</td>
                      <td>
                        {u.halqa_id === assignModal.id ? (
                          <span className="badge badge-success">هذه الحلقة</span>
                        ) : u.halqa_name ? (
                          <span className="badge badge-warning">{u.halqa_name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>غير معيّن</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={assignPage} totalPages={assignPaginated.totalPages}
              total={assignPaginated.total} onPageChange={setAssignPage} />

            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={prepareConfirm}>
                <Save size={14} /> حفظ التعيين
              </button>
              <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Assign Modal */}
      {confirmAssign && (
        <div className="modal-overlay" onClick={() => setConfirmAssign(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-title">
              <CheckCircle size={18} /> تأكيد تعيين المشاركين — {assignModal?.name}
            </div>

            {confirmAssign.added.length === 0 && confirmAssign.moved.length === 0 && confirmAssign.removed.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                لا توجد تغييرات
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {confirmAssign.added.length > 0 && (
                  <div style={{ background: 'var(--primary-light)', borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserPlus size={15} /> إضافة ({confirmAssign.added.length})
                    </div>
                    {confirmAssign.added.map((name, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', padding: '0.15rem 0', color: 'var(--text-primary)' }}>• {name}</div>
                    ))}
                  </div>
                )}

                {confirmAssign.moved.length > 0 && (
                  <div style={{ background: 'var(--gold-light)', borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ArrowLeftRight size={15} /> نقل من حلقة أخرى ({confirmAssign.moved.length})
                    </div>
                    {confirmAssign.moved.map((m, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', padding: '0.15rem 0', color: 'var(--text-primary)' }}>
                        • {m.name} <span style={{ color: 'var(--text-muted)' }}>(من: {m.from})</span>
                      </div>
                    ))}
                  </div>
                )}

                {confirmAssign.removed.length > 0 && (
                  <div style={{ background: '#fef2f2', borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserMinus size={15} /> إزالة ({confirmAssign.removed.length})
                    </div>
                    {confirmAssign.removed.map((name, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', padding: '0.15rem 0', color: 'var(--text-primary)' }}>• {name}</div>
                    ))}
                  </div>
                )}

                {confirmAssign.unchanged > 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    بالإضافة إلى {confirmAssign.unchanged} مشارك بدون تغيير
                  </p>
                )}
              </div>
            )}

            <div className="btn-group mt-2">
              <button className="btn btn-primary" onClick={saveAssign}
                disabled={confirmAssign.added.length === 0 && confirmAssign.moved.length === 0 && confirmAssign.removed.length === 0}>
                <CheckCircle size={14} /> تأكيد
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmAssign(null)}>رجوع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
