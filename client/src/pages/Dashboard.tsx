// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, CssBaseline, useTheme, useMediaQuery,
  FormControl, InputLabel, Select, MenuItem, Paper, Button,
  Stack, Card, CardContent, Chip, Divider, Skeleton,
  Tooltip as MuiTooltip, TextField, IconButton,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AISuggestionsPanel from '../components/AISuggestionsPanel';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import { askGPT } from '../services/chatService';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { loadProfile, saveProfile } from '../utils/profile';

interface LinePoint { year: string; value: number; }
interface PiePoint { name: string; value: number; }

const DEV_USER_ID = (process.env.REACT_APP_DEV_USER_ID || '66e000000000000000000001').trim();

const colorPalette = [
  '#2e7d32', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22',
  '#17becf', '#66bb6a', '#43a047', '#81c784', '#9ccc65',
];

// build clean bar series from latest breakdown
function toBarSeries(raw: PiePoint[]) {
  const clean = raw
    .map(({ name, value }) => {
      const parts = String(name).split(' - ').map(s => s.trim()).filter(Boolean);
      if (parts.length === 1 && /^total$/i.test(parts[0])) return { name: '', value };
      const filtered = parts.filter(p => !/^total$/i.test(p));
      const pretty = filtered.length === 0 ? '' : filtered.join(' - ');
      return { name: pretty, value: Number(value) || 0 };
    })
    .filter(d => d.name && d.value > 0);

  const agg = new Map<string, number>();
  for (const { name, value } of clean) agg.set(name, (agg.get(name) || 0) + value);

  return Array.from(agg.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function compactQuiz(q: any) {
  const out: any = {};
  for (const k of ['transport', 'energy', 'diet', 'consumption', 'basic']) if (q?.[k] != null) out[k] = q[k];
  return JSON.stringify(out).slice(0, 6000);
}

const Panel: React.FC<React.PropsWithChildren<{
  title?: string; subtitle?: string; actions?: React.ReactNode; minHeight?: number;
}>> = ({ title, subtitle, actions, children, minHeight }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 3,
      border: '1px solid rgba(117,183,141,0.35)',
      background: '#f3faef',
      overflow: 'hidden',
      minHeight,
      boxShadow: '0 6px 24px rgba(46,125,50,0.08)',
    }}
  >
    {(title || actions) && (
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
        <Box>
          {title && <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#1c6b34' }}>{title}</Typography>}
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        {actions}
      </Stack>
    )}
    <Divider sx={{ borderColor: 'rgba(117,183,141,0.25)' }} />
    <CardContent sx={{ p: 2 }}>{children}</CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // name (inline edit)
  const [userName, setUserName] = useState<string>(() => loadProfile().name);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(userName);

  const startEdit = () => { setDraftName(userName); setEditingName(true); };
  const cancelEdit = () => { setEditingName(false); setDraftName(userName); };
  const saveName = () => {
    const next = (draftName || '').trim() || 'Bro';
    saveProfile({ name: next });
    setUserName(next);
    setEditingName(false);
  };

  // data state
  const [lineData, setLineData] = useState<LinePoint[]>([]);
  const [pieData, setPieData] = useState<PiePoint[]>([]);
  const [emissionCategories, setEmissionCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Power stations - coal');

  // loading flags
  const [loadingLine, setLoadingLine] = useState(false);
  const [loadingPie, setLoadingPie] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  // gatekeeping
  const [checkingSubmission, setCheckingSubmission] = useState(true);
  const [hasSubmission, setHasSubmission] = useState<boolean>(false);

  // caches & aborts
  const categoriesLoadedRef = useRef(false);
  const lineCacheRef = useRef<Map<string, LinePoint[]>>(new Map());
  const pieCacheRef = useRef<PiePoint[] | null>(null);
  const quizAbortRef = useRef<AbortController | null>(null);
  const catsAbortRef = useRef<AbortController | null>(null);
  const dataAbortRef = useRef<AbortController | null>(null);

  // quiz exists?
  useEffect(() => {
    quizAbortRef.current?.abort();
    const ac = new AbortController();
    quizAbortRef.current = ac;
    (async () => {
      try {
        setCheckingSubmission(true);
        const res = await api.get('/api/quiz/latest', { headers: { 'x-user-id': DEV_USER_ID }, signal: ac.signal as any });
        setHasSubmission(Boolean(res.data));
      } catch {
        setHasSubmission(false);
      } finally {
        setCheckingSubmission(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // redirect if none
  useEffect(() => {
    if (checkingSubmission || hasSubmission) return;
    const t = setTimeout(() => navigate('/quiz'), 1600);
    return () => clearTimeout(t);
  }, [checkingSubmission, hasSubmission, navigate]);

  // categories
  useEffect(() => {
    if (!hasSubmission || categoriesLoadedRef.current) return;
    catsAbortRef.current?.abort();
    const ac = new AbortController();
    catsAbortRef.current = ac;
    (async () => {
      try {
        setLoadingCats(true);
        const res = await api.get('/api/ukgas/categories', { signal: ac.signal as any });
        setEmissionCategories(res.data || []);
        categoriesLoadedRef.current = true;
      } finally {
        setLoadingCats(false);
      }
    })();
    return () => ac.abort();
  }, [hasSubmission]);

  // chart data
  useEffect(() => {
    if (!hasSubmission || !selectedCategory) return;
    dataAbortRef.current?.abort();
    const ac = new AbortController();
    dataAbortRef.current = ac;
    (async () => {
      try {
        const cached = lineCacheRef.current.get(selectedCategory);
        if (cached) setLineData(cached);
        else {
          setLoadingLine(true);
          const res = await api.get(`/api/ukgas/${encodeURIComponent(selectedCategory)}`, { signal: ac.signal as any });
          const line: LinePoint[] = (res.data || [])
            .filter((d: any) => !isNaN(Number(d.year)))
            .map((d: any) => ({ year: String(d.year), value: Number(d.value) }));
          lineCacheRef.current.set(selectedCategory, line);
          setLineData(line);
          setLoadingLine(false);
        }

        if (pieCacheRef.current) setPieData(pieCacheRef.current);
        else {
          setLoadingPie(true);
          const res2 = await api.get('/api/ukgas/latest-breakdown', { signal: ac.signal as any });
          const pieRaw: PiePoint[] = (res2.data || []).map((p: any) => ({ name: p.name, value: Number(p.value) }));
          pieCacheRef.current = pieRaw;
          setPieData(pieRaw);
          setLoadingPie(false);
        }
      } catch {
        setLoadingLine(false);
        setLoadingPie(false);
      }
    })();
    return () => ac.abort();
  }, [hasSubmission, selectedCategory]);

  // post-quiz auto-run → tasks
  useEffect(() => {
    (async () => {
      if (checkingSubmission || !hasSubmission) return;
      const url = new URL(window.location.href);
      const wantsAuto = url.searchParams.get('auto') === '1' || localStorage.getItem('recalcAfterQuiz') === '1';
      if (!wantsAuto) return;

      try {
        const quiz = await api.get('/api/quiz/latest', { headers: { 'x-user-id': DEV_USER_ID } });
        const payload = compactQuiz(quiz.data);
        const raw = await askGPT(payload);
        let tips: any[] = [];
        try {
          const txt = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
          const parsed = JSON.parse(txt);
          tips = Array.isArray(parsed) ? parsed.slice(0, 5) : Array.isArray(parsed?.tips) ? parsed.tips.slice(0, 5) : [];
        } catch { tips = []; }
        if (tips.length) await api.post('/api/ai-suggestions', { tips }, { headers: { 'x-user-id': DEV_USER_ID } });

        const taskPayload = tips.map((tip: any, i: number) => ({
          title: tip.title || `AI Tip ${i + 1}`,
          details: tip.how || tip.why || '',
          cadence: /low/i.test(tip.difficulty || '') ? 'daily'
            : /high|install|solar|heat pump/i.test(String(tip.title || '') + String(tip.how || '')) ? 'yearly'
            : 'monthly',
          completed: false,
          source: 'ai',
          meta: tip,
        }));
        const existing = JSON.parse(localStorage.getItem('tasks') || '[]');
        const names = new Set(existing.map((t: any) => String(t.title).toLowerCase()));
        const merged = [...taskPayload.filter((t) => !names.has(String(t.title).toLowerCase())), ...existing];
        localStorage.setItem('tasks', JSON.stringify(merged));
      } finally {
        localStorage.removeItem('recalcAfterQuiz');
        const u = new URL(window.location.href); u.searchParams.delete('auto');
        window.history.replaceState({}, '', u.toString());
        navigate('/task');
      }
    })();
  }, [checkingSubmission, hasSubmission, navigate]);

  const showBlockingOverlay = useMemo(() => !checkingSubmission && !hasSubmission, [checkingSubmission, hasSubmission]);
  const barSeries = useMemo(() => toBarSeries(pieData), [pieData]);

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Header />
        <Box
          sx={{
            flex: 1, width: '100%', maxWidth: 1400, mx: 'auto', p: 3,
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.25fr 1fr', gap: 3, position: 'relative',
          }}
        >
          {showBlockingOverlay && (
            <Paper elevation={3} sx={{
              position: 'absolute', inset: 0, zIndex: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(234,245,225,0.9)',
              p: 3, textAlign: 'center', borderRadius: 2,
            }}>
              <Box>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Complete the carbon quiz to unlock your dashboard
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  We couldn’t find a submission for your account. Redirecting you to the form…
                </Typography>
                <Button variant="contained" color="success" onClick={() => navigate('/quiz')}>
                  Go to Quiz Now
                </Button>
              </Box>
            </Paper>
          )}

          {/* LEFT */}
          <Stack spacing={2} sx={{
            filter: showBlockingOverlay ? 'blur(4px)' : 'none',
            pointerEvents: showBlockingOverlay ? 'none' : 'auto',
            userSelect: showBlockingOverlay ? 'none' : 'auto',
            transition: 'filter 150ms ease',
          }}>
            <Panel
              minHeight={120}
              actions={
                <MuiTooltip title="Re-enter your details to refresh charts and AI">
                  <span>
                    <Button
                      variant="outlined" color="success" startIcon={<AutoFixHighIcon />}
                      onClick={() => { localStorage.setItem('recalcAfterQuiz', '1'); localStorage.setItem('postQuizReturn', '/dashboard?auto=1'); navigate('/quiz'); }}
                    >
                      Recalc Emissions
                    </Button>
                  </span>
                </MuiTooltip>
              }
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Box>
                  {/* --- inline editable name --- */}
                  {!editingName ? (
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Typography variant="h4" fontWeight={900} gutterBottom>
                        Welcome, {userName}!
                      </Typography>
                      <IconButton size="small" onClick={startEdit} aria-label="Edit name">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <TextField
                        size="small"
                        label="Your name"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        inputProps={{ maxLength: 40 }}
                      />
                      <IconButton color="success" onClick={saveName} aria-label="Save name">
                        <CheckIcon />
                      </IconButton>
                      <IconButton onClick={cancelEdit} aria-label="Cancel">
                        <CloseIcon />
                      </IconButton>
                    </Stack>
                  )}

                  <Typography variant="body1" color="text.secondary">
                    UK’s Energy Emissions Overview
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Chip size="small" icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />} label="Data: UK GHG inventory (latest)" variant="outlined" />
                  </Stack>
                </Box>
              </Stack>
            </Panel>

            <Panel
              title="Emissions by Year"
              subtitle={selectedCategory}
              actions={
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel id="category-label">Emission Category</InputLabel>
                  <Select
                    labelId="category-label"
                    value={selectedCategory}
                    label="Emission Category"
                    onChange={(e) => setSelectedCategory(e.target.value as string)}
                    disabled={!hasSubmission || loadingCats}
                  >
                    {loadingCats
                      ? <MenuItem value=""><em>Loading…</em></MenuItem>
                      : emissionCategories.map((cat, idx) => (<MenuItem key={idx} value={cat}>{cat}</MenuItem>))}
                  </Select>
                </FormControl>
              }
              minHeight={420}
            >
              {loadingLine ? (
                <Skeleton variant="rounded" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <ReTooltip />
                    <ReferenceLine y={0} stroke="#bbb" />
                    <Line type="monotone" dataKey="value" stroke="#2e7d32" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Top Emitting Categories (Latest Year)" subtitle="Share by category" minHeight={460}>
              {loadingPie ? (
                <Skeleton variant="rounded" height={360} />
              ) : (
                <Box sx={{ height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toBarSeries(pieData)} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={isMobile ? 120 : 220} tick={{ fontSize: 12 }} />
                      <ReTooltip />
                      <Legend />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                        {toBarSeries(pieData).map((_, idx) => (
                          <Cell key={`c-${idx}`} fill={colorPalette[idx % colorPalette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Panel>
          </Stack>

          {/* RIGHT */}
          <Box sx={{
            filter: showBlockingOverlay ? 'blur(4px)' : 'none',
            pointerEvents: showBlockingOverlay ? 'none' : 'auto',
            userSelect: showBlockingOverlay ? 'none' : 'auto',
            transition: 'filter 150ms ease',
            minWidth: isMobile ? '100%' : 400, display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <Panel title="AI Suggestions" subtitle="Personalized actions from your latest inputs"
              actions={<Chip icon={<BoltIcon sx={{ fontSize: 16 }} />} label="Live" size="small" color="warning" variant="outlined" />}
              minHeight={300}
            >
              <AISuggestionsPanel />
            </Panel>
          </Box>
        </Box>
        <Footer />
      </Box>
    </>
  );
};

export default Dashboard;
