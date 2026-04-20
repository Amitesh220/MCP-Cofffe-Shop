const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Retry Utility ─────────────────────────────────────────────
async function fetchWithRetry(url, options = {}, retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (err) {}

    // Exponential backoff
    await new Promise(r => setTimeout(r, delay * (i + 1)));
  }

  throw new Error("Backend unavailable after retries");
}

// ── Proxy owner command to backend ──────────────────────────
app.post('/api/command', async (req, res) => {
  const { command } = req.body;

  console.log(`\n💬 [CHAT] Owner command: "${command}"`);

  try {
    // Check health before sending command
    await fetchWithRetry(`${BACKEND_URL}/health`, {}, 10, 2000);

    const response = await fetchWithRetry(`${BACKEND_URL}/owner-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    }, 1, 1000); // Command itself shouldn't retry multiple times if it reaches the backend

    const data = await response.json();
    console.log(`💬 [CHAT] Result: ${data.status}`);
    res.json(data);
  } catch (err) {
    console.error(`💬 [CHAT] Error: ${err.message}`);
    res.status(503).json({ error: 'Backend restarting or deployment in progress. Please wait a moment and try again.' });
  }
});

// ── Get current menu ────────────────────────────────────────
app.get('/api/menu', async (req, res) => {
  try {
    const response = await fetchWithRetry(`${BACKEND_URL}/menu`, {}, 5, 2000);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: 'Backend unavailable' });
  }
});

// ── Health ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'openwebui', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n💬 OpenWebUI Chat running on port ${PORT}`);
  console.log(`   Chat Interface: http://localhost:${PORT}`);
  console.log(`   Backend proxy:  ${BACKEND_URL}\n`);
});
