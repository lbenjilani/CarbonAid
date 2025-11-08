import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Checkbox,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
  useMediaQuery,
  useTheme,
  Chip,
  Tooltip,
  Divider,
  Alert,
  TextField,
} from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

// ---------- Types ----------
type Suggestion = {
  title: string;
  why: string;
  how: string;
  impact: string;      // e.g., "200–350 kg CO2e/yr"
  difficulty: string;  // e.g., "Low" | "Medium" | "High"
  cost: string;
};

type TaskStatus = 'Added' | 'TODO' | 'Completed';
type TaskType = 'AI generated' | 'Manual input';

type TaskItem = {
  _id?: string;                  // server subdoc id
  id: string;                    // stable client id for rendering
  title: string;
  details?: string;
  cadence: 'daily' | 'monthly' | 'yearly';
  status: TaskStatus;            // replaces 'completed'
  type: TaskType;                // replaces 'source'
  completedAt?: string | null;
  meta?: Partial<Suggestion>;
};

const DEV_USER_ID = (process.env.REACT_APP_DEV_USER_ID || '66e000000000000000000001').trim();

// ---------- Utils ----------
const normalizeTitle = (s: string) => (s || '').trim().toLowerCase();

/** Heuristic: map an AI tip to a cadence bucket */
function guessCadence(tip: Suggestion): TaskItem['cadence'] {
  const d = (tip.difficulty || '').toLowerCase();
  const text = `${(tip.title || '').toLowerCase()} ${(tip.how || '').toLowerCase()}`;
  if (d.includes('low') || /daily|every day|habit/.test(text)) return 'daily';
  if (d.includes('high') || /install|upgrade|heat pump|solar/.test(text)) return 'yearly';
  return 'monthly';
}

/** Normalize impact text to a tiny badge */
function impactBadge(tip: Suggestion) {
  const txt = (tip.impact || '').toLowerCase();
  if (/t\s?co2|ton/.test(txt)) return { label: tip.impact, color: 'error' as const };
  if (/\b[3-9]\d{2}\b/.test(txt) || /[5-9]\d{2}\s*kg/.test(txt)) return { label: tip.impact, color: 'warning' as const };
  return { label: tip.impact || '—', color: 'success' as const };
}

/** Robust ID */
const makeId = (prefix: string) =>
  (typeof globalThis.crypto?.randomUUID === 'function'
    ? `${prefix}-${globalThis.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** LocalStorage fallback with stable function identities */
function useLocalTasksFallback() {
  const load = useCallback((): TaskItem[] => {
    try {
      const raw = localStorage.getItem('tasks.v2');   // v2 to avoid old shape collisions
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const save = useCallback((tasks: TaskItem[]) => {
    try {
      localStorage.setItem('tasks.v2', JSON.stringify(tasks));
    } catch {
      /* noop */
    }
  }, []);

  return { load, save };
}

// ---------- Reusable truncation component ----------
const TruncatableText: React.FC<{
  children?: React.ReactNode;
  maxLines: number;
  variant?: TypographyProps['variant'];   // allow any MUI variant
  fontWeight?: number | 'bold';
  color?: TypographyProps['color'];
  dataTestId?: string;
}> = ({ children, maxLines, variant = 'body1', fontWeight, color, dataTestId }) => {
  const text = String(children ?? '');
  return (
    <Tooltip title={text} disableInteractive enterDelay={600}>
      <Typography
        variant={variant}
        color={color}
        data-testid={dataTestId}
        sx={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: maxLines,
          overflow: 'hidden',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          hyphens: 'auto',
          whiteSpace: 'normal',
          fontWeight,
        }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
};

// ---------- Presentational bucket column ----------
const BucketColumn: React.FC<{
  title: string;
  items: TaskItem[];
  onToggle: (id: string) => void;        // toggles Completed status
  onRemove: (id: string) => void;
  onAddQuick: (title: string) => void;
}> = ({ title, items, onToggle, onRemove, onAddQuick }) => {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const titleLines = isSm ? 2 : 1;
  const detailsLines = isSm ? 3 : 2;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        flex: 1,
        bgcolor: '#dcedc8',
        borderRadius: 2,
        boxShadow: 2,
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
      aria-label={`${title} bucket`}
      role="region"
    >
      <Typography variant="h6" textAlign="center" mb={2} color="primary" fontWeight="bold">
        {title}
      </Typography>

      <List sx={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {items.map((task) => {
          const badge = task.meta ? impactBadge(task.meta as Suggestion) : null;

          return (
            <ListItem
              key={task.id}
              alignItems="flex-start"
              sx={{
                gap: 1,
                minWidth: 0,
                '& .MuiListItemSecondaryAction-root': { right: 0 },
              }}
              secondaryAction={
                <Button
                  size="small"
                  color="error"
                  onClick={() => onRemove(task.id)}
                  sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  aria-label={`Remove ${task.title}`}
                >
                  Remove
                </Button>
              }
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Checkbox
                  checked={task.status === 'Completed'}
                  onChange={() => onToggle(task.id)}
                  sx={{ color: '#66bb6a' }}
                  inputProps={{ 'aria-label': `Toggle ${task.title}` }}
                />
              </ListItemIcon>

              <ListItemText
                sx={{ minWidth: 0, mr: 7 }}
                primary={
                  <Box display="flex" alignItems="center" gap={1} flexWrap="nowrap" sx={{ minWidth: 0, overflow: 'hidden' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <TruncatableText maxLines={titleLines} variant="subtitle2" fontWeight="bold" dataTestId="task-title">
                        {task.title}
                      </TruncatableText>
                    </Box>

                    {/* Type & Status chips */}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={task.type}
                      sx={{ borderColor: '#81c784' }}
                    />
                    <Chip
                      size="small"
                      color={task.status === 'Completed' ? 'success' : task.status === 'TODO' ? 'warning' : 'default'}
                      label={task.status}
                    />

                    {/* Impact (AI meta) */}
                    {badge && (
                      <Chip
                        size="small"
                        color={badge.color}
                        label={badge.label}
                        sx={{
                          maxWidth: 160,
                          '& .MuiChip-label': {
                            display: 'block',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            lineHeight: 1.2,
                          },
                        }}
                        aria-label={`Impact ${badge.label}`}
                      />
                    )}
                  </Box>
                }
                secondary={
                  task.details ? (
                    <TruncatableText maxLines={detailsLines} variant="body2" color="text.secondary" dataTestId="task-details">
                      {task.details}
                    </TruncatableText>
                  ) : null
                }
              />
            </ListItem>
          );
        })}

        {!items.length && (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
            No tasks in this bucket yet.
          </Typography>
        )}
      </List>

      <Box textAlign="center" mt={2}>
        <Button
          variant="contained"
          color="success"
          onClick={() => onAddQuick(`Custom ${title.replace(/ Goals?$/i, '')} Goal`)}
          aria-label={`Add ${title} goal`}
        >
          Add Goal
        </Button>
      </Box>
    </Paper>
  );
};

// ---------- Page ----------
const Task: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { load: loadLocal, save: saveLocal } = useLocalTasksFallback();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [aiTips, setAiTips] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Optional free-form add
  const [quickTitle, setQuickTitle] = useState('');
  const [freeCadence, setFreeCadence] = useState<TaskItem['cadence']>('daily');

  // Load tasks once
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/tasks', { headers: { 'x-user-id': DEV_USER_ID } });
        const serverTasks: any[] = res.data || [];
        const mapped: TaskItem[] = serverTasks.map((t) => ({
          _id: t._id,
          id: t._id || makeId('srv'),
          title: t.title,
          details: t.details || '',
          cadence: t.cadence,
          status: t.status,
          type: t.type,
          completedAt: t.completedAt || null,
          meta: t.meta || undefined,
        }));
        setTasks(mapped);
      } catch (e: any) {
        console.error('load tasks failed:', e?.message);
        setTasks(loadLocal());
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Latest AI suggestions (once)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/ai-suggestions/latest', { headers: { 'x-user-id': DEV_USER_ID } });
        const latest = res.data?.tips || [];
        setAiTips(latest);
      } catch (e) {
        console.warn('no AI tips yet:', e);
      }
    })();
  }, []);

  // Build a case-insensitive set of existing task titles
  const taskTitleSet = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) s.add(normalizeTitle(t.title));
    return s;
  }, [tasks]);

  // Group tasks by cadence
  const grouped = useMemo(() => {
    const g: Record<'daily' | 'monthly' | 'yearly', TaskItem[]> = { daily: [], monthly: [], yearly: [] };
    for (const t of tasks) g[t.cadence].push(t);
    return g;
  }, [tasks]);

  // ---- Core state changers (all dedupe enforced) ----
  const addTask = useCallback((t: TaskItem) => {
    const key = normalizeTitle(t.title);
    setTasks((prev) => (prev.some((x) => normalizeTitle(x.title) === key) ? prev : [t, ...prev]));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: TaskStatus = t.status === 'Completed' ? 'Added' : 'Completed';
        return {
          ...t,
          status: next,
          completedAt: next === 'Completed' ? new Date().toISOString() : null,
        };
      })
    );
  }, []);

  const addQuick = useCallback(
    (cadence: TaskItem['cadence'], title: string) => {
      const key = normalizeTitle(title);
      if (taskTitleSet.has(key)) return; // already exists
      addTask({
        id: makeId('user'),
        title,
        details: '',
        cadence,
        status: 'Added',
        type: 'Manual input',
        completedAt: null,
      });
      // Quick-add doesn't come from suggestions, so nothing to remove from aiTips
    },
    [addTask, taskTitleSet]
  );

  // Add a single suggestion → Task, and REMOVE it from suggestions
  const addSuggestionToTasks = useCallback(
    (tip: Suggestion) => {
      const title = tip.title || 'AI Tip';
      const key = normalizeTitle(title);
      if (taskTitleSet.has(key)) {
        // already exists in tasks → just filter it out from suggestions to avoid duplication in UI
        setAiTips((prev) => prev.filter((x) => normalizeTitle(x.title) !== key));
        return;
      }
      addTask({
        id: makeId('ai'),
        title,
        details: tip.how || tip.why || '',
        cadence: guessCadence(tip),
        status: 'Added',
        type: 'AI generated',
        meta: tip,
        completedAt: null,
      });
      setAiTips((prev) => prev.filter((x) => normalizeTitle(x.title) !== key));
    },
    [addTask, taskTitleSet]
  );

  // Bulk add all suggestions → Tasks, and CLEAR moved ones from suggestions
  const ingestAllFromAI = useCallback(() => {
    if (!aiTips?.length) return;
    const keep: Suggestion[] = [];
    const toAdd: Suggestion[] = [];

    for (const tip of aiTips) {
      const key = normalizeTitle(tip.title || '');
      if (!key || taskTitleSet.has(key)) continue;
      toAdd.push(tip);
    }

    if (toAdd.length) {
      setTasks((prev) => {
        const names = new Set(prev.map((t) => normalizeTitle(t.title)));
        const merged = [...prev];
        for (const tip of toAdd) {
          const title = tip.title || 'AI Tip';
          const key = normalizeTitle(title);
          if (!names.has(key)) {
            merged.unshift({
              id: makeId('ai'),
              title,
              details: tip.how || tip.why || '',
              cadence: guessCadence(tip),
              status: 'Added',
              type: 'AI generated',
              meta: tip,
              completedAt: null,
            });
            names.add(key);
          }
        }
        return merged;
      });
    }

    for (const tip of aiTips) {
      const key = normalizeTitle(tip.title || '');
      if (!key || taskTitleSet.has(key)) continue;
      if (!toAdd.find((t) => normalizeTitle(t.title || '') === key)) {
        keep.push(tip);
      }
    }
    setAiTips(keep);
  }, [aiTips, taskTitleSet]);

  const saveTasks = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = tasks.map((t) => ({
        _id: t._id, // keep if exists so server won't create a new one
        title: t.title,
        details: t.details || '',
        cadence: t.cadence,
        status: t.status,
        type: t.type,
        meta: t.meta || {},
        completedAt: t.completedAt || null,
      }));

      const res = await api.post(
        '/api/tasks/bulk',
        { tasks: payload },
        { headers: { 'x-user-id': DEV_USER_ID } }
      );

      const mapped: TaskItem[] = (res.data || []).map((t: any) => ({
        _id: t._id,
        id: t._id || makeId('srv'),
        title: t.title,
        details: t.details || '',
        cadence: t.cadence,
        status: t.status,
        type: t.type,
        completedAt: t.completedAt || null,
        meta: t.meta || undefined,
      }));

      setTasks(mapped);
      saveLocal(mapped);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save; saved locally instead.');
      saveLocal(tasks);
    } finally {
      setSaving(false);
    }
  }, [tasks, saveLocal]);

  // Filter suggestions live so the UI never shows items already in tasks
  const filteredSuggestions = useMemo(() => {
    const notInTasks = (t: Suggestion) => !taskTitleSet.has(normalizeTitle(t.title || ''));
    return {
      daily: aiTips.filter((t) => guessCadence(t) === 'daily' && notInTasks(t)).slice(0, 4),
      monthly: aiTips.filter((t) => guessCadence(t) === 'monthly' && notInTasks(t)).slice(0, 4),
      yearly: aiTips.filter((t) => guessCadence(t) === 'yearly' && notInTasks(t)).slice(0, 4),
      anyRemaining: aiTips.some(notInTasks),
    };
  }, [aiTips, taskTitleSet]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container
        maxWidth="lg"
        sx={{ py: 4, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ minWidth: 0 }}>
          <TruncatableText maxLines={2} variant="h4" fontWeight="bold" dataTestId="page-title">
            🌱 Your Goals to Mitigate Emissions
          </TruncatableText>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="success"
              disabled={!filteredSuggestions.anyRemaining}
              onClick={ingestAllFromAI}
              title="Add all unique suggestions to your goals"
            >
              Add All Suggestions
            </Button>
            <Button variant="contained" color="success" onClick={saveTasks} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save Goals'}
            </Button>
          </Stack>
        </Box>

        <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
          Status tracks your progress: Added → TODO → Completed. AI items are labeled “AI generated”; your items are “Manual input”.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Quick free-form add */}
        <Box display="flex" gap={1} alignItems="center" mt={1} flexWrap="wrap">
          <TextField
            size="small"
            label="Quick task"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
          />
          <TextField
            size="small"
            select
            SelectProps={{ native: true }}
            label="Cadence"
            value={freeCadence}
            onChange={(e) => setFreeCadence(e.target.value as TaskItem['cadence'])}
          >
            <option value="daily">daily</option>
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
          </TextField>
          <Button
            variant="contained"
            onClick={() => {
              const t = quickTitle.trim();
              if (!t) return;
              addQuick(freeCadence, t);
              setQuickTitle('');
            }}
          >
            Add
          </Button>
        </Box>

        {/* Buckets */}
        <Stack direction={isMobile ? 'column' : 'row'} spacing={3} mt={2} mb={5} sx={{ minWidth: 0 }}>
          <BucketColumn
            title="Daily Goals"
            items={grouped.daily}
            onToggle={toggleTask}
            onRemove={removeTask}
            onAddQuick={(t) => addQuick('daily', t)}
          />
          <BucketColumn
            title="Monthly Goals"
            items={grouped.monthly}
            onToggle={toggleTask}
            onRemove={removeTask}
            onAddQuick={(t) => addQuick('monthly', t)}
          />
          <BucketColumn
            title="Yearly Goals"
            items={grouped.yearly}
            onToggle={toggleTask}
            onRemove={removeTask}
            onAddQuick={(t) => addQuick('yearly', t)}
          />
        </Stack>

        <Divider sx={{ my: 1, opacity: 0.6 }} />

        {/* Suggested Goals (from AI) — duplicates hidden automatically */}
        <Stack direction={isMobile ? 'column' : 'row'} spacing={3} sx={{ minWidth: 0 }}>
          {(['daily', 'monthly', 'yearly'] as const).map((bucket, index) => {
            const items =
              bucket === 'daily'
                ? filteredSuggestions.daily
                : bucket === 'monthly'
                ? filteredSuggestions.monthly
                : filteredSuggestions.yearly;

            const title =
              bucket === 'daily' ? 'Suggested Daily Goals' : bucket === 'monthly' ? 'Suggested Monthly Goals' : 'Suggested Yearly Goals';

            return (
              <Paper
                key={index}
                elevation={2}
                sx={{
                  flex: 1,
                  p: 3,
                  bgcolor: '#f0f8e0',
                  borderLeft: '5px solid #81c784',
                  minWidth: 0,
                }}
              >
                <Typography variant="subtitle1" textAlign="center" fontWeight="bold" gutterBottom noWrap>
                  {title}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  {items.length ? (
                    items.map((tip, idx) => (
                      <Button
                        key={`${bucket}-${idx}-${normalizeTitle(tip.title || '')}`}
                        variant="outlined"
                        sx={{
                          textTransform: 'none',
                          borderColor: '#81c784',
                          color: '#388e3c',
                          fontWeight: 'bold',
                          '&:hover': { borderColor: '#66bb6a', bgcolor: '#e8f5e9' },
                          justifyContent: 'space-between',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          alignItems: 'flex-start',
                          textAlign: 'left',
                          minWidth: 0,
                          p: 1.25,
                        }}
                        onClick={() => addSuggestionToTasks(tip)}
                        endIcon={<span style={{ fontWeight: 'bold', fontSize: 20, lineHeight: 1 }}>＋</span>}
                        aria-label={`Add suggestion: ${tip.title}`}
                      >
                        <TruncatableText maxLines={2} variant="body2" fontWeight={700}>
                          {tip.title}
                        </TruncatableText>
                      </Button>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No more suggestions in this bucket.
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Container>
      <Footer />
    </Box>
  );
};

export default Task;
