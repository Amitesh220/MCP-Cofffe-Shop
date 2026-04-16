const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Proxy owner command to backend ──────────────────────────
app.post('/api/command', async (req, res) => {
  const { command } = req.body;

  console.log(`\n💬 [CHAT] Owner command: "${command}"`);

  try {
    const response = await fetch(`${BACKEND_URL}/owner-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });

    const data = await response.json();
    console.log(`💬 [CHAT] Result: ${data.status}`);
    res.json(data);
  } catch (err) {
    console.error(`💬 [CHAT] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ── Get current menu ────────────────────────────────────────
app.get('/api/menu', async (req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/menu`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
