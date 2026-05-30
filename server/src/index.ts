import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { simulateRouter } from './routes/simulate';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  })
);

app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/simulate', simulateRouter);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});