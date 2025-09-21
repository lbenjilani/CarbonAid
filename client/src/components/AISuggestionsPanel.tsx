import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  Collapse,
  Stack,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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

const buildSystemPrompt = () => `
Return ONLY valid JSON in this exact shape—no markdown, no backticks, no prose:

{
  "tips": [
    { "title": "…", "why": "…", "how": "…", "impact": "…", "difficulty": "…", "cost": "…" },
    { "title": "…", "why": "…", "how": "…", "impact": "…", "difficulty": "…", "cost": "…" },
    { "title": "…", "why": "…", "how": "…", "impact": "…", "difficulty": "…", "cost": "…" },
    { "title": "…", "why": "…", "how": "…", "impact": "…", "difficulty": "…", "cost": "…" },
    { "title": "…", "why": "…", "how": "…", "impact": "…", "difficulty": "…", "cost": "…" }
  ]
}

Constraints:
- Tailor to the user's transport, energy, diet, and consumption context.
- Keep each field concise (≈<=220 chars).
- "impact" is a readable estimate (e.g., "200–350 kg CO2e/yr").
- No extra keys. No fences. No prose.
`.trim();

const parseToSuggestions = (text: string): Suggestion[] => {
  if (!text) return [];

  // 1) Strip markdown code fences if present
  let core = text.trim();
  const fence = core.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) core = fence[1].trim();

  // 2) If any preface exists, cut to first JSON token
  const firstArr = core.indexOf('[');
  const firstObj = core.indexOf('{');
  const cutAt = firstArr === -1 ? firstObj : (firstObj === -1 ? firstArr : Math.min(firstArr, firstObj));
  if (cutAt > 0) core = core.slice(cutAt);

  // 3) Try parsing { tips: [...] } or [...]
  try {
    const parsed = JSON.parse(core);

    const toList = (arr: any[]) =>
      arr.slice(0, 5).map((x: any) => ({
        title: String(x.title ?? '').trim() || 'Suggestion',
        why: String(x.why ?? '').trim() || '—',
        how: String(x.how ?? '').trim() || '—',
        impact: String(x.impact ?? '').trim() || '—',
        difficulty: String(x.difficulty ?? '').trim() || '—',
        cost: String(x.cost ?? '').trim() || '—',
      }));

    if (Array.isArray(parsed)) return toList(parsed);
    if (parsed && Array.isArray(parsed.tips)) return toList(parsed.tips);
  } catch {
    // continue to fallback
  }

  // 4) Fallback: split plaintext into up to 5 items
  const items = core.split(/\n\s*(?=\d+\.\s|[-*•]\s)/g).filter(Boolean).slice(0, 5);
  return items.map((t) => ({
    title: t.replace(/^(\d+\.\s*|[-*•]\s*)/, '').slice(0, 80),
    why: 'N/A',
    how: t.slice(0, 200),
    impact: 'N/A',
    difficulty: 'N/A',
    cost: 'N/A',
  }));
};

const AISuggestionsPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load latest saved suggestions on mount
  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get('/api/ai-suggestions/latest', {
          headers: { 'x-user-id': DEV_USER_ID },
        });
        const latest = res.data;
        if (latest?.tips?.length) setSuggestions(latest.tips);
      } catch {
        // no saved suggestions yet; not fatal
      }
    })();
  }, []);

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setExpandedIndex(null);
    try {
      // Pull latest quiz as context
      const latestQuiz = await api.get('/api/quiz/latest', {
        headers: { 'x-user-id': DEV_USER_ID },
      });
      if (!latestQuiz.data) {
        setError('No quiz submission found. Complete the quiz first.');
        setLoading(false);
        return;
      }

      const ctx = JSON.stringify(latestQuiz.data);
      const sys = buildSystemPrompt();
      const message = `${sys}\n\nUSER_DATA:\n${ctx}`;

      // Call backend /chat (through axios service that points to API base)
      const raw = await askGPT(message);
      const tips = parseToSuggestions(raw);

      if (!tips.length) {
        setError('AI returned an empty response.');
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setSuggestions(tips);

      // Persist to server
      await api.post('/api/ai-suggestions', { tips }, {
        headers: { 'x-user-id': DEV_USER_ID },
      });
    } catch (e: any) {
      console.error(e);
      setError('Failed to generate suggestions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        bgcolor: '#fff',
        borderRadius: 3,
        boxShadow: 2,
        p: 2,
        minHeight: 300,
        flex: 1,
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <SmartToyIcon color="success" />
          <Typography variant="h6" fontWeight="bold">
            AI Suggestions
          </Typography>
        </Stack>

        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Personalized emission-reduction strategies based on your quiz.
        </Typography>

        <Button
          onClick={() => void handleGenerate()}
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{ mb: 2, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
        >
          {loading ? 'Generating...' : (suggestions.length ? 'Regenerate' : 'Generate')}
        </Button>

        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box textAlign="center" mt={3}>
            <CircularProgress color="success" />
          </Box>
        ) : (
          <Stack spacing={2}>
            {suggestions.map((s, i) => (
              <Card key={i} variant="outlined" sx={{ borderRadius: 2, borderColor: 'divider' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={600}>
                      {i + 1}. {s.title}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                      endIcon={expandedIndex === i ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    >
                      {expandedIndex === i ? 'Hide' : 'Details'}
                    </Button>
                  </Stack>

                  <Collapse in={expandedIndex === i}>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Why:</strong> {s.why}
                    </Typography>
                    <Typography variant="body2">
                      <strong>How:</strong> {s.how}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      <Chip label={`Impact: ${s.impact}`} color="success" size="small" />
                      <Chip label={`Difficulty: ${s.difficulty}`} color="warning" size="small" />
                      <Chip label={`Cost: ${s.cost}`} color="info" size="small" />
                    </Stack>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default AISuggestionsPanel;
