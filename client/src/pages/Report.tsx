import React from 'react';
import {
  Box,
  Typography,
  Container,
  Button,
  Paper,
  Divider,
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

const COLORS = ['#4C9AFF', '#00C49F', '#FFBB28', '#FF8042'];

const barData = [
  { name: 'Jan', emissions: 120 },
  { name: 'Feb', emissions: 90 },
  { name: 'Mar', emissions: 150 },
  { name: 'Apr', emissions: 100 },
];

const radialData = [
  {
    name: 'Goal Progress',
    uv: 70,
    fill: '#00C49F',
  },
];

const Report: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f3f9f1' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
          🌍 Your Carbon Footprint Dashboard
        </Typography>
        <Typography variant="subtitle1" textAlign="center" mb={4}>
          Visual overview of your emissions and progress
        </Typography>

        {/* All Charts Grouped Together */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            alignItems: 'center',
            mb: 4,
          }}
        >
          {/* Top Row: Pie & Radial */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              width: '100%',
              maxWidth: '1000px',
            }}
          >
            {/* Pie Chart */}
            <Paper elevation={3} sx={{ flex: 1, p: 2 }}>
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
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            {/* Radial Chart */}
            <Paper elevation={3} sx={{ flex: 1, p: 2 }}>
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

          {/* Bar Chart Full Width */}
          <Box sx={{ width: '100%', maxWidth: '1000px' }}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" mb={2} textAlign="center">
                Monthly Emission Trend
              </Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="emissions" fill="#4C9AFF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box display="flex" justifyContent="flex-end">
          <Button variant="contained" color="success">
            Recalculate Your Emission
          </Button>
        </Box>
      </Container>
      <Footer />
    </Box>
  );
};

export default Report;
