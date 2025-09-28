import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const router = Router();
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// --------- Config (env-overridable) -----------------------------------------
const PRIMARY_MODEL =
  process.env.OPENROUTER_PRIMARY_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const FALLBACK_MODELS = (process.env.OPENROUTER_FALLBACK_MODELS ||
  'qwen/qwen2.5-72b-instruct,mistralai/mixtral-8x22b-instruct')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

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
            cost: { type: 'string', minLength: 1, maxLength: 220 }
          },
          required: ['title', 'why', 'how', 'impact', 'difficulty', 'cost'],
          additionalProperties: false
        }
      }
    },
    required: ['tips'],
    additionalProperties: false
  }
};

// --------- Helpers ----------------------------------------------------------
function getHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Missing OPENROUTER_API_KEY'), { status: 500 });

  return {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_APP_NAME || 'CarbonAid',
    'Content-Type': 'application/json'
  };
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

async function callModel(model: string, userContent: string) {
  const body = {
    model,
    response_format: { type: 'json_schema', json_schema: JSON_SCHEMA },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ],
    temperature: 0.3
  };

  console.log(`[CHAT] → Trying model: ${model}`);
  const resp = await axios.post<ORSuccess | ORError>(OPENROUTER_URL, body, {
    headers: getHeaders(),
    timeout: 30000,
    validateStatus: () => true
  });

  if (resp.status < 200 || resp.status >= 300) {
    const data = (resp.data as ORError) || {};
    const message = data?.error?.message || `HTTP ${resp.status}`;
    const reasons = data?.error?.metadata?.reasons;
    const flagged = data?.error?.metadata?.flagged_input;
    console.warn(`[CHAT] ✖ Model failed: ${model}`, {
      status: resp.status,
      message,
      reasons
    });
    const err: any = new Error(message);
    err.status = resp.status;
    err.reasons = reasons;
    err.flaggedInput = flagged;
    err.raw = data;
    throw err;
  }

  const content = (resp.data as ORSuccess)?.choices?.[0]?.message?.content ?? '';
  console.log(`[CHAT] ✓ Model succeeded: ${model}`);
  return content;
}

function isModeration403(err: any) {
  return (
    Number(err?.status) === 403 &&
    /requires moderation/i.test(String(err?.message || ''))
  );
}

/** Minify/validate JSON; if invalid, return original text. */
function sanitizeToJSONString(jsonish: string): string {
  const trimmed = jsonish.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || !Array.isArray(parsed.tips)) throw new Error('bad shape');
    return JSON.stringify(parsed); // minified
  } catch {
    return jsonish;
  }
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
    const models = forceFallback ? [...FALLBACK_MODELS] : [PRIMARY_MODEL, ...FALLBACK_MODELS];

    let lastErr: any;
    let usedModel: string | null = null;

    for (const model of models) {
      try {
        const content = await callModel(model, String(message));
        usedModel = model;
        const response = sanitizeToJSONString(content);
        // Return modelUsed for observability; remove later if not needed.
        res.json({ response, modelUsed: usedModel, usedFallback: model !== PRIMARY_MODEL });
        return;
      } catch (e: any) {
        lastErr = e;
        // Keep looping on moderation 403 and other transient errors
        continue;
      }
    }

    if (isModeration403(lastErr)) {
      console.warn('[CHAT] ⚠ All models failed due to moderation.');
      res.status(403).json({
        code: 'MODERATION_BLOCKED',
        provider: 'openrouter',
        error: 'Provider blocked this request for moderation.',
        reasons: lastErr?.reasons ?? ['misc']
      });
      return;
    }

    console.error('[CHAT] 🚨 All models failed.', {
      status: lastErr?.status,
      message: lastErr?.message
    });
    res.status(Number(lastErr?.status) || 502).json({
      code: 'LLM_ERROR',
      error: String(lastErr?.message || 'AI generation failed')
    });
    return;
  } catch (err) {
    const ax = err as AxiosError;
    console.error('[CHAT] 🚨 Route error', { message: ax.message });
    res.status(502).json({
      code: 'LLM_ERROR',
      error: 'OpenRouter request failed',
      details: ax.response?.data || ax.message
    });
    return;
  }
});

export default router;
