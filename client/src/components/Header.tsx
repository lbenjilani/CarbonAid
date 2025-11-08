// src/components/Header.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  ListItemIcon,
  Chip,
  alpha,
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
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import Logo from '../assets/logo.png';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardCustomizeRoundedIcon fontSize="small" /> },
  { label: 'Report', path: '/report', icon: <AssessmentRoundedIcon fontSize="small" /> },
  { label: 'Task', path: '/task', icon: <AssignmentTurnedInRoundedIcon fontSize="small" /> },
];

type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  ts: number;
  read?: boolean;
  type?: 'ai' | 'task' | 'system';
};

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts[1]?.[0] ?? '';
  return (first + last || first).toUpperCase();
}

function loadNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem('notifications');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveNotifications(arr: NotificationItem[]) {
  localStorage.setItem('notifications', JSON.stringify(arr));
}

const SUPPORT_EMAIL = 'support@carbonaid.app';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isTabletDown = useMediaQuery(theme.breakpoints.down('lg'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuEl, setUserMenuEl] = useState<null | HTMLElement>(null);
  const [helpMenuEl, setHelpMenuEl] = useState<null | HTMLElement>(null);
  const [notifMenuEl, setNotifMenuEl] = useState<null | HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadNotifications());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'notifications') setNotifications(loadNotifications());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNotifications(loadNotifications()), 1500);
    return () => clearInterval(t);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAllRead = useCallback(() => {
    const next = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(next);
    saveNotifications(next);
  }, [notifications]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userName: string = user?.name || user?.fullName || user?.email || 'User';
  const initials = getInitials(user?.name || user?.fullName || user?.email);
  const roleLabel = user?.role || 'Member';

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const NavButtons = (
    <Box display="flex" gap={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
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
            px: 1.5,
            minWidth: { md: 112, sm: 96, xs: 88 },
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
          backgroundColor: 'rgba(240, 250, 237, 0.92)',
          borderBottom: '1px solid rgba(117,183,141,0.25)',
        }}
      >
        <Toolbar sx={{ gap: 1.5, px: { xs: 1.5, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
          <Box
            onClick={() => navigate('/dashboard')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              minWidth: 0,
              flex: { xs: '1 1 auto', md: '0 0 auto' },
            }}
          >
            <img src={Logo} alt="CarbonAid" style={{ height: 32, borderRadius: 6 }} />
            <Typography
              variant="h6"
              fontWeight={800}
              letterSpacing={0.2}
              noWrap
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              CarbonAid
            </Typography>
          </Box>

          {!isTabletDown && NavButtons}

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Tooltip title="Help">
              <IconButton size="small" color="inherit" onClick={(e) => setHelpMenuEl(e.currentTarget)}>
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={helpMenuEl}
              open={Boolean(helpMenuEl)}
              onClose={() => setHelpMenuEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                elevation: 4,
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                  backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.success.light, 0.15)}, ${alpha(
                    theme.palette.background.paper,
                    0.9
                  )})`,
                  backdropFilter: 'blur(8px)',
                },
              }}
            >
              <MenuItem component="a" href={`mailto:${SUPPORT_EMAIL}`} onClick={() => setHelpMenuEl(null)}>
                <ListItemIcon>
                  <EmailRoundedIcon fontSize="small" />
                </ListItemIcon>
                Contact {SUPPORT_EMAIL}
              </MenuItem>
              <MenuItem
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(SUPPORT_EMAIL);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  } catch {}
                }}
              >
                <ListItemIcon>
                  {copied ? <CheckRoundedIcon fontSize="small" color="success" /> : <ContentCopyRoundedIcon fontSize="small" />}
                </ListItemIcon>
                {copied ? 'Copied!' : 'Copy email'}
              </MenuItem>
            </Menu>

            <Tooltip title="Notifications">
              <IconButton
                size="small"
                color="inherit"
                onClick={(e) => {
                  setNotifMenuEl(e.currentTarget);
                  if (unreadCount > 0) setTimeout(() => markAllRead(), 50);
                }}
              >
                <Badge badgeContent={unreadCount} color="error" overlap="circular">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={notifMenuEl}
              open={Boolean(notifMenuEl)}
              onClose={() => setNotifMenuEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                elevation: 4,
                sx: {
                  mt: 1,
                  width: { xs: 300, sm: 320 },
                  maxHeight: 420,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                  backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.success.light, 0.15)}, ${alpha(
                    theme.palette.background.paper,
                    0.9
                  )})`,
                  backdropFilter: 'blur(8px)',
                },
              }}
            >
              <Box px={2} pt={1} pb={0.5} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" fontWeight={800}>
                  Notifications
                </Typography>
                {unreadCount > 0 && <Chip size="small" color="error" label={`${unreadCount} new`} />}
              </Box>
              <Divider sx={{ my: 1 }} />
              {notifications.length === 0 ? (
                <Box px={2} py={3}>
                  <Typography variant="body2" color="text.secondary">
                    No notifications yet.
                  </Typography>
                </Box>
              ) : (
                notifications.slice(0, 15).map((n) => (
                  <MenuItem
                    key={n.id}
                    onClick={() => setNotifMenuEl(null)}
                    sx={{ alignItems: 'flex-start', gap: 1, '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.06) } }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {n.type === 'ai' ? (
                        <BoltRoundedIcon fontSize="small" color="warning" />
                      ) : n.type === 'task' ? (
                        <TaskAltRoundedIcon fontSize="small" color="success" />
                      ) : (
                        <NotificationsIcon fontSize="small" color="action" />
                      )}
                    </ListItemIcon>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {n.title}
                      </Typography>
                      {n.body && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                          {n.body}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 0.25 }}>
                        {new Date(n.ts).toLocaleString()}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
              {notifications.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box px={1.5} pb={1.5}>
                    <Button
                      size="small"
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        saveNotifications([]);
                        setNotifications([]);
                      }}
                      sx={{
                        textTransform: 'none',
                        borderColor: alpha(theme.palette.success.main, 0.35),
                        '&:hover': { borderColor: theme.palette.success.main, bgcolor: alpha(theme.palette.success.main, 0.06) },
                      }}
                    >
                      Clear all
                    </Button>
                  </Box>
                </>
              )}
            </Menu>

            <Tooltip title={userName}>
              <IconButton
                size="small"
                onClick={(e) => setUserMenuEl(e.currentTarget)}
                aria-controls={userMenuEl ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(userMenuEl)}
                sx={{ borderRadius: 2, p: 0.25, '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.08) } }}
              >
                {user?.avatarUrl ? (
                  <Avatar src={user.avatarUrl} alt={userName} sx={{ width: 32, height: 32 }} />
                ) : (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main', color: 'common.white' }}>{initials}</Avatar>
                )}
              </IconButton>
            </Tooltip>

            {isTabletDown && (
              <IconButton size="small" color="inherit" onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu">
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        id="user-menu"
        anchorEl={userMenuEl}
        open={Boolean(userMenuEl)}
        onClose={() => setUserMenuEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          elevation: 6,
          sx: {
            mt: 1,
            borderRadius: 2.5,
            overflow: 'hidden',
            minWidth: 280,
            border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
            boxShadow: `0 8px 20px ${alpha('#0b3d2e', 0.18)}`,
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.success.light, 0.18)}, ${alpha(
              theme.palette.background.paper,
              0.95
            )})`,
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            pt: 2,
            pb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.12)}, transparent)`,
          }}
        >
          {user?.avatarUrl ? (
            <Avatar src={user.avatarUrl} alt={userName} sx={{ width: 44, height: 44, border: `2px solid ${alpha('#fff', 0.6)}` }} />
          ) : (
            <Avatar sx={{ width: 44, height: 44, bgcolor: 'success.main', color: 'common.white' }}>{initials}</Avatar>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              {userName}
            </Typography>
            {user?.email && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            )}
            <Box sx={{ mt: 0.5 }}>
              <Chip size="small" label={roleLabel} color="success" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.75 } }} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonIcon />}
              onClick={() => {
                setUserMenuEl(null);
                navigate('/profile');
              }}
              sx={{
                textTransform: 'none',
                borderColor: alpha(theme.palette.success.main, 0.35),
                '&:hover': { borderColor: theme.palette.success.main, bgcolor: alpha(theme.palette.success.main, 0.06) },
              }}
            >
              Profile
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsRoundedIcon />}
              onClick={() => {
                setUserMenuEl(null);
                navigate('/settings');
              }}
              sx={{
                textTransform: 'none',
                borderColor: alpha(theme.palette.success.main, 0.35),
                '&:hover': { borderColor: theme.palette.success.main, bgcolor: alpha(theme.palette.success.main, 0.06) },
              }}
            >
              Settings
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 0.5, borderColor: alpha(theme.palette.success.main, 0.2) }} />

        <MenuItem
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(user?.email || '');
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch {}
          }}
          sx={{ '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.06) } }}
        >
          <ListItemIcon>{copied ? <CheckRoundedIcon fontSize="small" color="success" /> : <ContentCopyRoundedIcon fontSize="small" />}</ListItemIcon>
          {copied ? 'Email copied!' : 'Copy email address'}
        </MenuItem>

        <Divider sx={{ my: 0.5, borderColor: alpha(theme.palette.success.main, 0.2) }} />

        <MenuItem
          onClick={() => {
            setUserMenuEl(null);
            handleLogout();
          }}
          sx={{ color: 'error.main', fontWeight: 600, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.06) } }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: Math.min(320, window.innerWidth * 0.9) } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'success.main' }}>{initials}</Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: 200 }}>
              {userName}
            </Typography>
            {user?.email && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
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
            onClick={() => {
              setDrawerOpen(false);
              setHelpMenuEl(document.body as any);
            }}
            sx={{
              mb: 1,
              textTransform: 'none',
              borderColor: alpha(theme.palette.success.main, 0.35),
              '&:hover': { borderColor: theme.palette.success.main, bgcolor: alpha(theme.palette.success.main, 0.06) },
            }}
          >
            Help
          </Button>
          <Button
            fullWidth
            size="small"
            color="error"
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={() => {
              setDrawerOpen(false);
              handleLogout();
            }}
            sx={{ textTransform: 'none' }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
