import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png'; // Update the path as needed

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Report', path: '/report' },
  { label: 'Task', path: '/task' },
];

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <AppBar position="static" color="inherit" elevation={1} sx={{ mb: 2 }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
          <img src={Logo} alt="CarbonAid Logo" style={{ height: 40 }} />
          <Typography variant="h6" fontWeight="bold">
            CarbonAid
          </Typography>
        </Box>

        {/* Navigation */}
        <Box display="flex" gap={2}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.label}
                variant={isActive ? 'contained' : 'text'}
                color={isActive ? 'success' : 'inherit'}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
