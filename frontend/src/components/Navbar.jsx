import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); setDropdownOpen(false); };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navLink = (to, label) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`text-sm font-medium transition-colors ${
        location.pathname === to ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">CommunityHero</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLink('/', 'Issues')}
            {navLink('/dashboard', 'Dashboard')}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/report"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
                >
                  Report Issue
                </Link>

                {/* Avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-600">{user.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.name?.split(' ')[0]}</span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <div className="text-xs font-medium text-gray-800">{user.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{user.points} pts · <span className="text-blue-600">{user.badge}</span></div>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        My Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Login</Link>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors">Register</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3">
          {navLink('/', 'Issues')}
          {navLink('/dashboard', 'Dashboard')}
          {user ? (
            <>
              <div className="text-xs text-gray-400 pt-1 border-t border-gray-100">{user.name} · {user.badge} · {user.points} pts</div>
              {navLink('/report', 'Report Issue')}
              {navLink('/profile', 'My Profile')}
              <button onClick={handleLogout} className="text-left text-sm text-red-500 font-medium">Logout</button>
            </>
          ) : (
            <>
              {navLink('/login', 'Login')}
              {navLink('/register', 'Register')}
            </>
          )}
        </div>
      )}
    </nav>
  );
}