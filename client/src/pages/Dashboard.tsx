// Dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CssBaseline,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AISuggestionsPanel from '../components/AISuggestionsPanel';
import { ResponsiveSunburst } from '@nivo/sunburst';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LinePoint {
  year: string;
  value: number;
}

interface PiePoint {
  name: string;
  value: number;
}

const API_BASE = 'http://localhost:5000';

const colorPalette = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
];

const convertToSunburstData = (flatData: { name: string; value: number }[]) => {
  const grouped: Record<string, number> = {};

  flatData.forEach(({ name, value }) => {
    if (name === 'Total') return;
    const [sector] = name.split(' - ');
    grouped[sector] = (grouped[sector] || 0) + value;
  });

  const topSectors = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector]) => sector);

  const root: any = { name: 'UK Emissions', children: [] };
  let colorIndex = 0;

  flatData.forEach(({ name, value }) => {
    const [sector = 'Other', ...rest] = name.split(' - ');
    if (!topSectors.includes(sector)) return;

    const subsector = rest.join(' - ') || 'Other';

    let sectorNode = root.children.find((c: any) => c.name === sector);
    if (!sectorNode) {
      sectorNode = { name: sector, children: [], color: colorPalette[colorIndex++ % colorPalette.length] };
      root.children.push(sectorNode);
    }

    sectorNode.children.push({
      name: subsector,
      value,
      color: colorPalette[colorIndex++ % colorPalette.length]
    });
  });

  return root;
};

const Dashboard: React.FC = () => {
  const userName = 'John';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [lineData, setLineData] = useState<LinePoint[]>([]);
  const [pieData, setPieData] = useState<PiePoint[]>([]);
  const [emissionCategories, setEmissionCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Power stations - coal');

  useEffect(() => {
    fetch(`${API_BASE}/api/ukgas/categories`)
      .then(res => res.json())
      .then(setEmissionCategories);
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;

    fetch(`${API_BASE}/api/ukgas/${encodeURIComponent(selectedCategory)}`)
      .then(res => res.json())
      .then(data => {
        const line = data
          .filter((d: any) => !isNaN(Number(d.year)))
          .map((d: any) => ({
            year: d.year,
            value: typeof d.value === 'number' ? d.value : Number(d.value),
          }));
        setLineData(line);
      });

    fetch(`${API_BASE}/api/ukgas/latest-breakdown`)
      .then(res => res.json())
      .then((data: PiePoint[]) => {
        setPieData(data.map(p => ({
          name: p.name,
          value: typeof p.value === 'number' ? p.value : Number(p.value),
        })));
      });
  }, [selectedCategory]);

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
        <Header />

        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 1400,
            mx: 'auto',
            p: 3,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 3,
          }}
        >
          {/* Left Charts Section */}
          <Box flex={2}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Welcome, {userName}!
            </Typography>
            <Typography variant="h6" color="text.secondary">
              UK's Energy Emissions Dashboard
            </Typography>

            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel id="category-label">Emission Category</InputLabel>
              <Select
                labelId="category-label"
                value={selectedCategory}
                label="Emission Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {emissionCategories.map((cat, idx) => (
                  <MenuItem key={idx} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box mt={4}>
              <Typography variant="subtitle1" gutterBottom>
                Emissions by Year ({selectedCategory})
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#66bb6a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            <Box mt={6}>
              <Typography variant="subtitle1" gutterBottom>
                Emission Breakdown by Category (Latest Year)
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveSunburst
                  data={convertToSunburstData(pieData)}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  id="name"
                  value="value"
                  cornerRadius={2}
                  borderColor={{ theme: 'background' }}
                  animate
                  motionConfig="gentle"

                  // 💡 These are now handled manually via data.color
                  colors={node => node.data.color}
                  childColor={undefined}

                  arcLabel={d => d.id.toString()}
                  arcLabelsSkipAngle={4}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}

                  tooltip={({ id, value }) => (
                    <strong>{id}: {value}</strong>
                  )}
                />
              </Box>
            </Box>
          </Box>

          {/* AI Panel */}
          <Box flex={1}>
            <AISuggestionsPanel />
          </Box>
        </Box>

        <Footer />
      </Box>
    </>
  );
};

export default Dashboard;
