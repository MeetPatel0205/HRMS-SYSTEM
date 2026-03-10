import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';

interface RBACGuardProps {
    children: React.ReactNode;
    requiredPermissions: string[];
    requireAll?: boolean;
}

const RBACGuard: React.FC<RBACGuardProps> = ({ children, requiredPermissions, requireAll = true }) => {
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

    const userPermissions = user.permissions || [];

    // Check for system admin bypass
    const isSystemAdmin = userPermissions.includes('system_admin') || (user.roles && user.roles.includes('admin'));

    if (isSystemAdmin) {
        return <>{children}</>;
    }

    let hasAccess = false;
    if (requireAll) {
        hasAccess = requiredPermissions.every(perm => userPermissions.includes(perm));
    } else {
        hasAccess = requiredPermissions.some(perm => userPermissions.includes(perm));
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
                    <p className="text-xl text-gray-600 mb-8">Access Denied</p>
                    <p className="text-gray-500">You do not have the required permissions to view this page.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default RBACGuard;
