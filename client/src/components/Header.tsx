import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';

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
        {/* Logo → dashboard */}
        <Box
          display="flex"
          alignItems="center"
          sx={{ gap: 1, cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <img src={Logo} alt="CarbonAid Logo" style={{ height: 40 }} />
          <Typography variant="h6" fontWeight="bold">
            CarbonAid
          </Typography>
        </Box>

        {/* Nav Buttons + Icons */}
        <Box display="flex" gap={isMobile ? 1 : 2} alignItems="center">
          {/* Nav Buttons */}
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

          {/* Icons */}
          <Tooltip title="Profile">
            <IconButton onClick={() => console.log('Profile clicked')}>
              <PersonIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton onClick={() => console.log('Notifications clicked')}>
              <NotificationsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Help">
            <IconButton onClick={() => console.log('Help clicked')}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>

          {/* Logout Button */}
          <Tooltip title="Logout">
            <IconButton color="error" onClick={() => navigate('/')}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
