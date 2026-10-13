import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <BookOpen size={32} style={{ color: 'var(--color-accent)' }} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;
