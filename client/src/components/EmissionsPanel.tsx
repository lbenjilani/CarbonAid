// src/components/EmissionsPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  Card,
  CardContent,
  Divider,
  Typography,
  Skeleton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Tooltip as MuiTooltip,
  Button,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, Legend,
} from 'recharts';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import api from '../services/api';

interface LinePoint { year: string; value: number; }
interface PiePoint { name: string; value: number; }

const DEV_USER_ID = (process.env.REACT_APP_DEV_USER_ID || '66e000000000000000000001').trim();

const colorPalette = [
  '#2e7d32', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22',
  '#17becf', '#66bb6a', '#43a047', '#81c784', '#9ccc65',
];

/* ---------------- shared helpers ---------------- */
const parseNumber = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').match(/-?\d+(\.\d+)?/)?.[0] ?? '';
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

function toBarSeries(raw: unknown[]): { name: string; value: number }[] {
  const normalized: { name: string; value: number }[] = (Array.isArray(raw) ? raw : []).map((p: any) => {
    const name: string = String(p?.name ?? p?.category ?? p?.sector ?? p?.label ?? '').trim();
    const value: number = parseNumber(p?.value ?? p?.amount ?? p?.emissions ?? p?.co2);
    return { name, value };
  });

  const filtered: { name: string; value: number }[] = normalized
    .map(({ name, value }): { name: string; value: number } => {
      const parts: string[] = name
        .split(' - ')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const withoutTotals: string[] = parts.filter((part: string) => !/^total$/i.test(part));
      const pretty: string = withoutTotals.length ? withoutTotals.join(' - ') : name;

      return { name: pretty, value };
    })
    .filter((d): d is { name: string; value: number } => d.name.length > 0 && Number.isFinite(d.value) && d.value > 0);

  const agg = new Map<string, number>();
  for (const { name, value } of filtered) {
    agg.set(name, (agg.get(name) || 0) + value);
  }

  return Array.from(agg.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

/* ---------------- panel shell (local) ---------------- */
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

/* ---------------- component ---------------- */
type EmissionsPanelProps = {
  disabled?: boolean;
};

const EmissionsPanel: React.FC<EmissionsPanelProps> = ({ disabled }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [emissionCategories, setEmissionCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Power stations - coal');

  const [lineData, setLineData] = useState<LinePoint[]>([]);
  const [pieData, setPieData] = useState<PiePoint[]>([]);

  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingLine, setLoadingLine] = useState(false);
  const [loadingPie, setLoadingPie] = useState(false);

  const categoriesLoadedRef = useRef(false);
  const lineCacheRef = useRef<Map<string, LinePoint[]>>(new Map());
  const pieCacheRef = useRef<PiePoint[] | null>(null);
  const catsAbortRef = useRef<AbortController | null>(null);
  const dataAbortRef = useRef<AbortController | null>(null);
  const builtFallbackRef = useRef(false);

  /* -------- categories -------- */
  useEffect(() => {
    if (disabled || categoriesLoadedRef.current) return;
    catsAbortRef.current?.abort();
    const ac = new AbortController();
    catsAbortRef.current = ac;

    (async () => {
      const t0 = performance.now();
      try {
        setLoadingCats(true);
        const res = await api.get('/api/ukgas/categories', { signal: ac.signal as any });
        console.groupCollapsed('[ukgas/categories] ✔ success');
        console.log('count:', Array.isArray(res) ? (res as any).length : Array.isArray((res as any)?.data) ? (res as any).data.length : 0);
        console.log('time(ms):', Math.round(performance.now() - t0));
        console.groupEnd();
        const data = (res as any)?.data ?? res;
        setEmissionCategories(Array.isArray(data) ? data : []);
        categoriesLoadedRef.current = true;
      } catch (err: any) {
        console.groupCollapsed('[ukgas/categories] ✖ error');
        console.error(err?.message || err);
        console.groupEnd();
      } finally {
        setLoadingCats(false);
      }
    })();

    return () => ac.abort();
  }, [disabled]);

  /* -------- charts data (timeseries + latest breakdown) -------- */
  useEffect(() => {
    if (disabled || !selectedCategory) return;
    dataAbortRef.current?.abort();
    const ac = new AbortController();
    dataAbortRef.current = ac;

    (async () => {
      /* timeseries by category */
      try {
        const cached = lineCacheRef.current.get(selectedCategory);
        if (cached) {
          console.groupCollapsed('[ukgas/:category] cache hit');
          console.log('category:', selectedCategory, 'points:', cached.length);
          console.groupEnd();
          setLineData(cached);
        } else {
          setLoadingLine(true);
          const res = await api.get(`/api/ukgas/${encodeURIComponent(selectedCategory)}`, { signal: ac.signal as any });
          const arr = Array.isArray((res as any)) ? (res as any) : (res as any)?.data || [];
          const line: LinePoint[] = (arr || [])
            .filter((d: any) => !isNaN(Number(d.year)))
            .map((d: any) => ({ year: String(d.year), value: Number(d.value) }));
          console.groupCollapsed('[ukgas/:category] ✔ success');
          console.log('category:', selectedCategory);
          console.log('mapped points:', line.length);
          console.groupEnd();
          lineCacheRef.current.set(selectedCategory, line);
          setLineData(line);
          setLoadingLine(false);
        }
      } catch (err: any) {
        console.groupCollapsed('[ukgas/:category] ✖ error');
        console.error('category:', selectedCategory, err?.message || err);
        console.groupEnd();
        setLoadingLine(false);
      }

      /* latest breakdown (bar) */
      try {
        if (pieCacheRef.current) {
          console.groupCollapsed('[ukgas/latest-breakdown] cache hit');
          console.log('rows:', pieCacheRef.current.length);
          console.groupEnd();
          setPieData(pieCacheRef.current);
        } else {
          setLoadingPie(true);
          const res2 = await api.get('/api/ukgas/latest-breakdown', { signal: ac.signal as any });
          const raw = (res2 as any)?.data ?? res2;
          const arr = Array.isArray(raw) ? raw : [];
          console.groupCollapsed('[ukgas/latest-breakdown] ✔ success');
          console.log('raw count:', arr.length);
          console.groupEnd();

          const pieRaw: PiePoint[] = arr.map((p: any) => ({
            name: (p?.name ?? p?.category ?? p?.sector ?? p?.label ?? '').toString().trim(),
            value: parseNumber(p?.value ?? p?.amount ?? p?.emissions ?? p?.co2),
          }));

          pieCacheRef.current = pieRaw;
          setPieData(pieRaw);
          setLoadingPie(false);

          const nonZero = pieRaw.filter(d => d.value > 0);
          if (pieRaw.length === 0) {
            console.warn('[ukgas/latest-breakdown] Empty array returned from API.');
            if (!builtFallbackRef.current) {
              builtFallbackRef.current = true;
              await buildClientFallbackBreakdown(ac.signal);
            }
          } else if (nonZero.length === 0) {
            console.warn('[ukgas/latest-breakdown] All values are zero/non-numeric after parsing.');
          }
        }
      } catch (err: any) {
        console.groupCollapsed('[ukgas/latest-breakdown] ✖ error');
        console.error(err?.message || err);
        console.groupEnd();
        setLoadingPie(false);
      }
    })();

    return () => ac.abort();
  }, [disabled, selectedCategory]);

  // Build a latest-year breakdown by fetching each category's series and taking the last non-null value.
  const buildClientFallbackBreakdown = async (signal?: AbortSignal) => {
    try {
      const catsRes = emissionCategories.length
        ? emissionCategories
        : await api.get('/api/ukgas/categories', { signal } as any).then((r: any) => r.data || []);

      const LIMIT = Math.min(60, catsRes.length);
      const out: PiePoint[] = [];

      const pickLast = (arr: any[]): number => {
        for (let i = arr.length - 1; i >= 0; i--) {
          const v = parseNumber(arr[i]?.value);
          if (v > 0) return v;
        }
        return 0;
      };

      console.groupCollapsed('[fallback] building latest-year breakdown');
      console.log('categories used:', LIMIT);

      for (let i = 0; i < LIMIT; i++) {
        const cat = String(catsRes[i]);
        try {
          const res = await api.get(`/api/ukgas/${encodeURIComponent(cat)}`, { signal } as any);
          const series = Array.isArray((res as any)) ? (res as any) : (res as any)?.data || [];
          const v = pickLast(series);
          if (v > 0) out.push({ name: cat, value: v });
        } catch (e: any) {
          console.warn('[fallback] failed category:', cat, e?.message || e);
        }
      }

      out.sort((a, b) => b.value - a.value);
      const top = out.slice(0, 10);
      console.table(top);
      console.groupEnd();

      pieCacheRef.current = top;
      setPieData(top);
    } catch (e: any) {
      console.error('[fallback] failed to build breakdown:', e?.message || e);
    }
  };

  const barSeries = useMemo(() => toBarSeries(pieData), [pieData]);
  const isBarEmpty = barSeries.length === 0;

  return (
    <Stack spacing={2}>
      <Panel
        title="Emissions by Year"
        subtitle={selectedCategory}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="category-label">Emission Category</InputLabel>
              <Select
                labelId="category-label"
                value={selectedCategory}
                label="Emission Category"
                onChange={(e) => setSelectedCategory(e.target.value as string)}
                disabled={disabled || loadingCats}
              >
                {loadingCats
                  ? <MenuItem value=""><em>Loading…</em></MenuItem>
                  : emissionCategories.map((cat, idx) => (<MenuItem key={idx} value={cat}>{cat}</MenuItem>))}
              </Select>
            </FormControl>
            <MuiTooltip title="Refresh categories & data">
              <span>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<AutoFixHighIcon />}
                  disabled={disabled || loadingCats}
                  onClick={() => {
                    categoriesLoadedRef.current = false;
                    setPieData([]);
                    setLineData([]);
                    pieCacheRef.current = null;
                    lineCacheRef.current.clear();
                    builtFallbackRef.current = false;
                    // trigger effects
                    setSelectedCategory((s) => s);
                  }}
                >
                  Refresh
                </Button>
              </span>
            </MuiTooltip>
          </Stack>
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
        ) : isBarEmpty ? (
          <Box
            sx={{
              height: 360,
              display: 'grid',
              placeItems: 'center',
              color: 'text.secondary',
              fontSize: 14,
              px: 2,
              textAlign: 'center',
            }}
          >
            No data available for the latest year. We attempted a client-side rebuild; check Console for [fallback] logs.
          </Box>
        ) : (
          <Box sx={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barSeries} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={isMobile ? 120 : 220}
                  tick={{ fontSize: 12 }}
                />
                <ReTooltip />
                <Legend />
                <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                  {barSeries.map((_, idx) => (
                    <Cell key={`c-${idx}`} fill={colorPalette[idx % colorPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        <Stack direction="row" spacing={1} mt={1}>
          <Chip
            size="small"
            icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}
            label="Data: UK GHG inventory (latest)"
            variant="outlined"
          />
        </Stack>
      </Panel>
    </Stack>
  );
};

export default EmissionsPanel;
