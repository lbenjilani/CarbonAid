import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './db/db';
import userRoutes from './routes/userRoutes'; // ✅ Added

dotenv.config({ path: './.env' });

const app = express();

app.use(cors());
app.use(bodyParser.json());

connectDB()
  .then(() => {
    console.log('Database connection established, starting the server...');
  })
  .catch((err) => {
    console.error('Failed to connect to the database. Exiting...', err);
    process.exit(1);
  });

// ROOT Route
app.get('/home', (req: Request, res: Response) => {
  res.send('Welcome to the AI Model API');
});

// Dummy Model Route (you can rename or remove later)
app.post('/api/model', async (req: Request, res: Response) => {
  try {
    const inputData = req.body;
    const modelOutput = `Processed data: ${JSON.stringify(inputData)}`;
    res.json({ output: modelOutput });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Add User Routes
app.use('/api', userRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
