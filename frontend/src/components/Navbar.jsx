import { BookOpen, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err.message);
    }
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        <div className="navbar-brand" aria-label="Cloud Notes Manager home">
          <div className="navbar-brand-icon" aria-hidden="true">
            <BookOpen size={18} />
          </div>
          <span className="navbar-brand-name">Cloud Notes</span>
        </div>

        <div className="navbar-right">
          {user && (
            <div className="navbar-user">
              <User size={14} aria-hidden="true" />
              <span>{user.name || user.email}</span>
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
