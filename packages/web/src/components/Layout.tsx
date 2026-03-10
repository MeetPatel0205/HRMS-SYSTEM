import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Payments as PaymentsIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Work as WorkIcon,
  VolunteerActivism as VolunteerActivismIcon,
  FitnessCenter as FitnessCenterIcon,
  Policy as PolicyIcon,
  Description as DescriptionIcon,
  HowToReg as HowToRegIcon,
  ExitToApp as ExitToAppIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  ManageAccounts as ManageAccountsIcon,
  Security as SecurityIcon,
  Tune as TuneIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../store/index';
import { clearAuth } from '../store/authSlice';
import { AuthService } from '../services/authService';
import { NotificationCenter } from './NotificationCenter';
import { ChatWidget } from './chat/ChatWidget';

const DRAWER_WIDTH = 240;

// Role display helpers
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'Admin';
    case 'HR_MANAGER': return 'HR Manager';
    case 'MANAGER': return 'Manager';
    case 'EMPLOYEE': return 'Employee';
    default: return role;
  }
};

const getRoleColor = (role: string): 'error' | 'warning' | 'info' | 'success' | 'default' => {
  switch (role) {
    case 'ADMIN': return 'error';
    case 'HR_MANAGER': return 'warning';
    case 'MANAGER': return 'info';
    case 'EMPLOYEE': return 'success';
    default: return 'default';
  }
};

const getAvatarGradient = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    case 'HR_MANAGER': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    case 'MANAGER': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    case 'EMPLOYEE': return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }
};

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const menuItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Employees', icon: <PeopleIcon />, path: '/employees' },
    { label: 'Time & Attendance', icon: <ScheduleIcon />, path: '/time' },
    { label: 'Leave Management', icon: <ScheduleIcon />, path: '/leave' },
    { label: 'Payroll', icon: <PaymentsIcon />, path: '/payroll' },
    { label: 'Performance', icon: <AssessmentIcon />, path: '/performance' },
    { label: 'Learning', icon: <SchoolIcon />, path: '/learning' },
    { label: 'Recruitment', icon: <WorkIcon />, path: '/recruitment' },
    { label: 'Benefits', icon: <VolunteerActivismIcon />, path: '/benefits' },
    { label: 'Wellness', icon: <FitnessCenterIcon />, path: '/wellness' },
    { label: 'Compliance', icon: <PolicyIcon />, path: '/compliance' },
    { label: 'Documents', icon: <DescriptionIcon />, path: '/documents' },
    { label: 'Onboarding', icon: <HowToRegIcon />, path: '/onboarding' },
    { label: 'Offboarding', icon: <ExitToAppIcon />, path: '/offboarding' },
  ];

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLogout = () => {
    AuthService.logout();
    dispatch(clearAuth());
    navigate('/login');
  };

  const userRole = (user?.roles || [])[0] || '';
  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const getThemeClass = () => {
    if (userRole === 'HR_MANAGER') return 'theme-hr';
    if (userRole === 'MANAGER') return 'theme-manager';
    if (userRole === 'EMPLOYEE') return 'theme-employee';
    return '';
  };

  const themeClass = getThemeClass();

  const getFilteredMenuItems = () => {
    if (userRole === 'ADMIN') return menuItems;

    if (userRole === 'HR_MANAGER') {
      return menuItems.filter(item =>
        ['/dashboard', '/employees', '/leave', '/payroll', '/performance', '/learning', '/recruitment', '/benefits', '/wellness', '/compliance', '/documents', '/onboarding', '/offboarding'].includes(item.path)
      );
    }

    if (userRole === 'MANAGER') {
      return menuItems.filter(item =>
        ['/dashboard', '/time', '/leave', '/performance', '/learning', '/recruitment', '/wellness', '/documents'].includes(item.path)
      );
    }

    return menuItems.filter(item =>
      ['/dashboard', '/time', '/leave', '/payroll', '/performance', '/learning', '/benefits', '/wellness', '/compliance', '/documents', '/onboarding', '/offboarding'].includes(item.path)
    );
  };

  const filteredMenuItems = getFilteredMenuItems();

  const adminMenuItems = [
    { label: 'Admin Dashboard', icon: <DashboardIcon />, path: '/admin' },
    { label: 'User Management', icon: <ManageAccountsIcon />, path: '/admin/users' },
    { label: 'Role Management', icon: <SecurityIcon />, path: '/admin/roles' },
    { label: 'Access Panel', icon: <TuneIcon />, path: '/admin/access-panel' },
    { label: 'Audit Logs', icon: <HistoryIcon />, path: '/admin/audit-logs' },
  ];

  const isAdmin = (user?.roles || []).includes('ADMIN');

  const drawerContent = (
    <Box sx={{ pt: 2 }} className={themeClass}>
      <Typography variant="h6" sx={{ px: 2, mb: 2 }}>
        HRMS
      </Typography>
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {isAdmin && (
        <>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AdminPanelSettingsIcon fontSize="small" /> Admin Panel
            </Typography>
          </Box>
          <List>
            {adminMenuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => navigate(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }} className={themeClass}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            HRMS System
          </Typography>

          {/* ── Right side: Notifications + Profile ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationCenter />

            {/* Profile Button */}
            <Box
              onClick={handleProfileClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                ml: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: '50px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.12)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: getAvatarGradient(userRole),
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {userInitials}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1.2, color: 'inherit', fontSize: '0.65rem' }}>
                  {getRoleLabel(userRole)}
                </Typography>
              </Box>
              <KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.7, display: { xs: 'none', md: 'block' } }} />
            </Box>

            {/* Profile Dropdown Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 4px 20px rgba(0,0,0,0.15))',
                  mt: 1.5,
                  minWidth: 280,
                  borderRadius: '12px',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 20,
                    width: 12,
                    height: 12,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {/* Profile Header Card */}
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  background: getAvatarGradient(userRole),
                  borderRadius: '12px 12px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'rgba(255,255,255,0.25)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    border: '2px solid rgba(255,255,255,0.5)',
                    color: '#fff',
                  }}
                >
                  {userInitials}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.3 }} noWrap>
                    {user?.name || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', display: 'block' }} noWrap>
                    {user?.email || 'No email'}
                  </Typography>
                  <Chip
                    label={getRoleLabel(userRole)}
                    size="small"
                    sx={{
                      mt: 0.5,
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      bgcolor: 'rgba(255,255,255,0.25)',
                      color: '#fff',
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                </Box>
              </Box>

              {/* Menu Items */}
              <Box sx={{ py: 0.5 }}>
                <MenuItem
                  onClick={() => { setAnchorEl(null); navigate('/profile'); }}
                  sx={{
                    py: 1.2,
                    px: 2.5,
                    gap: 1.5,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <PersonIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>My Profile</Typography>
                    <Typography variant="caption" color="text.secondary">View and edit your profile</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  onClick={() => { setAnchorEl(null); navigate('/settings'); }}
                  sx={{
                    py: 1.2,
                    px: 2.5,
                    gap: 1.5,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <SettingsIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Settings</Typography>
                    <Typography variant="caption" color="text.secondary">Preferences & security</Typography>
                  </Box>
                </MenuItem>
              </Box>

              <Divider sx={{ my: 0.5 }} />

              {/* Logout */}
              <Box sx={{ py: 0.5 }}>
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    py: 1.2,
                    px: 2.5,
                    gap: 1.5,
                    color: 'error.main',
                    '&:hover': { bgcolor: 'error.lighter', color: 'error.dark' },
                  }}
                >
                  <LogoutIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={500}>Sign Out</Typography>
                </MenuItem>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            top: 64,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: 8,
          marginLeft: { xs: 0, sm: `${DRAWER_WIDTH}px` },
          width: { xs: '100%', sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Outlet />
      </Box>
      <ChatWidget />
    </Box>
  );
};

export default Layout;
