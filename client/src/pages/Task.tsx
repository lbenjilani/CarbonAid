// src/pages/Task.tsx
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

type TaskItem = {
  id: string;
  title: string;
  details?: string;
  cadence: 'daily' | 'monthly' | 'yearly';
  completed: boolean;
  source?: 'ai' | 'user';
  meta?: Partial<Suggestion>;
};

const DEV_USER_ID = (process.env.REACT_APP_DEV_USER_ID || '66e000000000000000000001').trim();

// ---------- Utils ----------
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
      const raw = localStorage.getItem('tasks');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const save = useCallback((tasks: TaskItem[]) => {
    try {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch {
      /* noop */
    }
  }, []);

  return { load, save };
}

// ---------- Reusable truncation component ----------
/**
 * TruncatableText
 * - Clamps to N lines
 * - Preserves wrapping (URLs/long words)
 * - Shows full value in a tooltip on hover/focus
 */
const TruncatableText: React.FC<{
  children?: React.ReactNode;
  maxLines: number;
  variant?: TypographyProps['variant'];   // widened to any MUI variant (e.g., "h4")
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
          // critical for long unbroken strings / URLs:
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
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAddQuick: (title: string) => void;
}> = ({ title, items, onToggle, onRemove, onAddQuick }) => {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const titleLines = isSm ? 2 : 1;       // tighter on mobile
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
        minWidth: 0, // allow flex children to shrink properly
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
                // keep layout resilient for long text
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
                  checked={task.completed}
                  onChange={() => onToggle(task.id)}
                  sx={{ color: '#66bb6a' }}
                  inputProps={{ 'aria-label': `Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}` }}
                />
              </ListItemIcon>

              <ListItemText
                sx={{
                  minWidth: 0, // allow text to shrink within flex
                  mr: 7,       // leave room for secondaryAction
                }}
                primary={
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="nowrap"
                    sx={{ minWidth: 0, overflow: 'hidden' }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <TruncatableText
                        maxLines={titleLines}
                        variant="subtitle2"
                        fontWeight="bold"
                        dataTestId="task-title"
                      >
                        {task.title}
                      </TruncatableText>
                    </Box>
                    {badge && (
                      <Chip
                        size="small"
                        color={badge.color}
                        label={badge.label}
                        sx={{
                          maxWidth: 160,
                          // Chip label wrapping:
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
                    <TruncatableText
                      maxLines={detailsLines}
                      variant="body2"
                      color="text.secondary"
                      dataTestId="task-details"
                    >
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
            No tasks yet in this bucket.
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
          Add a goal
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

  // Load tasks once
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // If you expose /api/tasks, fetch here; else fall back to local
        // const res = await api.get('/api/tasks', { headers: { 'x-user-id': DEV_USER_ID } });
        // setTasks(res.data || []);
        setTasks(loadLocal());
      } catch (e: any) {
        console.error('load tasks failed:', e);
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
        const res = await api.get('/api/ai-suggestions/latest', {
          headers: { 'x-user-id': DEV_USER_ID },
        });
        const latest = res.data?.tips || [];
        setAiTips(latest);
      } catch (e) {
        console.warn('no AI tips yet:', e);
      }
    })();
  }, []);

  // Group tasks by cadence
  const grouped = useMemo(() => {
    const g: Record<'daily' | 'monthly' | 'yearly', TaskItem[]> = { daily: [], monthly: [], yearly: [] };
    for (const t of tasks) g[t.cadence].push(t);
    return g;
  }, [tasks]);

  // Handlers
  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addTask = useCallback((t: TaskItem) => {
    setTasks((prev) => {
      const exists = prev.some((x) => x.title.toLowerCase() === t.title.toLowerCase());
      return exists ? prev : [t, ...prev];
    });
  }, []);

  const addQuick = useCallback(
    (cadence: TaskItem['cadence'], title: string) => {
      addTask({
        id: makeId('user'),
        title,
        details: '',
        cadence,
        completed: false,
        source: 'user',
      });
    },
    [addTask]
  );

  const saveTasks = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      // If your API exists:
      // await api.post('/api/tasks/bulk', { tasks }, { headers: { 'x-user-id': DEV_USER_ID } });
      saveLocal(tasks);
    } catch (e: any) {
      setError(e?.normalizedMessage || 'Failed to save tasks; saved locally instead.');
      saveLocal(tasks);
    } finally {
      setSaving(false);
    }
  }, [saveLocal, tasks]);

  const ingestAllFromAI = useCallback(() => {
    if (!aiTips?.length) return;
    const newOnes: TaskItem[] = aiTips.map((tip, i) => ({
      id: makeId('ai'),
      title: tip.title || `AI Tip ${i + 1}`,
      details: tip.how || tip.why || '',
      cadence: guessCadence(tip),
      completed: false,
      source: 'ai',
      meta: tip,
    }));
    setTasks((prev) => {
      const names = new Set(prev.map((t) => t.title.toLowerCase()));
      const merged = [...prev];
      for (const n of newOnes) if (!names.has(n.title.toLowerCase())) merged.unshift(n);
      return merged;
    });
  }, [aiTips]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container
        maxWidth="lg"
        sx={{
          py: 4,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          // prevent horizontal scroll at all costs
          minWidth: 0,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
          sx={{ minWidth: 0 }}
        >
          <TruncatableText maxLines={2} variant="h4" fontWeight="bold" dataTestId="page-title">
            🌱 Your Goals to Mitigate Emissions
          </TruncatableText>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="success"
              disabled={!aiTips.length}
              onClick={ingestAllFromAI}
              title="Turn latest AI suggestions into tasks (one click)"
            >
              Add All AI Suggestions
            </Button>
            <Button variant="contained" color="success" onClick={saveTasks} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save Tasks'}
            </Button>
          </Stack>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

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

        {/* Suggested Goals (from AI) — quick add */}
        <Stack direction={isMobile ? 'column' : 'row'} spacing={3} sx={{ minWidth: 0 }}>
          {(['daily', 'monthly', 'yearly'] as const).map((bucket, index) => {
            const items = aiTips
              .map((t) => ({ tip: t, cadence: guessCadence(t) }))
              .filter((x) => x.cadence === bucket)
              .map((x) => x.tip)
              .slice(0, 4);

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
                        key={idx}
                        variant="outlined"
                        sx={{
                          textTransform: 'none',
                          borderColor: '#81c784',
                          color: '#388e3c',
                          fontWeight: 'bold',
                          '&:hover': { borderColor: '#66bb6a', bgcolor: '#e8f5e9' },
                          justifyContent: 'space-between',
                          // let long titles wrap:
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          alignItems: 'flex-start',
                          textAlign: 'left',
                          minWidth: 0,
                          p: 1.25,
                        }}
                        onClick={() =>
                          addTask({
                            id: makeId('ai'),
                            title: tip.title || 'AI Tip',
                            details: tip.how || tip.why || '',
                            cadence: guessCadence(tip),
                            completed: false,
                            source: 'ai',
                            meta: tip,
                          })
                        }
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
                      No suggestions yet.
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
