import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const LandingPage: React.FC = () => {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Box
        component="main"
        flexGrow={1}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        px={3}
      >
        <Typography variant="h3" mb={3}>
          Welcome to My App
        </Typography>
        <Typography variant="h5" mb={5}>
          XXXXXXXX
        </Typography>
        <Button
          variant="contained"
          color="primary"
          href="/dashboard"
        >
          Start
        </Button>
      </Box>
    </Box>
  );
};

export default LandingPage;
