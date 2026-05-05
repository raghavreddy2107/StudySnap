// src/components/Layout.jsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.js';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="app-header sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">S</span>
            </div>
            <span className="font-display font-bold text-ink text-lg tracking-tight">StudySnap</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/dashboard" active={isActive('/dashboard')}>Dashboard</NavLink>
            <NavLink to="/new" active={isActive('/new')}>New Summary</NavLink>
            <NavLink to="/profile" active={isActive('/profile')}>Profile</NavLink>
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full border border-border bg-card-bg text-muted hover:text-accent hover:border-accent transition-colors flex items-center justify-center"
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
            >
              {isDark ? '☀' : '🌙'}
            </button>
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-border object-cover"
              />
            )}
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 rounded-md text-muted hover:text-accent hover:bg-cream transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex border-t border-border">
          <MobileNavLink to="/dashboard" active={isActive('/dashboard')}>Dashboard</MobileNavLink>
          <MobileNavLink to="/new" active={isActive('/new')}>New</MobileNavLink>
          <MobileNavLink to="/profile" active={isActive('/profile')}>Profile</MobileNavLink>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'text-muted hover:text-ink hover:bg-cream'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
        active ? 'text-accent border-b-2 border-accent' : 'text-muted'
      }`}
    >
      {children}
    </Link>
  );
}
