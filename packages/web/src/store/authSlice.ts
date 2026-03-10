import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  sessionId: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true, // Start true on page load to prevent premature redirects
  loading: false,
  error: null,
  mfaRequired: false,
  sessionId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitializing = false;
      state.mfaRequired = false;
      state.sessionId = null;
    },
    setInitialized: (state) => {
      state.isInitializing = false;
    },
    setMFARequired: (state, action: PayloadAction<{ sessionId: string }>) => {
      state.mfaRequired = true;
      state.sessionId = action.payload.sessionId;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.mfaRequired = false;
      state.sessionId = null;
      state.error = null;
    },
  },
});

export const { setLoading, setError, setUser, setInitialized, setMFARequired, clearAuth } = authSlice.actions;
export default authSlice.reducer;
