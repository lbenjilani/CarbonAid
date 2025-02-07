import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
        <Typography variant="h3" mb={3}>
          MigraineGenie @2025
        </Typography>
    </Box>
  );
};

export default Footer;
