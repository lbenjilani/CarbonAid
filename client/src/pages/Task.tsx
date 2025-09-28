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
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

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

/** Presentational bucket column */
const BucketColumn: React.FC<{
  title: string;
  items: TaskItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAddQuick: (title: string) => void;
}> = ({ title, items, onToggle, onRemove, onAddQuick }) => {
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
      }}
    >
      <Typography variant="h6" textAlign="center" mb={2} color="primary" fontWeight="bold">
        {title}
      </Typography>

      <List sx={{ flex: 1, overflowY: 'auto' }}>
        {items.map((task) => {
          const badge = task.meta ? impactBadge(task.meta as Suggestion) : null;
          return (
            <ListItem
              key={task.id}
              secondaryAction={
                <Button size="small" color="error" onClick={() => onRemove(task.id)} sx={{ textTransform: 'none' }}>
                  Remove
                </Button>
              }
            >
              <ListItemIcon>
                <Checkbox checked={task.completed} onChange={() => onToggle(task.id)} sx={{ color: '#66bb6a' }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    {task.title}
                    {badge && <Chip size="small" color={badge.color} label={badge.label} />}
                  </Box>
                }
                secondary={task.details}
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
        >
          Add a goal
        </Button>
      </Box>
    </Paper>
  );
};

const Task: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { load: loadLocal, save: saveLocal } = useLocalTasksFallback();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [aiTips, setAiTips] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- Load existing tasks ONCE (fix for infinite loop) ---
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
  }, []); // ← run once

  // Latest AI suggestions (ONCE)
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

  // Group tasks by cadence (memoized)
  const grouped = useMemo(() => {
    const g: Record<'daily' | 'monthly' | 'yearly', TaskItem[]> = { daily: [], monthly: [], yearly: [] };
    for (const t of tasks) g[t.cadence].push(t);
    return g;
  }, [tasks]);

  // Handlers (stable)
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
        id: `user-${Date.now()}`,
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

  // Manual, one-shot ingestion from AI (button-driven)
  const ingestAllFromAI = useCallback(() => {
    if (!aiTips?.length) return;
    const newOnes: TaskItem[] = aiTips.map((tip, i) => ({
      id: `ai-${Date.now()}-${i}`,
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
      <Container maxWidth="lg" sx={{ py: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            🌱 Your Goals to Mitigate Emissions
          </Typography>
          <Stack direction="row" spacing={1}>
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
        <Stack direction={isMobile ? 'column' : 'row'} spacing={3} mt={2} mb={5}>
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
        <Stack direction={isMobile ? 'column' : 'row'} spacing={3}>
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
                sx={{ flex: 1, p: 3, bgcolor: '#f0f8e0', borderLeft: '5px solid #81c784' }}
              >
                <Typography variant="subtitle1" textAlign="center" fontWeight="bold" gutterBottom>
                  {title}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                        }}
                        onClick={() =>
                          addTask({
                            id: `ai-${Date.now()}-${idx}`,
                            title: tip.title || 'AI Tip',
                            details: tip.how || tip.why || '',
                            cadence: guessCadence(tip),
                            completed: false,
                            source: 'ai',
                            meta: tip,
                          })
                        }
                        endIcon={<span style={{ fontWeight: 'bold', fontSize: 20 }}>＋</span>}
                      >
                        {tip.title}
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
