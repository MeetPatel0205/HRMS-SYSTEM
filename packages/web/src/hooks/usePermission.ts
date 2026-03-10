import { useSelector } from 'react-redux';
import { RootState } from '../store/index';

export const usePermission = () => {
    const { user } = useSelector((state: RootState) => state.auth);

    const hasPermission = (requiredPermission: string): boolean => {
        if (!user) return false;

        // System admin bypass
        if (user.permissions?.includes('system_admin') || (user.roles && user.roles.includes('admin'))) {
            return true;
        }

        return user.permissions?.includes(requiredPermission) || false;
    };

    const hasAnyPermission = (requiredPermissions: string[]): boolean => {
        if (!user) return false;

        // System admin bypass
        if (user.permissions?.includes('system_admin') || (user.roles && user.roles.includes('admin'))) {
            return true;
        }

        return requiredPermissions.some(perm => user.permissions?.includes(perm));
    };

    const hasAllPermissions = (requiredPermissions: string[]): boolean => {
        if (!user) return false;

        // System admin bypass
        if (user.permissions?.includes('system_admin') || (user.roles && user.roles.includes('admin'))) {
            return true;
        }

        return requiredPermissions.every(perm => user.permissions?.includes(perm));
    };

    const hasRole = (role: string): boolean => {
        if (!user) return false;
        return user.roles?.includes(role) || false;
    };

    return { hasPermission, hasAnyPermission, hasAllPermissions, hasRole };
};
