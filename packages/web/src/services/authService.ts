import apiClient from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MFAVerifyRequest {
  sessionId: string;
  token: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}

export const AuthService = {
  login: async (credentials: LoginRequest) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  verifyMFA: async (payload: MFAVerifyRequest) => {
    const response = await apiClient.post('/auth/verify-mfa', payload);
    return response.data;
  },

  setupMFA: async () => {
    const response = await apiClient.post('/auth/setup-mfa');
    return response.data;
  },

  enableMFA: async (token: string, backupCodes: string[]) => {
    const response = await apiClient.post('/auth/enable-mfa', {
      token,
      backupCodes,
    });
    return response.data;
  },

  refreshToken: async (token: string) => {
    const response = await apiClient.post('/auth/refresh-token', {
      refreshToken: token,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  createEmployeeUser: async (payload: { employeeId: string; password: string; }) => {
    const response = await apiClient.post('/auth/create-employee-user', payload);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};
