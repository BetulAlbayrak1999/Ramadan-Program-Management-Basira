import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const icons = {
  dashboard: '📊', card: '📝', leaderboard: '🏆', profile: '👤',
  supervisor: '👁', users: '👥', halqas: '🔵', analytics: '📈',
  settings: '⚙️', logout: '🚪', menu: '☰', close: '✕',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { to: '/dashboard', icon: icons.dashboard, label: 'لوحة القيادة' },
    { to: '/daily-card', icon: icons.card, label: 'البطاقة الرمضانية' },
    { to: '/leaderboard', icon: icons.leaderboard, label: 'الترتيب العام' },
    { to: '/profile', icon: icons.profile, label: 'الملف الشخصي' },
  ];

  const supervisorItems = [
    { to: '/supervisor', icon: icons.supervisor, label: 'إشراف الحلقة' },
  ];

  const adminItems = [
    { to: '/admin/users', icon: icons.users, label: 'إدارة المستخدمين' },
    { to: '/admin/halqas', icon: icons.halqas, label: 'إدارة الحلقات' },
    { to: '/admin/analytics', icon: icons.analytics, label: 'التحليلات والنقاط' },
    { to: '/admin/settings', icon: icons.settings, label: 'الإعدادات' },
  ];

  const roleLabel = {
    participant: 'مشارك',
    supervisor: 'مشرف',
    super_admin: 'سوبر آدمن',
  };

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>{icons.menu}</button>
        <span className="mobile-logo">المنصة الرمضانية</span>
        <span style={{ width: 40 }} />
      </div>

      {/* Overlay */}
      <div className={`overlay ${sidebarOpen ? 'show' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="hamburger" onClick={closeSidebar}
            style={{ display: sidebarOpen ? 'block' : 'none', position: 'absolute', left: '1rem', top: '1rem' }}>
            {icons.close}
          </button>
          <div className="sidebar-logo">🌙 المنصة الرمضانية</div>
          <div className="sidebar-subtitle">متابعة الإنجاز اليومي</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">القائمة الرئيسية</div>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}

          {(user?.role === 'supervisor' || user?.role === 'super_admin') && (
            <>
              <div className="nav-section-title">الإشراف</div>
              {supervisorItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}>
                  <span>{item.icon}</span> {item.label}
                </NavLink>
              ))}
            </>
          )}

          {user?.role === 'super_admin' && (
            <>
              <div className="nav-section-title">الإدارة</div>
              {adminItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}>
                  <span>{item.icon}</span> {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.full_name?.charAt(0)}</div>
            <div>
              <div className="user-name">{user?.full_name}</div>
              <div className="user-role">{roleLabel[user?.role] || user?.role}</div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout}>
            <span>{icons.logout}</span> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
