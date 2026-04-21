const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/order');
const ownerCommandRoutes = require('./routes/ownerCommand');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Deployment Version Tracking (for FIX #9) ────────────────
let deploymentVersion = Math.floor(Date.now() / 1000);

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));

// ── Request Logger ──────────────────────────────────────────
app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log(`\n📥 [BACKEND] POST ${req.url}`);
    console.log('   Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────
app.use('/menu', menuRoutes);
app.use('/order', orderRoutes);
app.use('/owner-command', ownerCommandRoutes);

// ── Health Check (includes deployment version for FIX #9) ────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    deployment_version: deploymentVersion,
    timestamp: new Date().toISOString()
  });
});

// ── API endpoint to update deployment version after deploy ──
app.post('/deployment/notify', (req, res) => {
  deploymentVersion = Math.floor(Date.now() / 1000);
  console.log(`📢 [DEPLOYMENT] Version updated to ${deploymentVersion}`);
  res.json({ deployment_version: deploymentVersion });
});
app.use((err, req, res, next) => {
  console.error('❌ [BACKEND ERROR]', err.message);
  
  // Ensure we never send HTML errors to the frontend
  res.status(err.status || 500).json({
    status: 'error',
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n☕ Coffee Shop Backend running on port ${PORT}`);
  console.log(`   Menu API:      http://localhost:${PORT}/menu`);
  console.log(`   Order API:     http://localhost:${PORT}/order`);
  console.log(`   Owner Command: http://localhost:${PORT}/owner-command`);
  console.log(`   Health:        http://localhost:${PORT}/health\n`);
});

module.exports = app;
