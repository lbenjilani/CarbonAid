import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const router = Router();
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body as { message?: string };
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing OPENROUTER_API_KEY on server' });
      return;
    }

    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'CarbonAid',
      'Content-Type': 'application/json',
    };

    const system = `
You are a carbon coach. Return ONLY valid JSON. No markdown, no backticks, no prose.
Schema:
{
  "tips": [
    { "title": string, "why": string, "how": string, "impact": string, "difficulty": string, "cost": string }
  ]
}
Keep each field concise (<= ~220 chars). Tailor to transport, energy, diet, and consumption context when provided. No extra keys.
`.trim();

    const body = {
      model,
      // Many OpenRouter models honor this; if not, client still sanitizes.
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: String(message) },
      ],
      temperature: 0.4,
    };

    const resp = await axios.post(OPENROUTER_URL, body, {
      headers,
      timeout: 30000,
      validateStatus: () => true,
    });

    if (resp.status < 200 || resp.status >= 300) {
      res.status(resp.status).json({ error: 'OpenRouter error', details: resp.data });
      return;
    }

    const content = resp.data?.choices?.[0]?.message?.content ?? '';

    // Try to verify JSON here so client gets predictable payload
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.tips)) {
        res.json({ response: JSON.stringify(parsed) }); // keep client contract (string)
        return;
      }
    } catch {
      // fall through – client will sanitize
    }

    res.json({ response: content });
    return;
  } catch (err) {
    const ax = err as AxiosError;
    res.status(502).json({
      error: 'OpenRouter request failed',
      details: ax.response?.data || ax.message,
    });
    return;
  }
});

export default router;
