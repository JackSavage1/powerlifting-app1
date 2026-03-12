import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const athleteLinks = [
    { to: '/today',   label: 'Today' },
    { to: '/history', label: 'History' },
    { to: '/prs',     label: 'PRs' },
  ];

  const coachLinks = [
    { to: '/roster',   label: 'Athletes' },
    { to: '/programs', label: 'Programs' },
  ];

  const links = user?.role === 'coach' ? coachLinks : athleteLinks;

  return (
    <div className="app-shell">
      <header className="top-bar">
        <span className="top-bar-brand">Powerlifting</span>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'active' : ''}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="btn-ghost" onClick={handleLogout}>Sign out</button>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
