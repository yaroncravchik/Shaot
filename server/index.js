/**
 * Main Server Entry Point
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות פעילות חודשית של"ח)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { db, initSchema } = require('./db/database');
const { seed } = require('./db/seed');

// Initialize database schema
initSchema();

// Auto-seed if database has no users
try {
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCountRow || userCountRow.count === 0) {
    console.log('Database empty. Running initial seed...');
    seed();
  }
} catch (e) {
  console.log('Database check on startup:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
app.use(cors({
 origin: true,
 credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
 fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static frontend and uploads
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
 app.use(express.static(publicDir));
}
app.use('/uploads', express.static(uploadsDir));

// Register API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/principal', require('./routes/principal'));
app.use('/api/supervisor', require('./routes/supervisor'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/upload', require('./routes/upload'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  let userCount = 0;
  let reportCount = 0;
  try {
    userCount = db.prepare('SELECT COUNT(*) as c FROM users').get()?.c || 0;
    reportCount = db.prepare('SELECT COUNT(*) as c FROM reports').get()?.c || 0;
  } catch (e) {}

  res.json({
    status: 'healthy',
    system: 'מערכת דיווח שעות פעילות חודשית של"ח',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
    stats: {
      totalUsers: userCount,
      totalReports: reportCount
    }
  });
});

// Single-page App fallback for client-side routing
app.get('*', (req, res, next) => {
 if (req.path.startsWith('/api/')) {
 return next();
 }
 const indexPath = path.join(publicDir, 'index.html');
 if (fs.existsSync(indexPath)) {
 return res.sendFile(indexPath);
 }
 res.status(200).send(`
 <!DOCTYPE html>
 <html lang="he" dir="rtl">
 <head>
 <meta charset="UTF-8">
 <title>מערכת דיווח שעות פעילות חודשית של"ח - שרת פעיל</title>
 <style>
 body { font-family: system-ui, -apple-system, sans-serif; background: #f5f8fa; color: #0c3058; text-align: center; padding: 50px; }
 .card { background: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
 h1 { color: #007bff; }
 .badge { background: #e8f5e9; color: #2e7d32; padding: 6px 14px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
 code { background: #f0f4f8; padding: 2px 8px; border-radius: 4px; }
 </style>
 </head>
 <body>
 <div class="card">
 <div class="badge"> שרת ה-API פעיל ותקין</div>
 <h1>מערכת דיווח שעות פעילות חודשית של"ח</h1>
 <p>משרד החינוך - מינהל חברה ונוער</p>
 <p>השרת זמין ומספק שירותי API בנתיב <code>/api</code>.</p>
 </div>
 </body>
 </html>
 `);
});

// Global Error Handler
app.use((err, req, res, next) => {
 console.error('Unhandled server error:', err);
 res.status(err.status || 500).json({
 success: false,
 error: err.message || 'שגיאת שרת פנימית בלתי צפויה.'
 });
});

// Start Server if executed directly
if (require.main === module) {
 const server = app.listen(PORT, () => {
 console.log(`========================================================`);
 console.log(` מערכת דיווח שעות פעילות חודשית של"ח - משרד החינוך `);
 console.log(` Server running at http://localhost:${PORT}`);
 console.log(` API Health: http://localhost:${PORT}/api/health`);
 console.log(`========================================================`);
 });
}

module.exports = app;
