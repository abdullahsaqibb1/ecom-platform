import {
  Boxes,
  ChevronDown,
  CircleGauge,
  FolderTree,
  LogOut,
  Menu,
  PackageCheck,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { initials } from '../lib/format';

const baseNav = [
  { to: '/', label: 'Overview', icon: CircleGauge },
  { to: '/products', label: 'Products', icon: Boxes },
  { to: '/orders', label: 'Orders', icon: PackageCheck },
  { to: '/categories', label: 'Categories', icon: FolderTree },
];

export function AdminLayout() {
  const { admin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navItems = admin?.role === 'SUPERADMIN'
    ? [...baseNav, { to: '/admins', label: 'Admin accounts', icon: UsersRound }]
    : baseNav;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div><strong>Commerce</strong><span>Admin console</span></div>
          <button className="icon-button sidebar__close" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <nav className="sidebar__nav">
          <span className="nav-label">Workspace</span>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__security">
          <ShieldCheck size={18} />
          <div><strong>Admin-only session</strong><span>Isolated from customer authentication</span></div>
        </div>
      </aside>
      {mobileOpen ? <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /> : null}
      <div className="app-main">
        <header className="topbar">
          <button className="icon-button topbar__menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="topbar__context">
            <span>Admin workspace</span>
            <strong>{location.pathname === '/' ? 'Overview' : location.pathname.split('/')[1]}</strong>
          </div>
          <div className="profile-menu">
            <button className="profile-trigger" onClick={() => setProfileOpen((value) => !value)}>
              <span className="avatar">{initials(admin?.name, admin?.email)}</span>
              <span className="profile-trigger__copy"><strong>{admin?.name || 'Administrator'}</strong><small>{admin?.role}</small></span>
              <ChevronDown size={16} />
            </button>
            {profileOpen ? (
              <div className="profile-dropdown">
                <div><strong>{admin?.email}</strong><span>Secure admin identity</span></div>
                <button onClick={logout}><LogOut size={17} />Sign out</button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
