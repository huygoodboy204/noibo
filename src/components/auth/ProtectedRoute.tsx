import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // Optional: Specify roles that are allowed to access
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Optional: Show a loading spinner or a blank page while auth state is being determined
    // For now, returning null or a simple loading message to prevent rendering children prematurely
    return <div>Loading authentication...</div>; // Or return null;
  }

  if (!isAuthenticated) {
    // Redirect them to the /signin page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Check for role-based access if allowedRoles are provided
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      // User is authenticated but does not have the required role
      // Redirect to an unauthorized page or home page
      // For now, redirecting to home. You might want a specific "Access Denied" page.
      console.warn(`User role '${userRole}' not in allowed roles: ${allowedRoles.join(', ')}. Access denied.`);
      return <Navigate to="/" state={{ from: location }} replace />;
      // Or: return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />; // Render the nested routes if authenticated (and authorized by role if applicable)
};

export default ProtectedRoute; 