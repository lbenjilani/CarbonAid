// src/routes/chatRoutes.ts
import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const router = Router();
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// --------- Config (env-overridable) -----------------------------------------
const PRIMARY_MODEL =
  process.env.OPENROUTER_PRIMARY_MODEL || 'openai/gpt-4o-mini';

// Include grok free tier in the defaults:
const FALLBACK_MODELS = (process.env.OPENROUTER_FALLBACK_MODELS ||
  [
    'x-ai/grok-4-fast:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen2.5-72b-instruct',
    'mistralai/mixtral-8x22b-instruct',
  ].join(',')
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Output caps (many OpenRouter models honor these)
const MAX_OUTPUT_TOKENS = Number(process.env.OPENROUTER_MAX_OUTPUT_TOKENS || 1200);
const TEMPERATURE = Number(process.env.OPENROUTER_TEMPERATURE || 0.3);

// Retry settings
const RETRY_ATTEMPTS = Number(process.env.LLM_RETRY_ATTEMPTS || 2); // per model
const BREAKER_COOLDOWN_MS = Number(process.env.LLM_BREAKER_COOLDOWN_MS || 2 * 60_000); // 2m

// --------- Static, sterile prompt and JSON schema ---------------------------
const SYSTEM_PROMPT =
  'You are a server-side JSON generator. Output ONLY valid JSON matching the provided schema. Do not include explanations, prefixes, suffixes, or markdown.';

const JSON_SCHEMA = {
  name: 'TipsResponse',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      tips: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 220 },
            why: { type: 'string', minLength: 1, maxLength: 220 },
            how: { type: 'string', minLength: 1, maxLength: 220 },
            impact: { type: 'string', minLength: 1, maxLength: 220 },
            difficulty: { type: 'string', minLength: 1, maxLength: 220 },
            cost: { type: 'string', minLength: 1, maxLength: 220 },
          },
          required: ['title', 'why', 'how', 'impact', 'difficulty', 'cost'],
          additionalProperties: false,
        },
      },
    },
    required: ['tips'],
    additionalProperties: false,
  },
};

// --------- Helpers ----------------------------------------------------------
function getHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Missing OPENROUTER_API_KEY'), { status: 500 });

  return {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_APP_NAME || 'CarbonAid',
    'Content-Type': 'application/json',
  };
}

// defensive: clamp the user input to avoid huge token bills / 413s
function clampInput(s: string, max = 12_000) {
  return s.length > max ? s.slice(0, max) : s;
}

type ORSuccess = {
  choices?: { message?: { content?: string } }[];
};

type ORErrorMeta = {
  flagged_input?: string;
  reasons?: string[];
};

type ORError = {
  error?: { code?: number | string; message?: string; metadata?: ORErrorMeta };
};

function isModeration403(err: any) {
  return Number(err?.status) === 403 && /requires moderation/i.test(String(err?.message || ''));
}
function isTransient(err: any) {
  const s = Number(err?.status);
  const msg = String(err?.message || '');
  return s === 429 || (s >= 500 && s < 600) || /timeout/i.test(msg);
}

async function callModel(model: string, userContent: string) {
  const body = {
    model,
    // many models honor these; harmless if ignored
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    response_format: { type: 'json_schema', json_schema: JSON_SCHEMA },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  };

  console.log(`[CHAT] → Trying model: ${model}`);
  const resp = await axios.post<ORSuccess | ORError>(OPENROUTER_URL, body, {
    headers: getHeaders(),
    timeout: 30_000,
    validateStatus: () => true,
  });

  if (resp.status < 200 || resp.status >= 300) {
    const data = (resp.data as ORError) || {};
    const message = data?.error?.message || `HTTP ${resp.status}`;
    const reasons = data?.error?.metadata?.reasons;
    console.warn(`[CHAT] ✖ Model failed: ${model} | ${resp.status} ${message} | reasons=${JSON.stringify(reasons)}`);
    const err: any = new Error(message);
    err.status = resp.status;
    err.reasons = reasons;
    err.raw = data;
    throw err;
  }

  const content = (resp.data as ORSuccess)?.choices?.[0]?.message?.content ?? '';
  console.log(`[CHAT] ✓ Model succeeded: ${model}`);
  return content;
}

async function callWithRetries(model: string, userContent: string, attempts = RETRY_ATTEMPTS) {
  let last: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callModel(model, userContent);
    } catch (e) {
      last = e;
      if (!isTransient(e) || i === attempts - 1) throw e;
      const delay = 400 * Math.pow(2, i); // 400ms, 800ms
      console.warn(`[CHAT] ↻ transient error on ${model}, retrying in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw last;
}

// small circuit breaker in-memory
const breaker: Record<string, number> = {}; // model -> resumeAt epoch ms
function isTripped(model: string) {
  return (breaker[model] || 0) > Date.now();
}
function trip(model: string, ms = BREAKER_COOLDOWN_MS) {
  breaker[model] = Date.now() + ms;
}

// JSON extraction fallback
function extractJsonObject(s: string) {
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i >= 0 && j > i) {
    try {
      return JSON.parse(s.slice(i, j + 1));
    } catch {}
  }
  return null;
}

/** Minify/validate JSON; if invalid, try to extract object; else return raw. */
function sanitizeToJSONString(jsonish: string): string {
  const trimmed = jsonish.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && Array.isArray((parsed as any).tips)) return JSON.stringify(parsed);
  } catch {/* ignore */}

  const extracted = extractJsonObject(trimmed);
  if (extracted && Array.isArray((extracted as any).tips)) return JSON.stringify(extracted);

  return jsonish; // last resort so client can try to parse
}

// --------- Route ------------------------------------------------------------
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body as { message?: string };
    if (!message || !message.trim()) {
      res.status(400).json({ code: 'BAD_REQUEST', error: 'message is required' });
      return;
    }

    const forceFallback = req.query.fallback === '1';
    const chain = forceFallback ? [...FALLBACK_MODELS] : [PRIMARY_MODEL, ...FALLBACK_MODELS];

    const clamped = clampInput(String(message));
    let lastErr: any;
    let usedModel: string | null = null;

    for (const model of chain) {
      if (isTripped(model)) {
        console.warn(`[CHAT] ⛔ breaker skip ${model}`);
        continue;
      }
      try {
        const content = await callWithRetries(model, clamped);
        usedModel = model;

        const response = sanitizeToJSONString(content);
        const usedFallback = model !== PRIMARY_MODEL;

        res.setHeader('X-Model-Used', usedModel);
        res.json({ response, modelUsed: usedModel, usedFallback });
        return;
      } catch (e: any) {
        lastErr = e;
        if (isTransient(e)) trip(model); // cool-down flaky model
        // continue to next model
      }
    }

    if (isModeration403(lastErr)) {
      console.warn('[CHAT] ⚠ All models failed due to moderation.');
      res.status(403).json({
        code: 'MODERATION_BLOCKED',
        provider: 'openrouter',
        error: 'Provider blocked this request for moderation.',
        reasons: lastErr?.reasons ?? ['misc'],
      });
      return;
    }

    console.error('[CHAT] 🚨 All models failed.', {
      status: lastErr?.status,
      message: lastErr?.message,
    });
    res.status(Number(lastErr?.status) || 502).json({
      code: 'LLM_ERROR',
      error: String(lastErr?.message || 'AI generation failed'),
    });
    return;
  } catch (err) {
    const ax = err as AxiosError;
    console.error('[CHAT] 🚨 Route error', { message: ax.message });
    res.status(502).json({
      code: 'LLM_ERROR',
      error: 'OpenRouter request failed',
      details: ax.response?.data || ax.message,
    });
    return;
  }
});

export default router;
