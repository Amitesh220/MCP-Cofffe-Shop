const express = require('express');
const cors = require('cors');
const { validateMenu } = require('./tests/menuValidator');
const { runApiTests } = require('./tests/apiTests');
const { runFrontendTests } = require('./tests/frontendTests');
const { runBuildTests, runComponentTests } = require('./tests/buildTests');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ── Health ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mcp-server', timestamp: new Date().toISOString() });
});

// ── Run All Tests ───────────────────────────────────────────
app.post('/run-tests', async (req, res) => {
  const { menuData, branch } = req.body;

  console.log(`\n${'═'.repeat(60)}`);
  console.log('🧪 [MCP] Running test suite...');
  if (branch) console.log(`   Branch: ${branch}`);
  console.log(`${'═'.repeat(60)}`);

  const results = [];
  const failures = [];

  // Test 1: Menu Validation
  console.log('\n── Menu Validation ────────────────────────────────');
  const menuResult = await validateMenu(menuData);
  results.push(...menuResult.tests);
  if (menuResult.failures.length > 0) failures.push(...menuResult.failures);

  // Test 2: API Tests
  console.log('\n── API Tests ──────────────────────────────────────');
  const apiResult = await runApiTests();
  results.push(...apiResult.tests);
  if (apiResult.failures.length > 0) failures.push(...apiResult.failures);

  // Test 3: Frontend Tests
  console.log('\n── Frontend Tests ─────────────────────────────────');
  const frontendResult = await runFrontendTests();
  results.push(...frontendResult.tests);
  if (frontendResult.failures.length > 0) failures.push(...frontendResult.failures);

  // Test 4: Build Tests (NEW)
  console.log('\n── Build Tests ────────────────────────────────────');
  const buildResult = await runBuildTests();
  results.push(...buildResult.tests);
  if (buildResult.failures.length > 0) failures.push(...buildResult.failures);

  // Test 5: Component Tests (NEW)
  console.log('\n── Component Tests ────────────────────────────────');
  const componentResult = await runComponentTests();
  results.push(...componentResult.tests);
  if (componentResult.failures.length > 0) failures.push(...componentResult.failures);

  // Aggregate
  const status = failures.length === 0 ? 'PASS' : 'FAIL';
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧪 [MCP] Results: ${status} (${passed} passed, ${failed} failed)`);
  if (failures.length > 0) {
    console.log('   Failures:');
    failures.forEach(f => console.log(`     ❌ ${f}`));
  }
  console.log(`${'═'.repeat(60)}\n`);

  res.json({
    status,
    summary: `${passed}/${results.length} tests passed`,
    results,
    failures,
    branch,
    timestamp: new Date().toISOString()
  });
});

// ── Individual Test Endpoints ───────────────────────────────
app.post('/run-tests/menu', async (req, res) => {
  const result = await validateMenu(req.body.menuData);
  res.json(result);
});

app.post('/run-tests/api', async (req, res) => {
  const result = await runApiTests();
  res.json(result);
});

app.post('/run-tests/frontend', async (req, res) => {
  const result = await runFrontendTests();
  res.json(result);
});

// NEW: Build validation endpoint
app.post('/run-tests/build', async (req, res) => {
  console.log('\n🔨 [MCP] Running build tests...');
  const result = await runBuildTests();
  res.json(result);
});

// NEW: Component validation endpoint
app.post('/run-tests/components', async (req, res) => {
  console.log('\n🧩 [MCP] Running component tests...');
  const result = await runComponentTests();
  res.json(result);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧪 MCP Testing Server running on port ${PORT}`);
  console.log(`   Run Tests:       http://localhost:${PORT}/run-tests`);
  console.log(`   Menu Tests:      http://localhost:${PORT}/run-tests/menu`);
  console.log(`   API Tests:       http://localhost:${PORT}/run-tests/api`);
  console.log(`   Frontend Tests:  http://localhost:${PORT}/run-tests/frontend`);
  console.log(`   Build Tests:     http://localhost:${PORT}/run-tests/build`);
  console.log(`   Component Tests: http://localhost:${PORT}/run-tests/components`);
  console.log(`   Health:          http://localhost:${PORT}/health\n`);
});
