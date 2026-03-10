import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { AuthService } from '../services/authService';
import { setUser, setMFARequired, setError } from '../store/authSlice';
import { AppDispatch } from '../store/index';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setErrorLocal] = useState('');
  const [loading, setLoadingLocal] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');
    setLoadingLocal(true);

    try {
      const response = await AuthService.login({ email, password });

      if (response.data.mfaRequired) {
        // Store session ID and navigate to MFA verification
        dispatch(setMFARequired({ sessionId: response.data.sessionId }));
        navigate('/verify-mfa');
      } else {
        // Store tokens and user
        localStorage.setItem('access_token', response.data.accessToken);
        localStorage.setItem('refresh_token', response.data.refreshToken);
        dispatch(setUser(response.data.user));
        navigate('/dashboard');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setErrorLocal(message);
      dispatch(setError(message));
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
            HRMS Login
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              sx={{ mt: 3, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>

          <Typography variant="body2" align="center" sx={{ mt: 3, color: 'text.secondary' }}>
            © 2026 HRMS. All rights reserved.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
