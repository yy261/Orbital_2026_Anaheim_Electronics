import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { simulateRouter } from './routes/simulate';
import { simulateElectricalRouter } from './routes/simulateElectrical';

// The Express app is created here and exported WITHOUT calling listen(), so it
// can be imported directly by tests (supertest) without binding a port.
// index.ts imports this app and starts the server.
export const app = express();

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            const productionOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

            let isAllowed = false;

            if (origin === productionOrigin) {
                isAllowed = true;
            }

            if (origin === 'http://localhost:3000') {
                isAllowed = true;
            }

            if (origin.endsWith('.vercel.app')) {
                isAllowed = true;
            }

            if (isAllowed) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
    })
);

app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/simulate/electrical', simulateElectricalRouter);
