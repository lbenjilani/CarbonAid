import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  CssBaseline,
  Divider,
  Paper,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Header from '../components/Header';
import Footer from '../components/Footer';

const pieData = [
  { name: 'Transport', value: 3.2 },
  { name: 'Home Energy', value: 2.4 },
  { name: 'Food', value: 1.6 },
  { name: 'Other', value: 1.2 },
];

const lineData = [
  { report: 'Jan', value: 7.5 },
  { report: 'Feb', value: 7.8 },
  { report: 'Mar', value: 8.0 },
  { report: 'Apr', value: 8.2 },
  { report: 'May', value: 8.4 },
];

const pieColors = ['#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'];

const Dashboard: React.FC = () => {
  const userName = 'John';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <>
      <CssBaseline />

      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#eaf5e1',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />

        <Box
          sx={{
            width: '100%',
            maxWidth: 1280,
            mx: 'auto',
            flexGrow: 1,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            p: 2,
            gap: 3,
            overflowY: 'auto',
          }}
        >
          {/* Main Content Left Side */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 4,
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Welcome, {userName}!
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Your dashboard to track and reduce carbon impact 🌱
            </Typography>

            <Box mt={4} mb={2} textAlign="center">
              <Typography variant="h3" fontWeight="bold" color="primary">
                8.4 tCO₂ / year
              </Typography>
              <Typography variant="caption" color="error">
                2.4 tonnes above target
              </Typography>
            </Box>

            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                  isAnimationActive
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <ReTooltip />
                <ReLegend />
              </PieChart>
            </ResponsiveContainer>

            <Box width="100%" mt={5}>
              <Typography variant="subtitle1" textAlign="center" mb={1}>
                Emission Progress Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="report" />
                  <YAxis label={{ value: 'tCO₂', angle: -90, position: 'insideLeft' }} />
                  <ReTooltip />
                  <ReLegend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#66bb6a"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 8 }}
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Sidebar Panel on Right */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              p: 3,
              bgcolor: '#dcedc8',
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            <Card sx={{ bgcolor: '#f0f8e0' }}>
              <CardHeader title="Current Carbon Footprint" sx={{ textAlign: 'center' }} />
              <CardContent>
                <Typography variant="h4" align="center" fontWeight="bold">
                  8.4 tCO₂
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: '#f0f8e0' }}>
              <CardHeader title="Goal Carbon Footprint" sx={{ textAlign: 'center' }} />
              <CardContent>
                <Typography variant="h4" align="center" fontWeight="bold">
                  6.0 tCO₂
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: '#f0f8e0' }}>
              <CardHeader title="Suggestions" sx={{ textAlign: 'center' }} />
              <CardContent>
                <Typography variant="body1" gutterBottom>
                  Here are some personalized tips:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  <li>Use greener transportation</li>
                  <li>Improve home insulation</li>
                  <li>Adopt plant-based meals</li>
                </ul>
              </CardContent>
            </Card>

            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" color="success" sx={{ fontWeight: 'bold' }}>
                Recalculate Emission
              </Button>
            </Box>
          </Box>
        </Box>

        <Footer />
      </Box>
    </>
  );
};

export default Dashboard;
