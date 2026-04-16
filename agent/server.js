const express = require('express');
const cors = require('cors');
const { runPipeline } = require('./services/pipeline');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Request Logger ──────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`\n📥 [AGENT] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('   Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ── Health ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent', timestamp: new Date().toISOString() });
});

// ── Run Pipeline ────────────────────────────────────────────
app.post('/run-pipeline', async (req, res) => {
  const { action, originalCommand } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  // Normalize: support both single action and array of actions
  const actionList = Array.isArray(action) ? action : [action];
  const actionSummary = actionList.map(a => `${a.action}:${a.name || '?'}`).join(', ');

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 [PIPELINE] Starting pipeline with ${actionList.length} action(s)`);
  console.log(`   Actions: ${actionSummary}`);
  console.log(`   Original command: "${originalCommand}"`);
  console.log(`${'═'.repeat(60)}`);

  try {
    const result = await runPipeline(action, originalCommand);
    console.log(`\n✅ [PIPELINE] Completed with status: ${result.status}`);
    if (result.actionsProcessed) {
      console.log(`   Actions processed: ${result.actionsProcessed}`);
    }
    console.log(`${'═'.repeat(60)}\n`);
    res.json(result);
  } catch (err) {
    console.error(`\n❌ [PIPELINE] Failed: ${err.message}`);
    console.log(`${'═'.repeat(60)}\n`);
    res.status(500).json({
      status: 'ERROR',
      error: err.message,
      action: actionList
    });
  }
});

// ── Pipeline Status ─────────────────────────────────────────
app.get('/status', (req, res) => {
  res.json({
    service: 'agent',
    status: 'idle',
    lastRun: null,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🤖 Agent Service running on port ${PORT}`);
  console.log(`   Pipeline:  http://localhost:${PORT}/run-pipeline`);
  console.log(`   Health:    http://localhost:${PORT}/health\n`);
});
