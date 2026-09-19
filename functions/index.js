/**
 * Cloud Functions for Firebase v2 Entry Point
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// CORS Middleware
app.use(cors({ origin: true, credentials: true }));

// Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Register all API routes from server
app.use('/auth', require('../server/routes/auth'));
app.use('/profile', require('../server/routes/profile'));
app.use('/reports', require('../server/routes/reports'));
app.use('/principal', require('../server/routes/principal'));
app.use('/supervisor', require('../server/routes/supervisor'));
app.use('/admin', require('../server/routes/admin'));
app.use('/verify', require('../server/routes/verify'));
app.use('/upload', require('../server/routes/upload'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'מערכת דיווח שעות פעילות חודשית של"ח',
    platform: 'Google Firebase (Cloud Functions v2 + Cloud Firestore)',
    version: '2.1.0',
    timestamp: new Date().toISOString()
  });
});

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
  region: 'me-west1', // Tel Aviv / Middle East region (or fallback europe-west1)
  cors: true,
  maxInstances: 10,
  minInstances: 0,
  memory: '256MiB',
  timeoutSeconds: 60
}, app);
