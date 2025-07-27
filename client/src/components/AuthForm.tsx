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

const AuthForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = mode === 'login'
      ? 'http://localhost:5000/api/auth/login'
      : 'http://localhost:5000/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? { name, email, password } : { email, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setErrorMessage('⚠️ Server returned invalid response.');
        setShowError(true);
        return;
      }

      if (res.ok) {
        console.log(mode === 'signup' ? '✅ User created' : '✅ Logged in');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setErrorMessage(data.error || 'Authentication failed');
        setShowError(true);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setErrorMessage('Server not responding. Please try again later.');
      setShowError(true);
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
            />
          )}
          <TextField
            label="Email"
            fullWidth
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Password"
            fullWidth
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="contained" fullWidth>
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </Button>

          <Divider>or</Divider>

          <Button variant="outlined" fullWidth startIcon={<GoogleIcon />}>
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
