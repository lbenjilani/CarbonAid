import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Button,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Stack,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

const DEV_USER_ID = (process.env.REACT_APP_DEV_USER_ID || '66e000000000000000000001').trim();
const COLORS = ['#2e7d32', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9'];

/** ---------------------------
 * Emission factors (simple, transparent):
 * - TRANSPORT
 *   car: petrol/diesel ~0.192 kgCO2e/km; hybrid 0.12; electric 0.05
 *   bus: 0.105; rail: 0.041
 *   flights: short 250 kg/flight; long 1100 kg/flight
 * - ENERGY
 *   electricity: 0.2 kg/kWh; gas: 0.184 kg/kWh; solar reduces elec by 20%
 * - DIET (per person / year — rough):
 *   omnivore 2200; reduced 1600; pesc 1500; veg 1300; vegan 1000
 *   meals out +15 kg/wk; food waste 2.5 kg/kg
 *   local reduces up to 5%; organic up to 10%
 * - CONSUMPTION
 *   clothes 25 kg/item; electronics 0.4 kg per currency-unit; trash 0.8 kg/kg * (1 - recycle)
 * ---------------------------- */
const FACTORS = {
  transport: {
    carPerKm: { Petrol: 0.192, Diesel: 0.192, Hybrid: 0.12, Electric: 0.05 } as Record<string, number>,
    busPerKm: 0.105,
    railPerKm: 0.041,
    flightShort: 250,
    flightLong: 1100,
  },
  energy: {
    elecPerKwh: 0.2,
    gasPerKwh: 0.184,
    solarReduction: 0.2,
  },
  diet: {
    basePerPersonYear: {
      'Omnivore (meat daily)': 2200,
      'Reduced-meat (few times/week)': 1600,
      Pescatarian: 1500,
      Vegetarian: 1300,
      Vegan: 1000,
    } as Record<string, number>,
    mealOutPerWeek: 15,
    wastePerKg: 2.5,
    localReduction: 0.05,
    organicReduction: 0.1,
  },
  consumption: {
    clothesPerItem: 25,
    electronicsPerCurrency: 0.4,
    trashPerKg: 0.8,
  },
};

function periodMultiplier(period?: string): number {
  switch (period) {
    case 'Last 30 days': return 12;
    case 'Last 90 days': return 4;
    case 'Last 12 months': return 1;
    default: return 1;
  }
}

// Matches your quizRoutes payload
type QuizDoc = {
  basic?: {
    householdSize?: number;
    postcode?: string;
    period?: 'Last 30 days' | 'Last 90 days' | 'Last 12 months';
  };
  transport?: {
    carFuel?: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
    carKm?: number;
    carEfficiency?: number;
    busKm?: number;
    railKm?: number;
    shortFlights?: number;
    longFlights?: number;
  };
  energy?: {
    elecKwh?: number;
    tariff?: string;
    solar?: 'None' | 'Solar PV (roof)' | 'Community solar';
    heatType?: 'Natural Gas' | 'Heating Oil' | 'Electric (Heat Pump)' | 'Electric (Resistive)' | 'District Heating' | 'Biomass';
    gasKwh?: number;
    homeArea?: number;
  };
  diet?: {
    dietType?: 'Omnivore (meat daily)' | 'Reduced-meat (few times/week)' | 'Pescatarian' | 'Vegetarian' | 'Vegan';
    eatingOut?: number;
    foodWaste?: number;
    localShare?: number;
    organicShare?: number;
  };
  consumption?: {
    clothesItems?: number;
    electronicsSpend?: number;
    recycleRate?: number;
    trashKg?: number;
  };
  meta?: {
    submittedAt?: string;
    source?: string;
    version?: number;
    period?: 'Last 30 days' | 'Last 90 days' | 'Last 12 months';
  };
};

type CategoryBreakdown = {
  transport: number;
  energy: number;
  diet: number;
  consumption: number;
  total: number;
  sub: Record<string, number>;
};

const Report: React.FC = () => {
  // ✅ Declare once
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/api/quiz/latest', { headers: { 'x-user-id': DEV_USER_ID } });
        setQuiz(res.data ?? null);
      } catch (e) {
        console.error('Failed to fetch latest quiz', e);
        setQuiz(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const breakdown = useMemo<CategoryBreakdown | null>(() => {
    if (!quiz) return null;

    const period = quiz.basic?.period || quiz.meta?.period || 'Last 12 months';
    const mult = periodMultiplier(period);
    const household = Math.max(1, Number(quiz.basic?.householdSize || 1));

    // ----- TRANSPORT -----
    const carFuel = quiz.transport?.carFuel || 'Petrol';
    const carKm = Number(quiz.transport?.carKm || 0) * mult;
    const busKm = Number(quiz.transport?.busKm || 0) * mult;
    const railKm = Number(quiz.transport?.railKm || 0) * mult;
    const sFlights = Number(quiz.transport?.shortFlights || 0) * mult;
    const lFlights = Number(quiz.transport?.longFlights || 0) * mult;

    const carEF = FACTORS.transport.carPerKm[carFuel] ?? 0.192;
    const carCO2 = carKm * carEF;
    const busCO2 = busKm * FACTORS.transport.busPerKm;
    const railCO2 = railKm * FACTORS.transport.railPerKm;
    const flightCO2 = sFlights * FACTORS.transport.flightShort + lFlights * FACTORS.transport.flightLong;
    const transportCO2 = carCO2 + busCO2 + railCO2 + flightCO2;

    // ----- ENERGY -----
    let elecKwh = Number(quiz.energy?.elecKwh || 0) * mult;
    const gasKwh = Number(quiz.energy?.gasKwh || 0) * mult;
    const hasSolar = (quiz.energy?.solar && quiz.energy?.solar !== 'None') ? 1 : 0;
    const heatType = quiz.energy?.heatType || 'Natural Gas';

    if (hasSolar) elecKwh = elecKwh * (1 - FACTORS.energy.solarReduction);

    const elecCO2 = elecKwh * FACTORS.energy.elecPerKwh;
    const gasCO2 = heatType === 'Electric (Heat Pump)' ? 0 : (gasKwh * FACTORS.energy.gasPerKwh);
    const energyCO2 = elecCO2 + gasCO2;

    // ----- DIET -----
    const dietType = quiz.diet?.dietType || 'Omnivore (meat daily)';
    const basePerPerson = FACTORS.diet.basePerPersonYear[dietType] ?? 2000;
    const mealsOut = Number(quiz.diet?.eatingOut || 0) * 52;
    const foodWasteKg = Number(quiz.diet?.foodWaste || 0) * 52;
    const localShare = Math.min(100, Math.max(0, Number(quiz.diet?.localShare || 0))) / 100;
    const organicShare = Math.min(100, Math.max(0, Number(quiz.diet?.organicShare || 0))) / 100;

    let dietCO2 = basePerPerson * household;
    dietCO2 += mealsOut * FACTORS.diet.mealOutPerWeek;
    dietCO2 += foodWasteKg * FACTORS.diet.wastePerKg;
    dietCO2 *= (1 - localShare * FACTORS.diet.localReduction);
    dietCO2 *= (1 - organicShare * FACTORS.diet.organicReduction);

    // ----- CONSUMPTION -----
    const clothesItems = Number(quiz.consumption?.clothesItems || 0) * 12;
    const electronicsSpend = Number(quiz.consumption?.electronicsSpend || 0) * mult;
    const recycleRate = Math.min(100, Math.max(0, Number(quiz.consumption?.recycleRate || 0))) / 100;
    const trashKgWeek = Number(quiz.consumption?.trashKg || 0) * 52;

    const clothesCO2 = clothesItems * FACTORS.consumption.clothesPerItem;
    const electronicsCO2 = electronicsSpend * FACTORS.consumption.electronicsPerCurrency;
    const trashCO2 = trashKgWeek * FACTORS.consumption.trashPerKg * (1 - recycleRate);
    const consumptionCO2 = clothesCO2 + electronicsCO2 + trashCO2;

    const total = transportCO2 + energyCO2 + dietCO2 + consumptionCO2;

    const sub: Record<string, number> = {
      'Car (km)': carCO2,
      'Bus (km)': busCO2,
      'Rail (km)': railCO2,
      'Flights': flightCO2,
      'Electricity (kWh)': elecCO2,
      'Gas/Heat (kWh)': gasCO2,
      'Diet baseline': basePerPerson * household,
      'Meals out': mealsOut * FACTORS.diet.mealOutPerWeek,
      'Food waste': foodWasteKg * FACTORS.diet.wastePerKg,
      'Clothes': clothesCO2,
      'Electronics': electronicsCO2,
      'General trash': trashCO2,
    };

    return {
      transport: transportCO2,
      energy: energyCO2,
      diet: dietCO2,
      consumption: consumptionCO2,
      total,
      sub,
    };
  }, [quiz]);

  const pieData = useMemo(
    () =>
      !breakdown
        ? []
        : [
            { name: 'Transport', value: breakdown.transport },
            { name: 'Home Energy', value: breakdown.energy },
            { name: 'Diet', value: breakdown.diet },
            { name: 'Consumption', value: breakdown.consumption },
          ],
    [breakdown]
  );

  const barData = useMemo(() => {
    if (!breakdown) return [];
    return Object.entries(breakdown.sub)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, emissions: Math.round(value) }));
  }, [breakdown]);

  const submittedAt = quiz?.meta?.submittedAt
    ? new Date(quiz.meta.submittedAt).toLocaleString()
    : '';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4" fontWeight="bold">
            🌍 Carbon Emission Report
          </Typography>
          {submittedAt && (
            <Chip label={`Last submitted: ${submittedAt}`} variant="outlined" color="success" />
          )}
        </Stack>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Based on your latest questionnaire{quiz?.basic?.period ? ` (${quiz.basic.period})` : ''}.
        </Typography>

        {/* GRID */}
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={3} mb={4}>
          {/* Donut */}
          <Paper elevation={3} sx={{ flex: 1, p: 3, bgcolor: '#f0f8e0' }}>
            <Typography variant="h6" mb={2} textAlign="center">
              Annual Footprint by Category
            </Typography>
            <Typography variant="body2" textAlign="center" color="text.secondary" mb={1}>
              Total: <strong>{breakdown ? Math.round(breakdown.total).toLocaleString() : '—'}</strong> kg CO₂e / yr
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
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
                  <ReTooltip formatter={(v: number) => `${Math.round(v).toLocaleString()} kg CO₂e`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Top drivers bar */}
          <Paper elevation={3} sx={{ flex: 1, p: 3, bgcolor: '#f0f8e0' }}>
            <Typography variant="h6" mb={2} textAlign="center">
              Top Emission Drivers
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <ReTooltip formatter={(v: number) => `${v} kg CO₂e`} />
                  <Bar dataKey="emissions" fill="#4caf50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>

        {/* Facts table */}
        <Paper elevation={3} sx={{ p: 3, bgcolor: '#f0f8e0', mb: 4 }}>
          <Typography variant="h6" mb={2}>
            What we used from your inputs
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Section</TableCell>
                <TableCell>Field</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell>Transport</TableCell><TableCell>Car fuel</TableCell><TableCell>{quiz?.transport?.carFuel || '—'}</TableCell></TableRow>
              <TableRow><TableCell>Transport</TableCell><TableCell>Car km</TableCell><TableCell>{quiz?.transport?.carKm ?? '—'} (annualized x{quiz?.basic?.period ? periodMultiplier(quiz.basic.period) : 1})</TableCell></TableRow>
              <TableRow><TableCell>Transport</TableCell><TableCell>Bus / Rail km</TableCell><TableCell>{quiz?.transport?.busKm ?? 0} / {quiz?.transport?.railKm ?? 0} (annualized)</TableCell></TableRow>
              <TableRow><TableCell>Transport</TableCell><TableCell>Flights (short / long)</TableCell><TableCell>{quiz?.transport?.shortFlights ?? 0} / {quiz?.transport?.longFlights ?? 0} (annualized)</TableCell></TableRow>
              <TableRow><TableCell>Energy</TableCell><TableCell>Electricity (kWh)</TableCell><TableCell>{quiz?.energy?.elecKwh ?? '—'} (annualized)</TableCell></TableRow>
              <TableRow><TableCell>Energy</TableCell><TableCell>Solar</TableCell><TableCell>{quiz?.energy?.solar || 'None'}</TableCell></TableRow>
              <TableRow><TableCell>Energy</TableCell><TableCell>Heat type</TableCell><TableCell>{quiz?.energy?.heatType || '—'}</TableCell></TableRow>
              <TableRow><TableCell>Energy</TableCell><TableCell>Gas/Heat (kWh)</TableCell><TableCell>{quiz?.energy?.gasKwh ?? '—'} (annualized)</TableCell></TableRow>
              <TableRow><TableCell>Diet</TableCell><TableCell>Diet type</TableCell><TableCell>{quiz?.diet?.dietType || '—'}</TableCell></TableRow>
              <TableRow><TableCell>Diet</TableCell><TableCell>Meals out / week</TableCell><TableCell>{quiz?.diet?.eatingOut ?? 0}</TableCell></TableRow>
              <TableRow><TableCell>Diet</TableCell><TableCell>Food waste kg / week</TableCell><TableCell>{quiz?.diet?.foodWaste ?? 0}</TableCell></TableRow>
              <TableRow><TableCell>Diet</TableCell><TableCell>Local% / Organic%</TableCell><TableCell>{quiz?.diet?.localShare ?? 0}% / {quiz?.diet?.organicShare ?? 0}%</TableCell></TableRow>
              <TableRow><TableCell>Consumption</TableCell><TableCell>Clothes items / month</TableCell><TableCell>{quiz?.consumption?.clothesItems ?? 0}</TableCell></TableRow>
              <TableRow><TableCell>Consumption</TableCell><TableCell>Electronics spend (period)</TableCell><TableCell>{quiz?.consumption?.electronicsSpend ?? 0}</TableCell></TableRow>
              <TableRow><TableCell>Consumption</TableCell><TableCell>Recycling rate / Trash kg / week</TableCell><TableCell>{quiz?.consumption?.recycleRate ?? 0}% / {quiz?.consumption?.trashKg ?? 0}</TableCell></TableRow>
            </TableBody>
          </Table>
        </Paper>

        <Divider sx={{ my: 4 }} />

        <Box display="flex" justifyContent="center" gap={2}>
          <Button
            variant="contained"
            color="success"
            sx={{ fontWeight: 'bold', px: 4 }}
            onClick={() => navigate('/quiz')}
          >
            Recalculate (edit quiz)
          </Button>
          <Button
            variant="outlined"
            color="success"
            sx={{ fontWeight: 'bold', px: 4 }}
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
      <Footer />
    </Box>
  );
};

export default Report;
