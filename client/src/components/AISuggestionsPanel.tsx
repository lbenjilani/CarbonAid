// src/components/AISuggestionsPanel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Snackbar,
  Alert,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SignalCellularAltRoundedIcon from '@mui/icons-material/SignalCellularAltRounded';
import api from '../services/api';
import { askGPT } from '../services/chatService';

const DEV_USER_ID = (process.env.REACT_APP_DEV_USER_ID || '66e000000000000000000001').trim();

type Suggestion = {
  title: string;
  why: string;
  how: string;
  impact: string;
  difficulty: string;
  cost: string;
};

const clamp = (s: unknown, max = 500): string =>
  typeof s === 'string' ? (s.length > max ? s.slice(0, max) : s) : String(s ?? '');

function pickQuizContext(raw: any) {
  const allowTop = new Set(['transport', 'energy', 'diet', 'consumption', 'profile', 'region']);
  const out: Record<string, any> = {};
  for (const k of Object.keys(raw || {})) {
    if (!allowTop.has(k)) continue;
    const v = (raw as any)[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      const compact = v
        .slice(0, 6)
        .filter((x) => ['string', 'number', 'boolean'].includes(typeof x))
        .map((x) => (typeof x === 'string' ? clamp(x, 120) : x));
      if (compact.length) out[k] = compact;
      continue;
    }
    if (typeof v === 'object') {
      const sub: Record<string, any> = {};
      for (const sk of Object.keys(v)) {
        const sv = (v as any)[sk];
        if (sv == null) continue;
        if (typeof sv === 'string') sub[sk] = clamp(sv, 200);
        else if (typeof sv === 'number' || typeof sv === 'boolean') sub[sk] = sv;
      }
      if (Object.keys(sub).length) out[k] = sub;
      continue;
    }
    if (typeof v === 'string') out[k] = clamp(v, 200);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  if (out.transport && out.energy) out._hint = 'prioritize the biggest annual CO2e reductions across transport and energy first';
  return out;
}

const safeSlice = (s: string, max = 6000) => (s.length > max ? s.slice(0, max) : s);

const parseToSuggestions = (text: string): Suggestion[] => {
  if (!text) return [];
  let core = text.trim();
  const fence = core.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) core = fence[1].trim();
  const firstArr = core.indexOf('[');
  const firstObj = core.indexOf('{');
  const cutAt = firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstArr, firstObj);
  if (cutAt > 0) core = core.slice(cutAt);
  try {
    const parsed = JSON.parse(core);
    const toList = (arr: any[]) =>
      arr
        .filter(Boolean)
        .slice(0, 5)
        .map((x: any): Suggestion => ({
          title: String(x?.title ?? '').trim() || 'Suggestion',
          why: String(x?.why ?? '').trim() || '—',
          how: String(x?.how ?? '').trim() || '—',
          impact: String(x?.impact ?? '').trim() || '—',
          difficulty: String(x?.difficulty ?? '').trim() || '—',
          cost: String(x?.cost ?? '').trim() || '—',
        }));
    if (Array.isArray(parsed)) return toList(parsed);
    if (parsed && Array.isArray(parsed.tips)) return toList(parsed.tips);
  } catch {}
  const items = core
    .split(/\n\s*(?=\d+\.\s|[-*•]\s)/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (items.length) {
    return items.map((t) => ({
      title: t.replace(/^(\d+\.\s*|[-*•]\s*)/, '').slice(0, 80),
      why: 'N/A',
      how: t.slice(0, 200),
      impact: 'N/A',
      difficulty: 'N/A',
      cost: 'N/A',
    }));
  }
  return [];
};

const friendlyAiError = (raw: unknown): string => {
  const s = String(raw || '');
  if (/429|rate limit|Too Many|quota/i.test(s)) return 'The AI service is rate-limited right now. Please try again shortly.';
  if (/timeout|ECONNRESET|ETIMEDOUT/i.test(s)) return 'The AI service timed out. Please try again.';
  if (/moderation|blocked/i.test(s)) return 'Your input was blocked by AI moderation.';
  return 'The AI service is having an issue. Please try again later.';
};

const EarthLoader: React.FC = () => (
  <Box sx={{ display: 'grid', placeItems: 'center', height: 140 }}>
    <Box
      sx={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 35% 30%, #7ec8a3 25%, #2d8555 26% 40%, #7ec8a3 41% 55%, #2d8555 56% 70%, #7ec8a3 71%)',
        boxShadow: 'inset -8px -10px 16px rgba(0,0,0,0.15), 0 0 0 4px rgba(117,183,141,0.35)',
        animation: 'spin 5s linear infinite',
        '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
      }}
      aria-label="Loading AI suggestions"
    />
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Calculating recommendations…
    </Typography>
  </Box>
);

function levelFromText(s: string) {
  const v = (s || '').toLowerCase();
  if (/low|^l\b|1/.test(v)) return 1;
  if (/med|medium|2/.test(v)) return 2;
  if (/high|3/.test(v)) return 3;
  return 2;
}

const Bars: React.FC<{ level: 1 | 2 | 3 }> = ({ level }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'flex-end', gap: 0.25 }}>
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6 + i * 6,
            borderRadius: 1,
            bgcolor: i <= level ? theme.palette.success.main : 'action.disabledBackground',
            opacity: i <= level ? 1 : 0.7,
          }}
        />
      ))}
    </Box>
  );
};

const Dollars: React.FC<{ level: 1 | 2 | 3 }> = ({ level }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
    {[1, 2, 3].map((i) => (
      <AttachMoneyIcon key={i} fontSize="small" sx={{ opacity: i <= level ? 1 : 0.35, color: i <= level ? 'success.main' : 'text.disabled' }} />
    ))}
  </Box>
);

const TruncOneLine: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
  <Typography
    variant="body2"
    title={title}
    sx={{
      display: '-webkit-box',
      WebkitLineClamp: 1,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      wordBreak: 'break-word',
    }}
  >
    {children}
  </Typography>
);

const SuggestionRow: React.FC<{
  s: Suggestion;
  index: number;
  onView: (s: Suggestion) => void;
}> = ({ s, index, onView }) => {
  const diffLvl = levelFromText(s.difficulty) as 1 | 2 | 3;
  const costLvl = levelFromText(s.cost) as 1 | 2 | 3;

  return (
    <Box
      sx={{
        border: '1px solid rgba(117,183,141,0.35)',
        borderRadius: 2,
        p: 1.25,
        bgcolor: '#f8fff4',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 1,
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': { borderColor: 'success.main', boxShadow: 1 },
      }}
    >
      <Chip size="small" label={index + 1} color="success" sx={{ fontWeight: 700 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          fontWeight={800}
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
          title={s.title}
        >
          {s.title}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          <Chip size="small" color="success" variant="outlined" label={s.impact || 'Impact —'} sx={{ height: 22 }} />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <SignalCellularAltRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Bars level={diffLvl} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              Difficulty
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Dollars level={costLvl} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.25 }}>
              Cost
            </Typography>
          </Stack>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.5}>
          <TruncOneLine title={s.why}><strong>Why:</strong> {s.why || '—'}</TruncOneLine>
          <TruncOneLine title={s.how}><strong>How:</strong> {s.how || '—'}</TruncOneLine>
        </Stack>
      </Box>
      <Button
        size="small"
        variant="text"
        onClick={() => onView(s)}
        startIcon={<InfoOutlinedIcon />}
        sx={{ textTransform: 'none', fontWeight: 700, color: 'success.dark' }}
      >
        Details
      </Button>
    </Box>
  );
};

const DetailsDialog: React.FC<{ open: boolean; s: Suggestion | null; onClose: () => void }> = ({ open, s, onClose }) => {
  if (!s) return null;
  const diffLvl = levelFromText(s.difficulty) as 1 | 2 | 3;
  const costLvl = levelFromText(s.cost) as 1 | 2 | 3;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={900}>{s.title}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 1.25 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Chip size="small" color="success" label={`Impact: ${s.impact || '—'}`} />
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="caption" color="text.secondary">Difficulty</Typography>
            <Bars level={diffLvl} />
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="caption" color="text.secondary">Cost</Typography>
            <Dollars level={costLvl} />
          </Stack>
        </Stack>
        <Box>
          <Typography variant="overline" color="text.secondary">Why</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>{s.why || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">How</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>{s.how || '—'}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const AISuggestionsPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastQuizHash, setLastQuizHash] = useState<string | null>(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgItem, setDlgItem] = useState<Suggestion | null>(null);
  const clickLockRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/ai-suggestions/latest', { headers: { 'x-user-id': DEV_USER_ID } });
        const latest = res.data;
        if (latest?.tips?.length) setSuggestions(latest.tips);
      } catch {}
    })();
  }, []);

  const pushAiNotification = useCallback((count: number) => {
    try {
      const arr = JSON.parse(localStorage.getItem('notifications') || '[]');
      arr.unshift({
        id: `ai-${Date.now()}`,
        title: 'AI suggestions ready',
        body: `${count} new action${count === 1 ? '' : 's'} generated.`,
        ts: Date.now(),
        read: false,
        type: 'ai',
      });
      localStorage.setItem('notifications', JSON.stringify(arr.slice(0, 50)));
    } catch {}
  }, []);

  const handleGenerate = useCallback(
    async (opts?: { force?: boolean }) => {
      const now = Date.now();
      if (now - clickLockRef.current < 700) return;
      clickLockRef.current = now;

      if (abortRef.current) {
        try { abortRef.current.abort(); } catch {}
      }
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);

      try {
        const latestQuiz = await api.get('/api/quiz/latest', {
          headers: { 'x-user-id': DEV_USER_ID },
          signal: ac.signal as any,
        });

        if (!latestQuiz.data) {
          setError('No quiz submission found. Complete the quiz first.');
          setLoading(false);
          return;
        }

        const compact = pickQuizContext(latestQuiz.data);
        const payload = safeSlice(JSON.stringify(compact));
        const hash = String(payload.length) + ':' + (compact.region || '') + ':' + (compact._hint ? 1 : 0);

        if (!opts?.force && hash === lastQuizHash && suggestions.length > 0) {
          setToast('Suggestions are already up to date.');
          setLoading(false);
          return;
        }

        const raw = await askGPT(payload);
        if (raw.startsWith('AI error')) {
          setError(friendlyAiError(raw.replace(/^AI error:?\s*/i, '')));
          setSuggestions([]);
          setLoading(false);
          return;
        }

        const tips = parseToSuggestions(raw);
        if (!tips.length) {
          setError('AI returned an empty or unreadable response.');
          setSuggestions([]);
          setLoading(false);
          return;
        }

        setSuggestions(tips);
        setLastQuizHash(hash);

        await api.post('/api/ai-suggestions', { tips }, { headers: { 'x-user-id': DEV_USER_ID } });

        pushAiNotification(tips.length);
        setToast('Suggestions updated.');
      } catch (e: any) {
        if (e?.code !== 'ERR_CANCELED') setError(friendlyAiError(e?.message || e));
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setLoading(false);
      }
    },
    [lastQuizHash, suggestions.length, pushAiNotification]
  );

  const header = useMemo(
    () => (
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'success.main',
              color: '#fff',
              boxShadow: '0 0 0 2px rgba(46,125,50,0.25)',
            }}
          >
            <SmartToyIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight={900} sx={{ color: 'success.dark' }}>
            AI Suggestions
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Generate from your latest quiz responses">
            <span>
              <Button
                onClick={() => void handleGenerate()}
                variant="contained"
                disabled={loading}
                startIcon={<AutorenewIcon />}
                sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' }, textTransform: 'none' }}
              >
                {loading ? 'Working…' : suggestions.length ? 'Regenerate' : 'Generate'}
              </Button>
            </span>
          </Tooltip>
          {suggestions.length > 0 && (
            <Tooltip title="Force a fresh run even if nothing changed">
              <span>
                <Button onClick={() => void handleGenerate({ force: true })} variant="outlined" disabled={loading} sx={{ textTransform: 'none' }}>
                  Force
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    ),
    [loading, suggestions.length, handleGenerate]
  );

  const openDetails = (s: Suggestion) => {
    setDlgItem(s);
    setDlgOpen(true);
  };

  return (
    <>
      <Card
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 680, md: 740 },
          bgcolor: '#f3faef',
          borderRadius: 3,
          border: '1px solid rgba(117,183,141,0.35)',
          boxShadow: '0 6px 24px rgba(46,125,50,0.08)',
          p: 1.5,
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {header}

          {error && (
            <Alert severity="error" sx={{ mb: 0.5 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <EarthLoader />
          ) : suggestions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Click “Generate” to get personalized, high-impact actions to cut your emissions.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {suggestions.map((s, i) => (
                <SuggestionRow key={`${s.title}-${i}`} s={s} index={i} onView={openDetails} />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <DetailsDialog open={dlgOpen} s={dlgItem} onClose={() => setDlgOpen(false)} />

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AISuggestionsPanel;
