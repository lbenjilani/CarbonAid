// src/services/chatService.ts
import axios from 'axios';

const API_BASE =
  (process.env.REACT_APP_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
type ChatOk = { response: string };
type ChatErr = {
  code?: 'MODERATION_BLOCKED' | 'LLM_ERROR';
  error?: string;
  provider?: string;
  reasons?: string[];
};

function toReadable(details: unknown): string {
  if (!details) return 'Unknown error';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

/**
 * Ask the server-side LLM. On 403 moderation we auto-retry once with fallback.
 */
export const askGPT = async (message: string): Promise<string> => {
  const safeMessage = message.slice(0, 8000); // keep size sane

  // First attempt (primary model)
  try {
    const res = await axios.post<ChatOk>(
      `${API_BASE}/chat`,
      { message: safeMessage },
      { timeout: 35000 }
    );
    return res.data.response;
  } catch (error: any) {
    const status = error?.response?.status as number | undefined;
    const data = error?.response?.data as ChatErr | undefined;

    // Moderation → retry once with fallback model
    if (status === 403 && data?.code === 'MODERATION_BLOCKED') {
      console.warn('[AI] moderation blocked; retrying with fallback model…', {
        provider: data.provider,
        reasons: data.reasons,
      });

      try {
        const res2 = await axios.post<ChatOk>(
          `${API_BASE}/chat?fallback=1`,
          { message: safeMessage },
          { timeout: 35000 }
        );
        return res2.data.response;
      } catch (err2: any) {
        const d2 = err2?.response?.data as ChatErr | undefined;
        const msg2 = d2?.error || err2?.message || 'Fallback failed';
        console.error('GPT Fallback Error:', msg2);
        return `AI error (fallback): ${toReadable(msg2)}`;
      }
    }

    // Non-moderation errors → surface helpful info
    const details =
      data?.error ??
      error?.response?.data?.details ??
      error?.message ??
      'Unknown error';
    console.error('GPT API Error:', details);
    return `AI error: ${toReadable(details)}`;
  }
};
