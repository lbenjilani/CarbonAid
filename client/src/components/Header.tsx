import React, { useMemo, useState } from 'react';
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
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Badge,
} from '@mui/material';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DashboardCustomizeRoundedIcon from '@mui/icons-material/DashboardCustomizeRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PersonIcon from '@mui/icons-material/Person';
import Logo from '../assets/logo.png';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardCustomizeRoundedIcon fontSize="small" /> },
  { label: 'Report',    path: '/report',    icon: <AssessmentRoundedIcon fontSize="small" /> },
  { label: 'Task',      path: '/task',      icon: <AssignmentTurnedInRoundedIcon fontSize="small" /> },
];

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts[1]?.[0] ?? '';
  return (first + last || first).toUpperCase();
}

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuEl, setUserMenuEl] = useState<null | HTMLElement>(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userName: string = user?.name || user?.fullName || user?.email || 'User';
  const initials = getInitials(user?.name || user?.fullName || user?.email);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    // Optional hard reload to clear any in-memory state:
    window.location.reload();
  };

  const NavButtons = (
    <Box display="flex" gap={1} alignItems="center">
      {navItems.map((item) => (
        <Button
          key={item.label}
          component={RouterLink}
          to={item.path}
          startIcon={item.icon}
          size="small"
          variant={isActive(item.path) ? 'contained' : 'text'}
          color={isActive(item.path) ? 'success' : 'inherit'}
          sx={{
            textTransform: 'none',
            fontWeight: isActive(item.path) ? 700 : 500,
            borderRadius: 999,
          }}
        >
          {item.label}
        </Button>
      ))}
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={1}
        sx={{
          mb: 2,
          backdropFilter: 'saturate(180%) blur(6px)',
          backgroundColor: 'rgba(255,255,255,0.85)',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          {/* Left: Logo + Brand (click -> dashboard) */}
          <Box
            display="flex"
            alignItems="center"
            sx={{ gap: 1.5, cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            <img src={Logo} alt="CarbonAid Logo" style={{ height: 36, borderRadius: 6 }} />
            <Typography variant="h6" fontWeight={800} letterSpacing={0.2}>
              CarbonAid
            </Typography>
          </Box>

          {/* Center (desktop): Nav */}
          {!isMobile && NavButtons}

          {/* Right: Actions */}
          <Box display="flex" alignItems="center" gap={0.5}>
            {/* Help */}
            <Tooltip title="Help & Docs">
              <IconButton
                size="small"
                color="inherit"
                onClick={() => navigate('/help')}
                aria-label="Help"
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                size="small"
                color="inherit"
                aria-label="Notifications"
                onClick={() => navigate('/notifications')}
              >
                <Badge badgeContent={3} color="error" overlap="circular">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User menu */}
            <Tooltip title={userName}>
              <IconButton
                size="small"
                onClick={(e) => setUserMenuEl(e.currentTarget)}
                aria-controls={userMenuEl ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(userMenuEl)}
              >
                {user?.avatarUrl ? (
                  <Avatar src={user.avatarUrl} alt={userName} sx={{ width: 32, height: 32 }} />
                ) : (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main', color: 'common.white' }}>
                    {initials}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>

            {/* Mobile menu toggle */}
            {isMobile && (
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={userMenuEl}
        open={Boolean(userMenuEl)}
        onClose={() => setUserMenuEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ elevation: 3, sx: { mt: 1 } }}
      >
        <Box px={2} pt={1} pb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>
            {userName}
          </Typography>
          {user?.email && (
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          )}
        </Box>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => { setUserMenuEl(null); navigate('/profile'); }}>
          <PersonIcon fontSize="small" style={{ marginRight: 8 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => { setUserMenuEl(null); navigate('/settings'); }}>
          <SettingsRoundedIcon fontSize="small" style={{ marginRight: 8 }} />
          Settings
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          onClick={() => { setUserMenuEl(null); handleLogout(); }}
          sx={{ color: 'error.main' }}
        >
          <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'success.main' }}>{initials}</Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {userName}
            </Typography>
            {user?.email && (
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            )}
          </Box>
        </Box>
        <Divider />
        <List sx={{ py: 0 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.label}
              selected={isActive(item.path)}
              onClick={() => {
                setDrawerOpen(false);
                navigate(item.path);
              }}
            >
              {item.icon}
              <ListItemText primary={item.label} sx={{ ml: 1 }} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<HelpOutlineIcon />}
            onClick={() => { setDrawerOpen(false); navigate('/help'); }}
            sx={{ mb: 1 }}
          >
            Help
          </Button>
          <Button
            fullWidth
            size="small"
            color="error"
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={() => { setDrawerOpen(false); handleLogout(); }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
