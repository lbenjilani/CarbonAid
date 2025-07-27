import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  GlobalStyles,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import AuthForm from '../components/AuthForm';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <>
      <GlobalStyles
        styles={{
          html: { overflow: 'hidden', height: '100%', width: '100%' },
          body: { overflow: 'hidden', height: '100%', width: '100%', margin: 0 },
        }}
      />

      <Box
        sx={{
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#eaf5e1',
        }}
      >
        <Box
          sx={{
            transform: 'scale(1.25)',
            transformOrigin: 'center',
            width: '80%',
            height: '80%',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            boxShadow: 3,
            bgcolor: '#fff',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Left Panel: Welcome */}
          <Box
            sx={{
              flex: 1,
              bgcolor: '#eaf5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Box>
              <Typography
                variant={isMobile ? 'h4' : 'h3'}
                fontWeight="bold"
                gutterBottom
              >
                Welcome to CarbonAid
              </Typography>
              <Typography variant="h6">
                Your companion in building a cleaner, greener world 🌍
              </Typography>
            </Box>
          </Box>

          {/* Right Panel: Auth */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 4,
              py: 3,
              bgcolor: '#ffffff',
            }}
          >
            <Box width="100%" maxWidth={400}>
              {/* Logo */}
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
                  style={{ height: 60, objectFit: 'contain' }}
                />
              </Box>

              <Typography
                variant="h5"
                fontWeight="bold"
                mb={1}
                textAlign="center"
              >
                Login / Sign Up
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                mb={3}
              >
                Join the movement. Reduce your footprint. 🌿
              </Typography>

              <AuthForm />
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Home;
