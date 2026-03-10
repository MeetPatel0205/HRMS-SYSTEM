import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
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
import { setUser, setError } from '../store/authSlice';
import { RootState, AppDispatch } from '../store/index';

const VerifyMFAPage: React.FC = () => {
  const [mfaToken, setMfaToken] = useState('');
  const [error, setErrorLocal] = useState('');
  const [loading, setLoadingLocal] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { sessionId } = useSelector((state: RootState) => state.auth);

  if (!sessionId) {
    navigate('/login');
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');
    setLoadingLocal(true);

    try {
      const response = await AuthService.verifyMFA({
        sessionId,
        token: mfaToken,
      });

      localStorage.setItem('access_token', response.data.accessToken);
      localStorage.setItem('refresh_token', response.data.refreshToken);
      dispatch(setUser(response.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message || 'MFA verification failed. Please try again.';
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
        <Paper elevation={3} sx={{ padding: 4, width: '100%', borderRadius: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
            Verify MFA Code
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Enter the 6-digit code from your authenticator app.
          </Typography>

          <form onSubmit={handleVerify}>
            <TextField
              fullWidth
              label="MFA Code"
              type="text"
              inputProps={{ maxLength: 6 }}
              margin="normal"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
              placeholder="000000"
            />

            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              sx={{ mt: 3, py: 1.5 }}
              disabled={loading || mfaToken.length !== 6}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify'}
            </Button>

            <Button fullWidth variant="text" onClick={() => navigate('/login')} sx={{ mt: 1 }}>
              Back to Login
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyMFAPage;
