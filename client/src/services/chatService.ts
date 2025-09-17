// src/services/chatService.ts
import axios from 'axios';

export const askGPT = async (message: string): Promise<string> => {
  try {
    const res = await axios.post('http://localhost:5000/chat', {
        message,
      });
    return res.data.response;
  } catch (error: any) {
    console.error("GPT API Error:", error);
    return "Something went wrong.";
  }
};
