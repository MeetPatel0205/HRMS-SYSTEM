import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
    const { user, isAuthenticated, isInitializing } = useSelector((state: RootState) => state.auth);
    const location = useLocation();

    if (isInitializing) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user has at least one of the allowed roles
    // Handling string[] or single string role from legacy code if present
    const userRoles = (user.roles || []).map((r: string) => r.toLowerCase());
    const hasAccess = userRoles.some((role: string) => allowedRoles.map(r => r.toLowerCase()).includes(role));

    if (!hasAccess) {
        // Redirect to their default dashboard if unauthorized
        // or to a specific 403 page
        // Render a forbidden message instead of diverting to / to avoid loops
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
                    <p className="text-xl text-gray-600 mb-8">Access Denied</p>
                    <p className="text-gray-500">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default RoleGuard;
