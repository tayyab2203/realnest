import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // If stuck loading for more than 5 seconds, stop waiting
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const spinner = (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (loading && !timedOut) return spinner;

  if (!user) return <Navigate to="/login" replace />;

  // Wait for profile to load, but not forever
  if (requiredRole && !profile && !timedOut) return spinner;

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
