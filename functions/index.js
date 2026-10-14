/**
 * Cloud Functions for Firebase v2 Entry Point
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 */

const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');

const app = express();
const apiRouter = express.Router();

// CORS Middleware
app.use(cors({ origin: true, credentials: true }));

// Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Register all API routes on apiRouter with lazy loading for instant startup
apiRouter.use('/auth', (req, res, next) => require('./routes/auth')(req, res, next));
apiRouter.use('/users', (req, res, next) => require('./routes/users')(req, res, next));
apiRouter.use('/profile', (req, res, next) => require('./routes/profile')(req, res, next));
apiRouter.use('/reports', (req, res, next) => require('./routes/reports')(req, res, next));
apiRouter.use('/principal', (req, res, next) => require('./routes/principal')(req, res, next));
apiRouter.use('/supervisor', (req, res, next) => require('./routes/supervisor')(req, res, next));
apiRouter.use('/admin', (req, res, next) => require('./routes/admin')(req, res, next));
apiRouter.use('/verify', (req, res, next) => require('./routes/verify')(req, res, next));
apiRouter.use('/upload', (req, res, next) => require('./routes/upload')(req, res, next));

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'מערכת דיווח שעות פעילות חודשית של"ח',
    platform: 'Google Firebase Cloud Functions v2',
    version: '2.1.0',
    timestamp: new Date().toISOString()
  });
});

apiRouter.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Shalah API is running on Google Cloud Functions v2'
  });
});

// Mount under both /api and root
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Functions API error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'שגיאת שרת פנימית ב-Cloud Functions'
  });
});

// Export Cloud Function v2
exports.api = onRequest({
  region: 'me-west1',
  cors: true,
  invoker: 'public',
  maxInstances: 10,
  minInstances: 0,
  memory: '256MiB',
  timeoutSeconds: 60
}, app);
