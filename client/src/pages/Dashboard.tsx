import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Dashboard: React.FC = () => {
  const userName = "John"; // Replace with dynamic data
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 4 }}>
        <Box>
          {/* Header */}
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            fontWeight="bold"
            mb={3}
            textAlign="center"
          >
            Welcome {userName}!
          </Typography>

          {/* About Cards */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3,
              justifyContent: 'center',
              mb: 5,
            }}
          >
            {['About App', 'About', 'About'].map((text, index) => (
              <Paper
                key={index}
                elevation={2}
                sx={{
                  flex: 1,
                  height: 200,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography>{text}</Typography>
              </Paper>
            ))}
          </Box>

          {/* Carbon Info */}
          <Typography variant="h6" color="green" mb={2} textAlign="center">
            Your CarbonInfo
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3,
              justifyContent: 'center',
              mb: 5,
            }}
          >
            {['Current Carbon Footprint', 'Goal Carbon Footprint'].map((label, index) => (
              <Paper
                key={index}
                elevation={3}
                sx={{
                  flex: 1,
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <Typography variant="subtitle1" mb={1}>
                  {label}
                </Typography>
                <Typography variant="h4">{index === 0 ? 'XX%' : 'YY%'}</Typography>
              </Paper>
            ))}
          </Box>

          {/* Statistics Section */}
          <Paper elevation={1} sx={{ p: 3, mb: 5 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>
              Ideas:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>Display Goals</li>
              <li>Show Improvement</li>
              <li>Show Timeline</li>
            </ul>
          </Paper>
        </Box>

        {/* Button aligned bottom-right */}
        <Box display="flex" justifyContent="flex-end">
          <Button variant="outlined" color="success">
            Recalculate your emission
          </Button>
        </Box>
      </Container>
      <Footer />
    </Box>
  );
};

export default Dashboard;
