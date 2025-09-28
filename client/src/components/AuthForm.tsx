import React, { useState } from 'react';
import {
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
import api from '../services/api';

const AuthForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setShowError(false);
    setErrorMessage('');

    const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const payload =
      mode === 'signup' ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password };

    try {
      const res = await api.post(path, payload);
      const data = res.data || {};

      if (!data?.token || !data?.user) {
        throw new Error('Invalid server response (missing token or user).');
      }

      // Persist auth
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Optional: set default Authorization for this session
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      // Navigate to dashboard (or wherever)
      navigate('/dashboard');
    } catch (err: any) {
      console.error('❌ Auth error:', err?.normalizedMessage || err?.message || err);
      setErrorMessage(err?.normalizedMessage || 'Authentication failed.');
      setShowError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {mode === 'signup' && (
            <TextField
              label="Full Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
            />
          )}

          <TextField
            label="Email"
            fullWidth
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
          />

          <TextField
            label="Password"
            fullWidth
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
          />

          <Button type="submit" variant="contained" fullWidth disabled={submitting}>
            {submitting ? (mode === 'login' ? 'Logging in…' : 'Signing up…') : mode === 'login' ? 'Login' : 'Sign Up'}
          </Button>

          <Divider>or</Divider>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<GoogleIcon />}
            disabled={submitting}
            onClick={() => {
              // Plug your Google OAuth here when ready
              setErrorMessage('Google sign-in not implemented yet.');
              setShowError(true);
            }}
          >
            Continue with Google
          </Button>

          <Typography
            variant="body2"
            align="center"
            sx={{ cursor: 'pointer', textDecoration: 'underline', mt: 1 }}
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login'
              ? "Don't have an account? Sign up here"
              : 'Already have an account? Login here'}
          </Typography>
        </Stack>
      </form>

      {/* Modal-style alert */}
      <Snackbar
        open={showError}
        autoHideDuration={4000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setShowError(false)}
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AuthForm;
