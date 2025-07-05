import React from 'react';
import {
  Box,
  Typography,
  Container,
  Button,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import Header from '../components/Header';
import Footer from '../components/Footer';

const pieData = [
  { name: 'Transportation', value: 40 },
  { name: 'Energy', value: 25 },
  { name: 'Food', value: 20 },
  { name: 'Other', value: 15 },
];

const COLORS = ['#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'];

const barData = [
  { name: 'Jan', emissions: 120 },
  { name: 'Feb', emissions: 90 },
  { name: 'Mar', emissions: 150 },
  { name: 'Apr', emissions: 100 },
];

const radialData = [
  { name: 'Goal Progress', uv: 70, fill: '#66bb6a' },
];

const Report: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
          🌍 Carbon Emission Report
        </Typography>
        <Typography variant="subtitle1" textAlign="center" mb={4}>
          Visual insights of your carbon footprint and goals
        </Typography>

        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={3} mb={4}>
          {/* Pie Chart */}
          <Paper elevation={3} sx={{ flex: 1, p: 3, bgcolor: '#f0f8e0' }}>
            <Typography variant="h6" mb={2} textAlign="center">
              Emission Breakdown by Source
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#eaf5e1"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Radial Progress */}
          <Paper elevation={3} sx={{ flex: 1, p: 3, bgcolor: '#f0f8e0' }}>
            <Typography variant="h6" mb={2} textAlign="center">
              Annual Goal Progress
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="80%"
                  outerRadius="100%"
                  barSize={18}
                  data={radialData}
                  startAngle={90}
                  endAngle={450}
                >
                  <RadialBar background dataKey="uv" />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend
                    iconSize={10}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>

        {/* Monthly Bar Chart */}
        <Paper elevation={3} sx={{ p: 3, bgcolor: '#f0f8e0', mb: 4 }}>
          <Typography variant="h6" mb={2} textAlign="center">
            Monthly Emission Trend
          </Typography>
          <Box sx={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="emissions" fill="#66bb6a" radius={[4, 4, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Divider sx={{ my: 4 }} />

        <Box display="flex" justifyContent="center">
          <Button variant="contained" color="success" sx={{ fontWeight: 'bold', px: 4 }}>
            Recalculate Emission
          </Button>
        </Box>
      </Container>
      <Footer />
    </Box>
  );
};

export default Report;
