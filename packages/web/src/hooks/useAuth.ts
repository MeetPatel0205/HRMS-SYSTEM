import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { usePermission } from './usePermission';

export const useAuth = () => {
    const { user, isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);
    const { hasPermission, hasRole } = usePermission();

    return {
        user,
        isAuthenticated,
        loading,
        error,
        hasPermission,
        hasRole
    };
};
