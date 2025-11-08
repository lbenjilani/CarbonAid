import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Checkbox,
  Button,
  List,
  Stack,
  useMediaQuery,
  useTheme,
  Chip,
  Tooltip,
  Divider,
  Alert,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import UndoIcon from '@mui/icons-material/Undo';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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

function guessCadence(tip: Suggestion): TaskItem['cadence'] {
  const d = (tip.difficulty || '').toLowerCase();
  const text = `${(tip.title || '').toLowerCase()} ${(tip.how || '').toLowerCase()}`;
  if (d.includes('low') || /daily|every day|habit/.test(text)) return 'daily';
  if (d.includes('high') || /install|upgrade|heat pump|solar/.test(text)) return 'yearly';
  return 'monthly';
}

function impactBadge(tip: Suggestion) {
  const txt = (tip.impact || '').toLowerCase();
  if (/t\s?co2|ton/.test(txt)) return { label: tip.impact, color: 'error' as const };
  if (/\b[3-9]\d{2}\b/.test(txt) || /[5-9]\d{2}\s*kg/.test(txt)) return { label: tip.impact, color: 'warning' as const };
  return { label: tip.impact || '—', color: 'success' as const };
}

const makeId = (prefix: string) =>
  (typeof globalThis.crypto?.randomUUID === 'function'
    ? `${prefix}-${globalThis.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);

function useLocalTasksFallback() {
  const load = useCallback((): TaskItem[] => {
    try {
      const raw = localStorage.getItem('tasks.v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);
  const save = useCallback((tasks: TaskItem[]) => {
    try {
      localStorage.setItem('tasks.v2', JSON.stringify(tasks));
    } catch {}
  }, []);
  return { load, save };
}

// ---------- Truncation ----------
const TruncatableText: React.FC<{
  children?: React.ReactNode;
  maxLines: number;
  variant?: TypographyProps['variant'];
  fontWeight?: number | 'bold';
  color?: TypographyProps['color'];
  dataTestId?: string;
  onClick?: () => void;
  clickable?: boolean;
}> = ({ children, maxLines, variant = 'body1', fontWeight, color, dataTestId, onClick, clickable }) => {
  const text = String(children ?? '');
  return (
    <Tooltip title={text} disableInteractive enterDelay={600}>
      <Typography
        variant={variant}
        color={color}
        data-testid={dataTestId}
        onClick={onClick}
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
          cursor: clickable ? 'pointer' : 'default',
          '&:hover': clickable ? { textDecoration: 'underline' } : undefined,
        }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
};

// ---------- Task Details Dialog ----------
const TaskDialog: React.FC<{
  open: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ open, task, onClose, onToggle, onRemove }) => {
  if (!task) return null;

  const isCompleted = task.status === 'Completed';
  const badge = task.meta ? impactBadge(task.meta as Suggestion) : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="h6" sx={{ flex: 1 }}>
            {task.title}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={task.type}
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75 } }}
          />
          <Chip
            size="small"
            color={isCompleted ? 'success' : task.status === 'TODO' ? 'warning' : 'default'}
            label={task.status}
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75 } }}
          />
          {badge && (
            <Tooltip title={badge.label}>
              <Chip
                size="small"
                color={badge.color}
                label={badge.label}
                sx={{
                  height: 22,
                  maxWidth: 240,
                  '& .MuiChip-label': {
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    px: 0.75,
                  },
                }}
              />
            </Tooltip>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1.5 }}>
        <Box display="grid" gap={1.25}>
          <Box>
            <Typography variant="overline" color="text.secondary">Cadence</Typography>
            <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 600 }}>{task.cadence}</Typography>
          </Box>

          {task.details && (
            <Box>
              <Typography variant="overline" color="text.secondary">Details</Typography>
              <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                {task.details}
              </Typography>
            </Box>
          )}

          {task.meta && (
            <>
              {task.meta.how && (
                <Box>
                  <Typography variant="overline" color="text.secondary">How</Typography>
                  <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                    {task.meta.how}
                  </Typography>
                </Box>
              )}
              {task.meta.why && (
                <Box>
                  <Typography variant="overline" color="text.secondary">Why</Typography>
                  <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                    {task.meta.why}
                  </Typography>
                </Box>
              )}
              <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {task.meta.impact && <Chip size="small" color={badge?.color ?? 'default'} label={`Impact: ${task.meta.impact}`} />}
                {task.meta.difficulty && <Chip size="small" variant="outlined" label={`Difficulty: ${task.meta.difficulty}`} />}
                {task.meta.cost && <Chip size="small" variant="outlined" label={`Cost: ${task.meta.cost}`} />}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button
          color={isCompleted ? 'inherit' : 'success'}
          startIcon={isCompleted ? <UndoIcon /> : <CheckCircleOutlineIcon />}
          onClick={() => onToggle(task.id)}
          sx={{ textTransform: 'none' }}
        >
          {isCompleted ? 'Mark as not completed' : 'Mark as completed'}
        </Button>
        <Box flex={1} />
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
        <Button
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => { onRemove(task.id); onClose(); }}
          sx={{ textTransform: 'none' }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---------- Task Card ----------
const TaskCard: React.FC<{
  task: TaskItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (task: TaskItem) => void;
}> = ({ task, onToggle, onRemove, onOpen }) => {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));
  const badge = task.meta ? impactBadge(task.meta as Suggestion) : null;
  const isCompleted = task.status === 'Completed';

  return (
    <Paper
      role="group"
      aria-label={`Task ${task.title}`}
      elevation={isCompleted ? 1 : 2}
      sx={{
        p: 1,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: isCompleted ? 'divider' : 'success.light',
        bgcolor: isCompleted ? 'background.paper' : 'rgba(129, 199, 132, 0.08)',
        transition: 'box-shadow 120ms ease, border-color 120ms ease, background 120ms ease',
        maxWidth: '100%',
        overflow: 'hidden', // prevent horizontal scrollbars
        '&:hover': {
          boxShadow: 3,
          borderColor: isCompleted ? 'divider' : 'success.main',
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', minWidth: 0, width: '100%' }}>
        <Checkbox
          checked={isCompleted}
          onChange={() => onToggle(task.id)}
          inputProps={{ 'aria-label': `Toggle ${task.title}` }}
          sx={{ p: 0.5, alignSelf: 'center' }}
        />

        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <TruncatableText
            maxLines={1}
            variant="subtitle2"
            fontWeight="bold"
            dataTestId="task-title"
            onClick={() => onOpen(task)}
            clickable
          >
            {task.title}
          </TruncatableText>

          <Box
            sx={{
              mt: 0.5,
              display: 'flex',
              gap: 0.75,
              flexWrap: 'wrap',
              alignItems: 'center',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <Chip
              size="small"
              variant="outlined"
              label={task.type}
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75 } }}
            />
            <Chip
              size="small"
              color={isCompleted ? 'success' : task.status === 'TODO' ? 'warning' : 'default'}
              label={task.status}
              sx={{ height: 22, '& .MuiChip-label': { px: 0.75 } }}
            />
            {badge && (
              <Tooltip title={badge.label}>
                <Chip
                  size="small"
                  color={badge.color}
                  label={badge.label}
                  sx={{
                    height: 22,
                    maxWidth: 160, // tighter cap; avoids overflow
                    '& .MuiChip-label': {
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      px: 0.75,
                      maxWidth: 160,
                    },
                  }}
                  aria-label={`Impact ${badge.label}`}
                />
              </Tooltip>
            )}
          </Box>

          {(task.details || task.meta?.how || task.meta?.why) && (
            <Box sx={{ mt: 0.5, minWidth: 0, overflow: 'hidden' }}>
              <TruncatableText
                maxLines={isSm ? 3 : 2}
                variant="body2"
                color="text.secondary"
                dataTestId="task-details"
                onClick={() => onOpen(task)}
                clickable
              >
                {task.details || task.meta?.how || task.meta?.why || ''}
              </TruncatableText>
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, alignSelf: 'center' }}>
          <Tooltip title="View full details">
            <IconButton size="small" onClick={() => onOpen(task)} aria-label="View details">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isCompleted ? 'Mark as not completed' : 'Mark as completed'}>
            <IconButton
              size="small"
              color={isCompleted ? 'default' : 'success'}
              onClick={() => onToggle(task.id)}
              aria-label={isCompleted ? 'Undo complete' : 'Complete task'}
            >
              {isCompleted ? <UndoIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove task">
            <IconButton size="small" color="error" onClick={() => onRemove(task.id)} aria-label="Remove task">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Paper>
  );
};

// ---------- Bucket Column ----------
const BucketColumn: React.FC<{
  title: string;
  items: TaskItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAddQuick: (title: string) => void;
  onOpen: (task: TaskItem) => void;
}> = ({ title, items, onToggle, onRemove, onAddQuick, onOpen }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        flex: 1,
        bgcolor: '#dcedc8',
        borderRadius: 2,
        boxShadow: 2,
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
      aria-label={`${title} bucket`}
      role="region"
    >
      <Typography variant="h6" textAlign="center" mb={1.25} color="primary" fontWeight="bold" noWrap>
        {title}
      </Typography>

      <List
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 1,
          p: 0,
          maxWidth: '100%',
        }}
      >
        {items.length ? (
          items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={onToggle}
              onRemove={onRemove}
              onOpen={onOpen}
            />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
            No tasks in this bucket yet.
          </Typography>
        )}
      </List>

      <Box textAlign="center" mt={1}>
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={() => onAddQuick(`Custom ${title.replace(/ Goals?$/i, '')} Goal`)}
          aria-label={`Add ${title} goal`}
          sx={{ textTransform: 'none', px: 1.25, py: 0.5 }}
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTask, setDialogTask] = useState<TaskItem | null>(null);

  const [quickTitle, setQuickTitle] = useState('');
  const [freeCadence, setFreeCadence] = useState<TaskItem['cadence']>('daily');

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

  const taskTitleSet = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) s.add(normalizeTitle(t.title));
    return s;
  }, [tasks]);

  const grouped = useMemo(() => {
    const g: Record<'daily' | 'monthly' | 'yearly', TaskItem[]> = { daily: [], monthly: [], yearly: [] };
    for (const t of tasks) g[t.cadence].push(t);
    return g;
  }, [tasks]);

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
      if (taskTitleSet.has(key)) return;
      addTask({
        id: makeId('user'),
        title,
        details: '',
        cadence,
        status: 'Added',
        type: 'Manual input',
        completedAt: null,
      });
    },
    [addTask, taskTitleSet]
  );

  const addSuggestionToTasks = useCallback(
    (tip: Suggestion) => {
      const title = tip.title || 'AI Tip';
      const key = normalizeTitle(title);
      if (taskTitleSet.has(key)) {
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
        _id: t._id,
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

  const filteredSuggestions = useMemo(() => {
    const notInTasks = (t: Suggestion) => !taskTitleSet.has(normalizeTitle(t.title || ''));
    return {
      daily: aiTips.filter((t) => guessCadence(t) === 'daily' && notInTasks(t)).slice(0, 4),
      monthly: aiTips.filter((t) => guessCadence(t) === 'monthly' && notInTasks(t)).slice(0, 4),
      yearly: aiTips.filter((t) => guessCadence(t) === 'yearly' && notInTasks(t)).slice(0, 4),
      anyRemaining: aiTips.some(notInTasks),
    };
  }, [aiTips, taskTitleSet]);

  const openDialog = (task: TaskItem) => { setDialogTask(task); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
              startIcon={<AddIcon />}
              sx={{ textTransform: 'none' }}
            >
              Add All Suggestions
            </Button>
            <Button variant="contained" color="success" onClick={saveTasks} disabled={saving || loading} sx={{ textTransform: 'none' }}>
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
            startIcon={<AddIcon />}
            onClick={() => {
              const t = quickTitle.trim();
              if (!t) return;
              addQuick(freeCadence, t);
              setQuickTitle('');
            }}
            sx={{ textTransform: 'none' }}
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
            onOpen={openDialog}
          />
          <BucketColumn
            title="Monthly Goals"
            items={grouped.monthly}
            onToggle={toggleTask}
            onRemove={removeTask}
            onAddQuick={(t) => addQuick('monthly', t)}
            onOpen={openDialog}
          />
          <BucketColumn
            title="Yearly Goals"
            items={grouped.yearly}
            onToggle={toggleTask}
            onRemove={removeTask}
            onAddQuick={(t) => addQuick('yearly', t)}
            onOpen={openDialog}
          />
        </Stack>

        <Divider sx={{ my: 1, opacity: 0.6 }} />

        {/* Suggested Goals (from AI) */}
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
                  p: 2,
                  bgcolor: '#f0f8e0',
                  borderLeft: '5px solid #81c784',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Typography variant="subtitle1" textAlign="center" fontWeight="bold" gutterBottom noWrap>
                  {title}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
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
                          p: 1,
                        }}
                        onClick={() => addSuggestionToTasks(tip)}
                        endIcon={<span style={{ fontWeight: 'bold', fontSize: 18, lineHeight: 1 }}>＋</span>}
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

      {/* Details Dialog */}
      <TaskDialog
        open={dialogOpen}
        task={dialogTask}
        onClose={closeDialog}
        onToggle={(id) => { toggleTask(id); }}
        onRemove={(id) => { removeTask(id); }}
      />

      <Footer />
    </Box>
  );
};

export default Task;
