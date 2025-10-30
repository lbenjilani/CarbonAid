// src/pages/AuthPage.tsx

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Divider,
  Stack,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import api from '../services/api';

// This interface defines the expected shape of the server's auth response
interface AuthResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: 'student' | 'mentor' | 'admin';
  };
}

const AuthForm: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // --- HELPER FUNCTIONS ---

  /**
   * Handles successful authentication by storing user data and navigating.
   */
  const handleAuthSuccess = (data: AuthResponse) => {
    if (!data?.token || !data?.user) {
      throw new Error('Invalid server response.');
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    navigate('/dashboard'); // Redirect to a protected route
  };

  /**
   * Parses error messages from the server or network.
   */
  const handleAuthError = (err: any) => {
    const errorMessage = err.response?.data?.error || err.message || 'An unknown error occurred.';
    setError(errorMessage);
    setShowError(true);
  };

  // --- EVENT HANDLERS ---

  /**
   * Handles form submission for email/password login and signup.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const payload = mode === 'signup' ? { name, email, password } : { email, password };

    try {
      const response = await api.post<AuthResponse>(endpoint, payload);
      handleAuthSuccess(response.data);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles the callback from a successful Google Sign-In.
   */
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsSubmitting(true);
    setError('');

    if (!credentialResponse.credential) {
      handleAuthError({ message: 'Google Sign-In failed: No credential returned.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await api.post<AuthResponse>('/api/auth/google', {
        token: credentialResponse.credential,
      });
      handleAuthSuccess(response.data);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles errors from the Google Sign-In process itself.
   */
  const handleGoogleError = () => {
    handleAuthError({ message: 'Google Sign-In process failed. Please try again.' });
  };

  // --- RENDER ---
  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={6}
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 4,
        }}
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting}
              sx={{ mt: 2, mb: 1 }}
            >
              {isSubmitting ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>

            <Divider>OR</Divider>

            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                shape="rectangular"
              />
            </Box>

            <Button
              variant="text"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              disabled={isSubmitting}
            >
              {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Error Display Snackbar */}
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