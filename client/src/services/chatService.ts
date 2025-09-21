// src/services/chatService.ts
import axios from 'axios';

const API_BASE =
  (process.env.REACT_APP_API_BASE || 'http://localhost:5000').replace(/\/$/, '');

export const askGPT = async (message: string): Promise<string> => {
  try {
    const res = await axios.post(`${API_BASE}/chat`, { message }, { timeout: 30000 });
    return res.data.response as string;
  } catch (error: any) {
    // Try to extract helpful server-provided error detail
    const details =
      error?.response?.data?.details ||
      error?.response?.data?.error ||
      error?.message ||
      'Unknown error';
    console.error('GPT API Error:', details);
    return `AI error: ${typeof details === 'string' ? details : JSON.stringify(details)}`;
  }
};
