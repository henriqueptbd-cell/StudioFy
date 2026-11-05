import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';

export const PlatformProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = usePlatformAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};
