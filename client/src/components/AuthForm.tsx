// src/pages/AuthPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Paper, Box, TextField, Button, Divider, Stack,
  Typography, Snackbar, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import api from '../services/api';

type Role = 'student' | 'mentor' | 'admin';

interface AuthResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: Role;
  };
}

const AuthForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Restore Authorization header if token exists (refresh-safe)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }, []);

  const endpoint = useMemo(
    () => (mode === 'login' ? '/api/auth/login' : '/api/auth/signup'),
    [mode]
  );

  const handleAuthSuccess = (data: AuthResponse) => {
    if (!data?.token || !data?.user) throw new Error('Invalid server response.');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    navigate('/dashboard');
  };

  const extractErr = (err: any): string => {
    // Prefer server-provided messages
    return (
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'An unknown error occurred.'
    );
  };

  const handleAuthError = (err: any) => {
    const msg = extractErr(err);
    setError(msg);
    setShowError(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    const payload =
      mode === 'signup'
        ? { name: name.trim(), email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password };

    try {
      const res = await api.post<AuthResponse>(endpoint, payload);
      handleAuthSuccess(res.data);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    const cred = credentialResponse.credential;
    if (!cred) {
      handleAuthError({ message: 'Google Sign-In failed: No credential returned.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api.post<AuthResponse>('/api/auth/google', { token: cred });
      handleAuthSuccess(res.data);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    handleAuthError({ message: 'Google Sign-In process failed. Please try again.' });
  };

  const toggleMode = () => {
    if (isSubmitting) return;
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={6}
        sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}
      >
        <Typography component="h1" variant="h5">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
          <Stack spacing={2}>
            {mode === 'signup' && (
              <TextField
                label="Full Name"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
            )}

            <TextField
              label="Email Address"
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="email"
            />

            <TextField
              label="Password"
              fullWidth
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            <Button type="submit" fullWidth variant="contained" disabled={isSubmitting} sx={{ mt: 2, mb: 1 }}>
              {isSubmitting ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>

            <Divider>OR</Divider>

            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                // Optional: One Tap can be noisy—keep only on login
                useOneTap={mode === 'login'}
                theme="outline"
                shape="rectangular"
              />
            </Box>

            <Button variant="text" onClick={toggleMode} disabled={isSubmitting}>
              {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowError(false)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AuthForm;
