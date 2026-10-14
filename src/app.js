import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import enquiryRoutes from './routes/enquiries.js';

export function createApp(db) {
  const app = express();
  const isTest = process.env.NODE_ENV === 'test';
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
  app.use(helmet());
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '10kb' }));

  const limiter = (max) =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => isTest,
      message: { error: 'Too many requests, please try again later' },
    });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', limiter(20), authRoutes(db));
  app.use('/api/enquiries', enquiryRoutes(db, { publicLimiter: limiter(30) }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large')
      return res.status(413).json({ error: 'Payload too large' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
