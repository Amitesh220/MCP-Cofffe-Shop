const express = require('express');
const cors = require('cors');
const { runPipeline } = require('./services/pipeline');
const { runUIPipeline } = require('./services/uiPipeline');
const { runSystemPipeline } = require('./services/systemPipeline');
const { runAnalysis } = require('./services/analyzer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── FIX #5: Pipeline Execution Locks ────────────────────────
let dataTaskRunning = false;
let isRunning = false;
let systemTaskRunning = false;

// ── Request Logger ──────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`\n📥 [AGENT] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('   Body:', JSON.stringify(req.body, null, 2).substring(0, 500));
  }
  next();
});

// ── Health ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════
// PIPELINE ENDPOINTS
// ══════════════════════════════════════════════════════════════

// ── DATA Pipeline (existing — backward compatible) ──────────
app.post('/run-pipeline', async (req, res) => {
  const { action, originalCommand } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  // Reject if pipeline already running
  if (dataTaskRunning) {
    console.log('⚠️  [LOCK] DATA pipeline already running');
    return res.status(503).json({
      status: 'BUSY',
      error: 'Data pipeline is already running. Please wait for it to complete.'
    });
  }

  // Normalize: support both single action and array of actions
  const actionList = Array.isArray(action) ? action : [action];
  const actionSummary = actionList.map(a => `${a.action}:${a.name || '?'}`).join(', ');

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 [PIPELINE] Starting DATA pipeline with ${actionList.length} action(s)`);
  console.log(`   Actions: ${actionSummary}`);
  console.log(`   Original command: "${originalCommand}"`);
  console.log(`${'═'.repeat(60)}`);

  dataTaskRunning = true;

  try {
    const result = await runPipeline(action, originalCommand);
    console.log(`\n✅ [PIPELINE] Completed with status: ${result.status}`);
    if (result.actionsProcessed) {
      console.log(`   Actions processed: ${result.actionsProcessed}`);
    }
    console.log(`${'═'.repeat(60)}\n`);
    dataTaskRunning = false;
    res.json(result);
  } catch (err) {
    console.error(`\n❌ [PIPELINE] Failed: ${err.message}`);
    console.log(`${'═'.repeat(60)}\n`);
    dataTaskRunning = false;
    res.status(500).json({
      status: 'ERROR',
      error: err.message,
      action: actionList
    });
  }
});

// ── UI Pipeline (NEW) ───────────────────────────────────────
app.post('/run-ui-pipeline', async (req, res) => {
  const { parsed, originalCommand } = req.body;

  if (!parsed || !parsed.actions) {
    return res.status(400).json({ error: 'Parsed actions required' });
  }

  // Reject if pipeline already running
  if (isRunning) {
    res.json({ status: "ignored", message: "Pipeline already running" });
    return;
  }

  isRunning = true;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎨 [PIPELINE] Starting UI pipeline`);
  console.log(`   Intent: ${parsed.intent}`);
  console.log(`   Actions: ${parsed.actions.length}`);
  console.log(`   Original command: "${originalCommand}"`);
  console.log(`${'═'.repeat(60)}`);

  try {
    const result = await runUIPipeline(parsed, originalCommand);
    console.log(`\n✅ [UI-PIPELINE] Completed with status: ${result.status}`);
    console.log(`${'═'.repeat(60)}\n`);
    res.json(result);
  } catch (err) {
    console.error(`\n❌ [UI-PIPELINE] Failed: ${err.message}`);
    console.log(`${'═'.repeat(60)}\n`);
    res.status(500).json({
      status: 'ERROR',
      category: 'UI',
      error: err.message
    });
  } finally {
    isRunning = false;
  }
});

// ── SYSTEM Pipeline (NEW) ───────────────────────────────────
app.post('/run-system-pipeline', async (req, res) => {
  const { parsed, originalCommand } = req.body;

  if (!parsed || !parsed.actions) {
    return res.status(400).json({ error: 'Parsed actions required' });
  }

  // Reject if pipeline already running
  if (systemTaskRunning) {
    console.log('⚠️  [LOCK] SYSTEM pipeline already running');
    return res.status(503).json({
      status: 'BUSY',
      error: 'System pipeline is already running. Please wait for it to complete.'
    });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⚙️  [PIPELINE] Starting SYSTEM pipeline`);
  console.log(`   Intent: ${parsed.intent}`);
  console.log(`   Actions: ${parsed.actions.length}`);
  console.log(`   Original command: "${originalCommand}"`);
  console.log(`${'═'.repeat(60)}`);

  systemTaskRunning = true;

  try {
    const result = await runSystemPipeline(parsed, originalCommand);
    console.log(`\n✅ [SYSTEM-PIPELINE] Completed with status: ${result.status}`);
    console.log(`${'═'.repeat(60)}\n`);
    systemTaskRunning = false;
    res.json(result);
  } catch (err) {
    console.error(`\n❌ [SYSTEM-PIPELINE] Failed: ${err.message}`);
    console.log(`${'═'.repeat(60)}\n`);
    systemTaskRunning = false;
    res.status(500).json({
      status: 'ERROR',
      category: 'SYSTEM',
      error: err.message
    });
  }
});

// ── ANALYSIS Endpoint (NEW) ─────────────────────────────────
app.post('/analyze', async (req, res) => {
  const { parsed, originalCommand } = req.body;

  if (!parsed) {
    return res.status(400).json({ error: 'Parsed request required' });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔍 [ANALYSIS] Starting analysis`);
  console.log(`   Question: "${originalCommand}"`);
  console.log(`${'═'.repeat(60)}`);

  try {
    const result = await runAnalysis(parsed, originalCommand);
    console.log(`\n✅ [ANALYSIS] Completed`);
    console.log(`${'═'.repeat(60)}\n`);
    res.json(result);
  } catch (err) {
    console.error(`\n❌ [ANALYSIS] Failed: ${err.message}`);
    console.log(`${'═'.repeat(60)}\n`);
    res.status(500).json({
      status: 'ERROR',
      category: 'ANALYSIS',
      error: err.message
    });
  }
});

// ── Pipeline Status ─────────────────────────────────────────
app.get('/status', (req, res) => {
  res.json({
    service: 'agent',
    version: '2.0.0',
    capabilities: ['DATA', 'UI', 'SYSTEM', 'ANALYSIS'],
    status: 'idle',
    lastRun: null,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🤖 Agent Service v2.0 running on port ${PORT}`);
  console.log(`   DATA Pipeline:    POST http://localhost:${PORT}/run-pipeline`);
  console.log(`   UI Pipeline:      POST http://localhost:${PORT}/run-ui-pipeline`);
  console.log(`   System Pipeline:  POST http://localhost:${PORT}/run-system-pipeline`);
  console.log(`   Analysis:         POST http://localhost:${PORT}/analyze`);
  console.log(`   Health:           GET  http://localhost:${PORT}/health`);
  console.log(`   Status:           GET  http://localhost:${PORT}/status\n`);
});
