import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Collapse,
  Stack,
  Snackbar,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AutorenewIcon from '@mui/icons-material/Autorenew';
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

/* ---------------- helpers (pure) ---------------- */

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
  if (out.transport && out.energy) {
    out._hint = 'prioritize the biggest annual CO2e reductions across transport and energy first';
  }
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

/* ---------------- tiny rotating-earth loader ---------------- */
const EarthLoader: React.FC = () => (
  <Box
    sx={{
      display: 'grid',
      placeItems: 'center',
      height: 180,
    }}
  >
    <Box
      sx={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #7ec8a3 25%, #2d8555 26% 40%, #7ec8a3 41% 55%, #2d8555 56% 70%, #7ec8a3 71%)',
        boxShadow: 'inset -8px -10px 16px rgba(0,0,0,0.15), 0 0 0 4px rgba(117,183,141,0.35)',
        position: 'relative',
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

/* ---------------- Suggestion Card ---------------- */
const SuggestionCard = React.memo(function SuggestionCard({
  s,
  i,
  expanded,
  toggle,
}: {
  s: Suggestion;
  i: number;
  expanded: boolean;
  toggle: (idx: number) => void;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: 'rgba(99, 161, 116, 0.35)',
        background: '#f7fff3',
      }}
    >
      <CardContent sx={{ pt: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={700}>
            {i + 1}. {s.title}
          </Typography>
          <Button
            size="small"
            onClick={() => toggle(i)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ color: '#1f7a3a', fontWeight: 700 }}
          >
            {expanded ? 'Hide' : 'Details'}
          </Button>
        </Stack>

        <Collapse
          in={expanded}
          unmountOnExit
          sx={{
            // keep width stable by reserving scrollbar gutter
            scrollbarGutter: 'stable both-edges',
          }}
        >
          <Divider sx={{ my: 1.25 }} />
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Why:</strong> {s.why}
          </Typography>
          <Typography variant="body2">
            <strong>How:</strong> {s.how}
          </Typography>
          <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap">
            <Chip label={`Impact: ${s.impact}`} sx={{ bgcolor: '#2e7d32', color: '#fff' }} size="small" />
            <Chip label={`Difficulty: ${s.difficulty}`} sx={{ bgcolor: '#f57c00', color: '#fff' }} size="small" />
            <Chip label={`Cost: ${s.cost}`} sx={{ bgcolor: '#0288d1', color: '#fff' }} size="small" />
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
});

/* ---------------- component ---------------- */

const AISuggestionsPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // expand first by default
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastQuizHash, setLastQuizHash] = useState<string | null>(null);
  const clickLockRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  // Load latest saved suggestions on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/ai-suggestions/latest', {
          headers: { 'x-user-id': DEV_USER_ID },
        });
        const latest = res.data;
        if (latest?.tips?.length) setSuggestions(latest.tips);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const toggleExpand = useCallback(
    (idx: number) => setExpandedIndex((cur) => (cur === idx ? null : idx)),
    []
  );

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
        setExpandedIndex(0); // open first item after fresh generate

        // Persist to server
        await api.post(
          '/api/ai-suggestions',
          { tips },
          { headers: { 'x-user-id': DEV_USER_ID } }
        );
        setToast('Suggestions updated.');
      } catch (e: any) {
        if (e?.code !== 'ERR_CANCELED') {
          console.error(e);
          setError(friendlyAiError(e?.message || e));
        }
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setLoading(false);
      }
    },
    [lastQuizHash, suggestions.length]
  );

  const header = useMemo(
    () => (
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 1 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: '#2e7d32',
            color: '#fff',
            boxShadow: '0 0 0 2px rgba(46,125,50,0.25)',
          }}
        >
          <SmartToyIcon fontSize="small" />
        </Box>
        <Typography variant="h6" fontWeight={900} sx={{ color: '#1c6b34' }}>
          AI Suggestions
        </Typography>
      </Stack>
    ),
    []
  );

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: '0 6px 24px rgba(46,125,50,0.08)',
        p: 2,
        minHeight: 300,
        flex: 1,
        maxHeight: 640,
        display: 'flex',
        flexDirection: 'column',
        // soft green surface (no pure white)
        bgcolor: '#f3faef',
        border: '1px solid rgba(117,183,141,0.35)',
      }}
    >
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 0,
        }}
      >
        <Box sx={{ px: 1 }}>
          {header}
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            Personalized emission-reduction strategies based on your latest quiz.
          </Typography>

          <Stack direction="row" spacing={1.25} sx={{ mb: 1 }}>
            <Button
              onClick={() => void handleGenerate()}
              variant="contained"
              startIcon={<AutorenewIcon />}
              disabled={loading}
              sx={{
                bgcolor: '#2e7d32',
                '&:hover': { bgcolor: '#1b5e20' },
                borderRadius: 2,
                fontWeight: 800,
                textTransform: 'none',
                px: 2.25,
              }}
            >
              {loading ? 'Generating…' : suggestions.length ? 'Regenerate' : 'Generate'}
            </Button>
            {suggestions.length > 0 && (
              <Tooltip title="Bypass freshness check (always fetch a new set)">
                <span>
                  <Button
                    onClick={() => void handleGenerate({ force: true })}
                    variant="outlined"
                    disabled={loading}
                    sx={{
                      borderColor: '#2e7d32',
                      color: '#1f7a3a',
                      fontWeight: 800,
                      textTransform: 'none',
                      borderRadius: 2,
                    }}
                  >
                    Force
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        </Box>

        <Divider sx={{ borderColor: 'rgba(117,183,141,0.25)', mb: 1 }} />

        {error && (
          <Alert severity="error" sx={{ mx: 1, mb: 1, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <EarthLoader />
        ) : (
          <Box
            sx={{
              flex: 1,
              overflowY: 'scroll',
              pr: 1,
              // keep width stable (no wobble when showing/hiding details)
              scrollbarGutter: 'stable both-edges',
            }}
          >
            {suggestions.length === 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  height: 160,
                  color: 'text.secondary',
                  border: '1px dashed rgba(117,183,141,0.45)',
                  borderRadius: 2,
                  mx: 1,
                  bgcolor: '#f7fff3',
                }}
              >
                <Typography variant="body2">Click Generate to get personalized actions.</Typography>
              </Box>
            ) : (
              <Stack spacing={1.25} sx={{ px: 1 }}>
                {suggestions.map((s, i) => (
                  <SuggestionCard
                    key={`${s.title}-${i}`}
                    s={s}
                    i={i}
                    expanded={expandedIndex === i}
                    toggle={toggleExpand}
                  />
                ))}
              </Stack>
            )}
          </Box>
        )}
      </CardContent>

      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default AISuggestionsPanel;
