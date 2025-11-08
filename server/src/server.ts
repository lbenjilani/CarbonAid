// server/src/index.ts
import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './db/db';

import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import ukGasRoutes from './routes/ukGasRoutes';
import quizRoutes from './routes/quizRoutes';
import chatRoutes from './routes/chatRoutes';
import taskRoutes from './routes/taskRoutes';
import aiSuggestionRoutes from './routes/aiSuggestionRoutes';

const app: Application = express();

// ----- Allowed Origins -----
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const allowedOrigins = [...defaultOrigins, ...allowedOriginsEnv];

// ----- Middleware -----
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Blocked CORS origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ----- Health -----
app.get('/healthz', (_req: Request, res: Response): void => {
  res.json({ ok: true });
});

// ----- Root demo -----
app.get('/home', (_req: Request, res: Response): void => {
  res.send('Welcome to the AI Model API');
});

// ----- Dummy Model Route -----
app.post('/api/model', async (req: Request, res: Response): Promise<void> => {
  try {
    const inputData = req.body;
    const modelOutput = `Processed data: ${JSON.stringify(inputData)}`;
    res.json({ output: modelOutput });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ----- Feature routes -----
app.use('/api', userRoutes);
app.use('/api', authRoutes);
app.use('/api', ukGasRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai-suggestions', aiSuggestionRoutes);

// ----- 404 -----
app.use((req: Request, res: Response): void => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// ----- Error handler -----
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof mongoose.Error) {
    console.error('Mongoose error:', err);
    res.status(500).json({ error: 'Database Error' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ----- Start -----
const start = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('Database connection established, starting the server...');
    const PORT = Number(process.env.PORT || 5000);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log('🌍 Allowed origins:', allowedOrigins);
    });
  } catch (err) {
    console.error('Failed to connect to the database. Exiting...', err);
    process.exit(1);
  }
};

void start();
