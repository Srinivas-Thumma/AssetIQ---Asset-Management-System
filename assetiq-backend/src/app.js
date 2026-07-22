import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';

// Route Imports
import authRouter from './routes/auth.route.js';
import locationRouter from './routes/location.route.js';
import lookupRouter from './routes/lookup.route.js';
import assetRouter from './routes/asset.route.js';
import maintenanceRouter from './routes/maintenance.route.js';
import warrantyRouter from './routes/warranty.route.js';
import aiRouter from './routes/ai.route.js';
import reportsRouter from './routes/reports.route.js';
import adminRouter from './routes/admin.route.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all client queries during local development
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// GET /health Endpoint (Observability & diagnostics check)
app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
  
  let ollamaStatus = 'unknown';
  if (env.MOCK_AI) {
    ollamaStatus = 'mocked';
  } else {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1500); // 1.5s timeout for fast fail
      const ping = await fetch(`${env.OLLAMA_URL}/api/tags`, { signal: controller.signal });
      clearTimeout(id);
      ollamaStatus = ping.ok ? 'responsive' : 'error';
    } catch (err) {
      ollamaStatus = 'unreachable';
    }
  }

  const overallUP = dbState === 1;

  res.status(overallUP ? 200 : 500).json({
    status: overallUP ? 'UP' : 'DOWN',
    timestamp: new Date(),
    details: {
      database: dbStatus,
      ollama: ollamaStatus,
      mockMode: env.MOCK_AI,
    }
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/locations', locationRouter);
app.use('/api/v1/lookups', lookupRouter);
app.use('/api/v1/assets', assetRouter);
app.use('/api/v1/maintenance', maintenanceRouter);
app.use('/api/v1/warranties', warrantyRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/admin', adminRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
