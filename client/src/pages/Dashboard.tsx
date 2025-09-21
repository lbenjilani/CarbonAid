// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Paper,
  Button,
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

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const DEV_USER_ID =
  (process.env.REACT_APP_DEV_USER_ID || '66e000000000000000000001').trim();

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

    const subsectorRaw = rest.join(' - ') || 'Other';
    const subsector = `${sector} - ${subsectorRaw}`; // ensure uniqueness for child ids/keys

    let sectorNode = root.children.find((c: any) => c.name === sector);
    if (!sectorNode) {
      sectorNode = { name: sector, children: [], color: colorPalette[colorIndex++ % colorPalette.length] };
      root.children.push(sectorNode);
    }

    sectorNode.children.push({
      name: subsector,
      value,
      color: colorPalette[colorIndex++ % colorPalette.length],
    });
  });

  return root;
};


const Dashboard: React.FC = () => {
  const userName = 'John'; // replace with real auth context when ready
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Data
  const [lineData, setLineData] = useState<LinePoint[]>([]);
  const [pieData, setPieData] = useState<PiePoint[]>([]);
  const [emissionCategories, setEmissionCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Power stations - coal');

  // Gatekeeping
  const [checkingSubmission, setCheckingSubmission] = useState(true);
  const [hasSubmission, setHasSubmission] = useState<boolean>(false);

  // 1) Check if user has filled the quiz (DB)
  useEffect(() => {
    void (async () => {
      try {
        setCheckingSubmission(true);
        const res = await fetch(`${API_BASE}/api/quiz/latest`, {
          headers: { 'x-user-id': DEV_USER_ID }
        });
        const latest = await res.json();
        setHasSubmission(Boolean(latest));
      } catch (e) {
        console.error('quiz/latest failed:', e);
        setHasSubmission(false);
      } finally {
        setCheckingSubmission(false);
      }
    })();
  }, []);

  // 2) If no submission, auto-redirect to form after a brief notice
  useEffect(() => {
    if (checkingSubmission) return;
    if (hasSubmission) return;

    const t = setTimeout(() => {
      navigate('/quiz'); // <-- your quiz form route
    }, 2000);

    return () => { clearTimeout(t); };
  }, [checkingSubmission, hasSubmission, navigate]);

  // 3) Load categories only if we have a submission
  useEffect(() => {
    if (!hasSubmission) return;

    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ukgas/categories`);
        const cats = await res.json();
        setEmissionCategories(cats);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [hasSubmission]);

  // 4) Load charts only if we have a submission and a selected category
  useEffect(() => {
    if (!hasSubmission) return;
    if (!selectedCategory) return;

    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ukgas/${encodeURIComponent(selectedCategory)}`);
        const data = await res.json();
        const line = data
          .filter((d: any) => !isNaN(Number(d.year)))
          .map((d: any) => ({
            year: d.year,
            value: typeof d.value === 'number' ? d.value : Number(d.value),
          }));
        setLineData(line);

        const res2 = await fetch(`${API_BASE}/api/ukgas/latest-breakdown`);
        const pieRaw: PiePoint[] = await res2.json();
        setPieData(pieRaw.map(p => ({
          name: p.name,
          value: typeof p.value === 'number' ? p.value : Number(p.value),
        })));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [hasSubmission, selectedCategory]);

  const showBlockingOverlay = !checkingSubmission && !hasSubmission;

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
            position: 'relative',
          }}
        >
          {/* Overlay if user hasn't submitted */}
          {showBlockingOverlay && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(234,245,225,0.9)',
                p: 3,
                textAlign: 'center',
              }}
            >
              <Box>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Complete the carbon quiz to unlock your dashboard
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  We couldn’t find a submission for your account. You’ll be redirected to the form in a moment…
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => navigate('/quiz')}
                >
                  Go to Quiz Now
                </Button>
              </Box>
            </Paper>
          )}

          {/* Left Charts Section (blur/disable when blocked) */}
          <Box
            flex={2}
            sx={{
              filter: showBlockingOverlay ? 'blur(4px)' : 'none',
              pointerEvents: showBlockingOverlay ? 'none' : 'auto',
              userSelect: showBlockingOverlay ? 'none' : 'auto',
              transition: 'filter 150ms ease',
            }}
            aria-hidden={showBlockingOverlay ? true : undefined}
          >
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
                onChange={(e) => setSelectedCategory(e.target.value as string)}
                disabled={!hasSubmission}
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
                  // colors supplied by node.data.color
                  colors={(node: any) => node.data.color}
                  childColor={undefined}
                  arcLabel={(d: any) => d.id.toString()}
                  arcLabelsSkipAngle={4}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}
                  tooltip={({ id, value }) => (
                    <strong>{id}: {value}</strong>
                  )}
                />
              </Box>
            </Box>
          </Box>

          {/* AI Suggestions Panel (also blurred when blocked) */}
          <Box
            mt={3}
            sx={{
              filter: showBlockingOverlay ? 'blur(4px)' : 'none',
              pointerEvents: showBlockingOverlay ? 'none' : 'auto',
              userSelect: showBlockingOverlay ? 'none' : 'auto',
              transition: 'filter 150ms ease',
              minWidth: isMobile ? '100%' : 360,
            }}
            aria-hidden={showBlockingOverlay ? true : undefined}
          >
            <AISuggestionsPanel />
          </Box>
        </Box>

        <Footer />
      </Box>
    </>
  );
};

export default Dashboard;
