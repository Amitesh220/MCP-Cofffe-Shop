const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const MCP_URL = process.env.MCP_URL || 'http://localhost:4000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://frontend';

// ══════════════════════════════════════════════════════════════
// ANALYZER
// Handles ANALYSIS category requests — no code changes, purely
// introspective. Gathers system state and uses AI to provide
// intelligent answers.
// ══════════════════════════════════════════════════════════════

const ANALYSIS_PROMPT = `You are an AI DevOps analyst for a coffee shop web application.

The system has these services:
- Frontend (React + Vite, served by Nginx on port 80)
- Backend (Express.js API on port 3000 — menu CRUD, orders, owner commands)
- Agent (Express.js on port 3001 — git pipeline orchestration)
- MCP Server (Express.js on port 4000 — automated testing)
- OpenWebUI (Express.js on port 3002 — chat interface)

You will be given current system state data (health checks, test results, etc).

Your job is to:
1. Analyze the data thoroughly
2. Identify issues, patterns, and insights
3. Provide a clear, actionable answer

Rules:
- Be specific — reference actual data points
- Prioritize by severity (critical > warning > info)
- Suggest concrete next steps
- Keep the answer concise but complete
- Use emoji indicators for severity: 🔴 critical, 🟡 warning, 🟢 ok`;

async function runAnalysis(parsed, originalCommand) {
  const steps = [];
  const log = (step, status, detail) => {
    steps.push({ step, status, detail, time: new Date().toISOString() });
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    console.log(`${icon} [ANALYSIS] ${step}: ${detail}`);
  };

  console.log(`\n🔍 [ANALYSIS] Analyzing: "${originalCommand}"`);

  // ── Step 1: Gather System State ─────────────────────────────
  const systemState = {
    services: {},
    tests: null,
    menu: null,
    errors: []
  };

  // Check backend health
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    systemState.services.backend = { status: 'online', data };
    log('check-backend', 'success', 'Backend online');
  } catch (err) {
    systemState.services.backend = { status: 'offline', error: err.message };
    systemState.errors.push(`Backend offline: ${err.message}`);
    log('check-backend', 'error', `Backend offline: ${err.message}`);
  }

  // Check frontend
  try {
    const res = await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(5000) });
    systemState.services.frontend = { status: res.status === 200 ? 'online' : 'degraded', statusCode: res.status };
    log('check-frontend', 'success', `Frontend ${res.status === 200 ? 'online' : 'degraded'}`);
  } catch (err) {
    systemState.services.frontend = { status: 'offline', error: err.message };
    systemState.errors.push(`Frontend offline: ${err.message}`);
    log('check-frontend', 'error', `Frontend offline: ${err.message}`);
  }

  // Check agent health
  try {
    const res = await fetch(`http://localhost:3001/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    systemState.services.agent = { status: 'online', data };
    log('check-agent', 'success', 'Agent online');
  } catch (err) {
    systemState.services.agent = { status: 'offline', error: err.message };
    log('check-agent', 'error', `Agent check failed: ${err.message}`);
  }

  // Check MCP health
  try {
    const res = await fetch(`${MCP_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    systemState.services.mcp = { status: 'online', data };
    log('check-mcp', 'success', 'MCP Server online');
  } catch (err) {
    systemState.services.mcp = { status: 'offline', error: err.message };
    log('check-mcp', 'error', `MCP check failed: ${err.message}`);
  }

  // Get menu data
  try {
    const res = await fetch(`${BACKEND_URL}/menu`, { signal: AbortSignal.timeout(5000) });
    systemState.menu = await res.json();
    log('fetch-menu', 'success', `Menu has ${systemState.menu.length} items`);
  } catch (err) {
    log('fetch-menu', 'error', `Could not fetch menu: ${err.message}`);
  }

  // Run MCP tests
  try {
    const res = await fetch(`${MCP_URL}/run-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuData: systemState.menu }),
      signal: AbortSignal.timeout(30000)
    });
    systemState.tests = await res.json();
    log('run-tests', systemState.tests.status === 'PASS' ? 'success' : 'error',
      `Tests ${systemState.tests.status}: ${systemState.tests.summary || ''}`);
  } catch (err) {
    log('run-tests', 'error', `Could not run tests: ${err.message}`);
  }

  log('gather-data', 'success', 'System state collected');

  // ── Step 2: Generate Analysis ─────────────────────────────
  let analysis;

  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your-openai-api-key-here') {
    try {
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

      const userPrompt = `User question: "${originalCommand}"

Current system state:
${JSON.stringify(systemState, null, 2)}

Provide your analysis.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      analysis = response.choices[0].message.content.trim();
      log('ai-analysis', 'success', 'AI analysis generated');
    } catch (err) {
      log('ai-analysis', 'error', `AI analysis failed: ${err.message}`);
      analysis = generateFallbackAnalysis(systemState, originalCommand);
    }
  } else {
    log('ai-analysis', 'success', 'Using rule-based analysis (no API key)');
    analysis = generateFallbackAnalysis(systemState, originalCommand);
  }

  return {
    status: 'COMPLETED',
    category: 'ANALYSIS',
    analysis,
    systemState: {
      services: Object.fromEntries(
        Object.entries(systemState.services).map(([k, v]) => [k, v.status])
      ),
      menuItems: systemState.menu?.length || 0,
      testStatus: systemState.tests?.status || 'NOT_RUN',
      testSummary: systemState.tests?.summary || null,
      failures: systemState.tests?.failures || [],
      errors: systemState.errors
    },
    steps,
    timestamp: new Date().toISOString()
  };
}

// ── Fallback Analysis (no OpenAI) ───────────────────────────
function generateFallbackAnalysis(systemState, question) {
  const lines = [];
  const q = question.toLowerCase();

  lines.push('## System Analysis Report\n');

  // Service status summary
  lines.push('### Service Status');
  for (const [name, info] of Object.entries(systemState.services)) {
    const icon = info.status === 'online' ? '🟢' : info.status === 'degraded' ? '🟡' : '🔴';
    lines.push(`${icon} **${name}**: ${info.status}${info.error ? ` — ${info.error}` : ''}`);
  }

  // Test results
  if (systemState.tests) {
    lines.push('\n### Test Results');
    lines.push(`Status: **${systemState.tests.status}** — ${systemState.tests.summary || ''}`);
    if (systemState.tests.failures && systemState.tests.failures.length > 0) {
      lines.push('\nFailures:');
      for (const failure of systemState.tests.failures) {
        lines.push(`🔴 ${failure}`);
      }
    }
  }

  // Menu info
  if (systemState.menu) {
    lines.push(`\n### Menu: ${systemState.menu.length} items`);
    const unavailable = systemState.menu.filter(i => !i.available);
    if (unavailable.length > 0) {
      lines.push(`🟡 ${unavailable.length} item(s) currently unavailable`);
    }
  }

  // Specific question handling
  if (q.includes('bug') || q.includes('issue') || q.includes('problem')) {
    lines.push('\n### Identified Issues');
    if (systemState.errors.length > 0) {
      for (const err of systemState.errors) {
        lines.push(`🔴 ${err}`);
      }
    }
    if (systemState.tests?.failures?.length > 0) {
      for (const f of systemState.tests.failures) {
        lines.push(`🔴 Test failure: ${f}`);
      }
    }
    if (systemState.errors.length === 0 && (!systemState.tests?.failures || systemState.tests.failures.length === 0)) {
      lines.push('🟢 No critical issues detected');
    }
  }

  return lines.join('\n');
}

module.exports = { runAnalysis };
