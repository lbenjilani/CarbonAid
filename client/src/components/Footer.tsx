import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box
      sx={{
        mt: 'auto',
        py: 2,
        px: 3,
        bgcolor: '#cde8bd',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="textSecondary">
        © {new Date().getFullYear()} CarbonTracker. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
