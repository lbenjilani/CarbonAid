// src/pages/Home.tsx
import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  GlobalStyles,
  Container,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import AuthForm from '../components/AuthForm';

const AI_PANEL_MAX = 'clamp(360px, 38vw, 640px)';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <>
      <GlobalStyles
        styles={{
          ':root': { '--ai-panel-max': AI_PANEL_MAX },
          '.ai-panel': { width: '100%', maxWidth: 'var(--ai-panel-max)' },
          'html, body, #root': { height: '100%', margin: 0 },
          body: { backgroundColor: '#eaf5e1' },
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 2, md: 4 },
          height: '100%',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: { xs: 960, md: 1120 },
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            bgcolor: '#fff',
          }}
        >
          <Box
            sx={{
              flex: 1,
              bgcolor: '#eaf5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 3, sm: 4 },
              py: { xs: 4, sm: 6 },
              textAlign: 'center',
              minWidth: 0,
            }}
          >
            <Box sx={{ maxWidth: 520 }}>
              <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight={800} gutterBottom>
                Welcome to CarbonAid
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Your companion in building a cleaner, greener world 🌍
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 3, sm: 4 },
              py: { xs: 3, sm: 5 },
              bgcolor: '#fff',
              minWidth: 0,
            }}
          >
            <Box className="ai-panel">
              <Box
                display="flex"
                justifyContent="center"
                mb={2}
                onClick={() => navigate('/')}
                sx={{ cursor: 'pointer' }}
              >
                <img
                  src={Logo}
                  alt="CarbonAid Logo"
                  style={{ height: 56, objectFit: 'contain' }}
                />
              </Box>

              <Typography variant="h5" fontWeight="bold" mb={1} textAlign="center">
                Login / Sign Up
              </Typography>

              <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                Join the movement. Reduce your footprint. 🌿
              </Typography>

              <AuthForm />
            </Box>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default Home;
