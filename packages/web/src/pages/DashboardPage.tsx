import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Container, Typography } from '@mui/material';
import { RootState } from '../store/index';

const DashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  if (!user) {
    return null;
  }

  const roles = user.roles || [];
  // Handle case where role might be a string (legacy) or array
  const rawRole = Array.isArray(roles) && roles.length > 0 ? roles[0] : (user as any).role;
  const role = typeof rawRole === 'string' ? rawRole.toUpperCase() : '';

  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'HR_MANAGER') return <Navigate to="/hr" replace />;
  if (role === 'MANAGER') return <Navigate to="/manager" replace />;
  // Default to employee dashboard for EMPLOYEE and others
  return <Navigate to="/employee" replace />;
};

export default DashboardPage;
