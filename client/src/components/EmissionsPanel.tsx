// src/components/EmissionsPanel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Divider as MuiDivider,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, Legend,
} from 'recharts';
import { Atom } from 'react-loading-indicators';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import api from '../services/api';

interface LinePoint { year: string; value: number; }
interface PiePoint { name: string; value: number; }

const colorPalette = [
  '#2e7d32', '#1f77b4', '#ff7f0e', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22',
  '#17becf', '#66bb6a', '#43a047', '#81c784', '#9ccc65',
];

/* ---------------- helpers ---------------- */
const parseNumber = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').match(/-?\d+(\.\d+)?/)?.[0] ?? '';
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

function toBarSeries(raw: unknown[]): { name: string; value: number }[] {
  const normalized = (Array.isArray(raw) ? raw : []).map((p: any) => {
    const name = String(p?.name ?? p?.category ?? p?.sector ?? p?.label ?? '').trim();
    const value = parseNumber(p?.value ?? p?.amount ?? p?.emissions ?? p?.co2);
    return { name, value };
  });

  const filtered = normalized
    .map(({ name, value }) => {
      const parts: string[] = name.split(' - ').map((s) => s.trim()).filter(Boolean);
      const withoutTotals = parts.filter((part) => !/^total$/i.test(part));
      const pretty = withoutTotals.length ? withoutTotals.join(' - ') : name;
      return { name: pretty, value };
    })
    .filter((d) => d.name.length > 0 && Number.isFinite(d.value) && d.value > 0);

  const agg = new Map<string, number>();
  for (const { name, value } of filtered) agg.set(name, (agg.get(name) || 0) + value);

  return Array.from(agg.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

/* ---------------- panel shell ---------------- */
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
type EmissionsPanelProps = { disabled?: boolean };

const EmissionsPanel: React.FC<EmissionsPanelProps> = ({ disabled }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [emissionCategories, setEmissionCategories] = useState<string[]>([]);
  const [showAllCats, setShowAllCats] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // choose default after load
  const [selectOpen, setSelectOpen] = useState(false);

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
      try {
        setLoadingCats(true);
        const res = await api.get('/api/ukgas/categories', { signal: ac.signal as any });
        const data = (res as any)?.data ?? res;
        const cats = Array.isArray(data) ? data : [];
        setEmissionCategories(cats);
        // set default if none selected or invalid
        if (!selectedCategory || (selectedCategory && !cats.includes(selectedCategory))) {
          setSelectedCategory(cats[0] ?? '');
        }
        categoriesLoadedRef.current = true;
      } finally {
        setLoadingCats(false);
      }
    })();

    return () => ac.abort();
  }, [disabled]); // intentionally ignoring selectedCategory to avoid loops

  /* -------- fallback builder (memoized) -------- */
  const buildClientFallbackBreakdown = useCallback(async (signal?: AbortSignal) => {
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

      for (let i = 0; i < LIMIT; i++) {
        const cat = String(catsRes[i]);
        try {
          const url = '/api/ukgas/' + encodeURIComponent(cat);
          const res = await api.get(url, { signal } as any);
          const series = Array.isArray((res as any)) ? (res as any) : (res as any)?.data || [];
          const v = pickLast(series);
          if (v > 0) out.push({ name: cat, value: v });
        } catch {
          // silent
        }
      }

      out.sort((a, b) => b.value - a.value);
      const top = out.slice(0, 10);
      pieCacheRef.current = top;
      setPieData(top);
    } catch {
      // silent
    }
  }, [emissionCategories]);

  /* -------- charts data -------- */
  useEffect(() => {
    if (disabled || !selectedCategory) return;
    dataAbortRef.current?.abort();
    const ac = new AbortController();
    dataAbortRef.current = ac;

    (async () => {
      // timeseries
      try {
        const cached = lineCacheRef.current.get(selectedCategory);
        if (cached) {
          setLineData(cached);
        } else {
          setLoadingLine(true);
          const url = '/api/ukgas/' + encodeURIComponent(selectedCategory);
          const res = await api.get(url, { signal: ac.signal as any });
          const arr = Array.isArray((res as any)) ? (res as any) : (res as any)?.data || [];
          const line: LinePoint[] = (arr || [])
            .filter((d: any) => !isNaN(Number(d.year)))
            .map((d: any) => ({ year: String(d.year), value: Number(d.value) }));
          lineCacheRef.current.set(selectedCategory, line);
          setLineData(line);
          setLoadingLine(false);
        }
      } catch {
        setLoadingLine(false);
      }

      // latest breakdown (bar)
      try {
        if (pieCacheRef.current) {
          setPieData(pieCacheRef.current);
        } else {
          setLoadingPie(true);
          const res2 = await api.get('/api/ukgas/latest-breakdown', { signal: ac.signal as any });
          const raw = (res2 as any)?.data ?? res2;
          const arr = Array.isArray(raw) ? raw : [];

          const pieRaw: PiePoint[] = arr.map((p: any) => ({
            name: (p?.name ?? p?.category ?? p?.sector ?? p?.label ?? '').toString().trim(),
            value: parseNumber(p?.value ?? p?.amount ?? p?.emissions ?? p?.co2),
          }));

          pieCacheRef.current = pieRaw;
          setPieData(pieRaw);
          setLoadingPie(false);

          const nonZero = pieRaw.filter((d) => d.value > 0);
          if (pieRaw.length === 0 && !builtFallbackRef.current) {
            builtFallbackRef.current = true;
            await buildClientFallbackBreakdown(ac.signal);
          } else if (nonZero.length === 0) {
            // keep silent; UI stays clean
          }
        }
      } catch {
        setLoadingPie(false);
      }
    })();

    return () => ac.abort();
  }, [disabled, selectedCategory, buildClientFallbackBreakdown]);

  /* -------- category dropdown: top 5 + toggle -------- */
  const moreSentinel = '__more__';
  const lessSentinel = '__less__';

  const barSeries = useMemo(() => toBarSeries(pieData), [pieData]);

  // Order categories by barSeries ranking, fallback alphabetical for the rest
  const orderedCats = useMemo(() => {
    if (barSeries.length === 0) return emissionCategories;
    const order = new Map(barSeries.map((b, i) => [b.name, i]));
    const scored = emissionCategories.map((c) => ({ c, s: order.has(c) ? (order.get(c) as number) : 9999 }));
    return scored.sort((a, b) => a.s - b.s || a.c.localeCompare(b.c)).map((x) => x.c);
  }, [emissionCategories, barSeries]);

  const visibleCats = useMemo(
    () => {
      const base = showAllCats ? orderedCats : orderedCats.slice(0, 5);
      // Ensure current selection is present even if not in top-5
      if (selectedCategory && !base.includes(selectedCategory) && orderedCats.includes(selectedCategory)) {
        return [selectedCategory, ...base];
      }
      return base;
    },
    [orderedCats, showAllCats, selectedCategory]
  );

  const handleCategoryChange = (value: string) => {
    if (value === moreSentinel) {
      setShowAllCats(true);
      // reopen the menu so user sees the expanded list immediately
      setTimeout(() => setSelectOpen(true), 0);
      return;
    }
    if (value === lessSentinel) {
      setShowAllCats(false);
      setTimeout(() => setSelectOpen(true), 0);
      return;
    }
    setSelectedCategory(value);
  };

  const isBarEmpty = barSeries.length === 0;

  return (
    <Stack spacing={2}>
      <Panel
        title="Emissions by Year"
        subtitle={selectedCategory || 'Select a category'}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl
              size="small"
              sx={{
                minWidth: 240,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#f0f8e0',
                  '& fieldset': { borderColor: 'rgba(117,183,141,0.35)' },
                  '&:hover fieldset': { borderColor: 'rgba(46,125,50,0.55)' },
                  '&.Mui-focused fieldset': { borderColor: 'rgba(46,125,50,0.9)' },
                },
              }}
            >
              <InputLabel id="category-label">Emission Category</InputLabel>
              <Select
                labelId="category-label"
                value={selectedCategory}
                label="Emission Category"
                open={selectOpen}
                onOpen={() => setSelectOpen(true)}
                onClose={() => setSelectOpen(false)}
                onChange={(e) => handleCategoryChange(e.target.value as string)}
                disabled={disabled || loadingCats}
                displayEmpty
                renderValue={(val) =>
                  val ? String(val) : <span style={{ color: '#888' }}>Select a category</span>
                }
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#f0f8e0',
                      border: '1px solid rgba(117,183,141,0.35)',
                      boxShadow: '0 12px 28px rgba(46,125,50,0.12)',
                      '& .MuiMenuItem-root': {
                        '&:hover': { bgcolor: 'rgba(129,199,132,0.25)' },
                        '&.Mui-selected': { bgcolor: 'rgba(76,175,80,0.22)' },
                      },
                    },
                  },
                }}
              >
                {loadingCats && <MenuItem value=""><em>Loading…</em></MenuItem>}

                {/* keep current selection visible at the top if it's outside the visible slice */}
                {selectedCategory &&
                  !visibleCats.includes(selectedCategory) &&
                  orderedCats.includes(selectedCategory) && (
                    <MenuItem value={selectedCategory}>{selectedCategory}</MenuItem>
                )}

                {!loadingCats && visibleCats.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}

                {!loadingCats && orderedCats.length > 5 && !showAllCats && (
                  <>
                    <MuiDivider />
                    <MenuItem value={moreSentinel} sx={{ fontWeight: 700, color: 'success.main' }}>
                      Show more…
                    </MenuItem>
                  </>
                )}

                {!loadingCats && orderedCats.length > 5 && showAllCats && (
                  <>
                    <MuiDivider />
                    <MenuItem value={lessSentinel} sx={{ fontWeight: 700, color: 'success.main' }}>
                      Show less
                    </MenuItem>
                  </>
                )}
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
                    setShowAllCats(false);
                    setSelectOpen(false);
                    // re-pick default after reload
                    setSelectedCategory('');
                    // trigger effects by toggling a noop—category effect will run once cats load
                    setEmissionCategories((x) => [...x]);
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
              px: 2,
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'grid', placeItems: 'center', gap: 1 }}>
              <Atom color="#32cd32" size="medium" text="" textColor="" />
              <Typography variant="body2" color="text.secondary">
                Building view…
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barSeries} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={isMobile ? 120 : 220} tick={{ fontSize: 12 }} />
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
