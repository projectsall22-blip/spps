import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // 1. THE "LOADING" GUARD
  // While AuthContext is reading localStorage, show a full-page spinner
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 2. THE "AUTH" GUARD
  // If no token exists, send them back to the landing page
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 3. THE "ROLE" GUARD
  // If the user's role isn't in the list of allowed roles for this route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect them to their own specific dashboard instead of a 404
    const redirectPath = `/${user.role}/dashboard`;
    return <Navigate to={redirectPath} replace />;
  }

  // 4. CLEARANCE GRANTED
  return children;
};

export default ProtectedRoute;