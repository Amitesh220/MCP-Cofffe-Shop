const fs = require('fs');
const path = require('path');
const {
  ensureRepo,
  createBranch,
  commitAndPush,
  createPullRequest,
  mergePullRequest,
  switchToMain
} = require('./gitOps');

const MCP_URL = process.env.MCP_URL || 'http://localhost:4000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// ── Process Single Action on Menu (in-memory) ───────────────
function processSingleAction(menu, action) {
  switch (action.action) {
    case 'ADD_ITEM': {
      const exists = menu.find(i => i.name.toLowerCase() === action.name.toLowerCase());
      if (exists) {
        console.log(`⚠️  [PIPELINE] Item "${action.name}" already exists, updating price`);
        exists.price = action.price;
        exists.available = action.available !== undefined ? action.available : true;
      } else {
        menu.push({
          name: action.name,
          price: action.price,
          available: action.available !== undefined ? action.available : true
        });
        console.log(`➕ [PIPELINE] Added "${action.name}" at ₹${action.price}`);
      }
      break;
    }

    case 'REMOVE_ITEM': {
      const idx = menu.findIndex(i => i.name.toLowerCase() === action.name.toLowerCase());
      if (idx >= 0) {
        menu.splice(idx, 1);
        console.log(`➖ [PIPELINE] Removed "${action.name}"`);
      } else {
        console.log(`⚠️  [PIPELINE] Item "${action.name}" not found`);
      }
      break;
    }

    case 'UPDATE_PRICE': {
      const item = menu.find(i => i.name.toLowerCase() === action.name.toLowerCase());
      if (item) {
        const oldPrice = item.price;
        item.price = action.price;
        console.log(`💰 [PIPELINE] Updated "${action.name}" price: ₹${oldPrice} → ₹${action.price}`);
      } else {
        console.log(`⚠️  [PIPELINE] Item "${action.name}" not found for price update`);
      }
      break;
    }

    case 'TOGGLE_AVAILABILITY': {
      const item = menu.find(i => i.name.toLowerCase() === action.name.toLowerCase());
      if (item) {
        item.available = action.available;
        console.log(`🔄 [PIPELINE] "${action.name}" is now ${action.available ? 'available' : 'unavailable'}`);
      } else {
        console.log(`⚠️  [PIPELINE] Item "${action.name}" not found`);
      }
      break;
    }

    default:
      console.log(`❌ [PIPELINE] Unknown action: ${action.action}`);
      throw new Error(`Unknown action: ${action.action}`);
  }

  return menu;
}

// ── Apply Actions to Menu File ──────────────────────────────
// Supports both single action and array of actions
function applyActions(menuPath, actions) {
  let menu = [];
  try {
    const raw = fs.readFileSync(menuPath, 'utf-8');
    menu = JSON.parse(raw);
  } catch {
    console.log('⚠️  [PIPELINE] Could not read menu, starting fresh');
    menu = [];
  }

  // Normalize: support both single action and array of actions
  const actionList = Array.isArray(actions) ? actions : [actions];

  console.log(`📦 [PIPELINE] Processing ${actionList.length} action(s)...`);

  for (let i = 0; i < actionList.length; i++) {
    const act = actionList[i];
    console.log(`\n   ── Action ${i + 1}/${actionList.length}: ${act.action} — ${act.name || 'N/A'} ──`);
    menu = processSingleAction(menu, act);
  }

  fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));
  return menu;
}

// ── Build Commit Message for Actions ────────────────────────
function buildCommitMessage(actions, originalCommand) {
  const actionList = Array.isArray(actions) ? actions : [actions];

  if (actionList.length === 1) {
    const act = actionList[0];
    return `AI Update: ${act.action} — ${act.name || 'menu change'}\n\nOriginal command: "${originalCommand}"`;
  }

  // Multiple actions: summarize all
  const summary = actionList.map(a => `${a.action}: ${a.name || 'N/A'}`).join(', ');
  const details = actionList.map((a, i) => `  ${i + 1}. ${a.action} — ${a.name || 'N/A'}`).join('\n');
  return `AI Update: ${actionList.length} changes — ${summary}\n\nOriginal command: "${originalCommand}"\n\nActions:\n${details}`;
}

// ── Build PR Title and Body ─────────────────────────────────
function buildPrInfo(actions, originalCommand) {
  const actionList = Array.isArray(actions) ? actions : [actions];

  if (actionList.length === 1) {
    const act = actionList[0];
    return {
      title: `AI Update: ${act.action} — ${act.name}`,
      body: `## AI-Generated Update\n\n**Original Command:** "${originalCommand}"\n\n**Action:** \`${JSON.stringify(act)}\`\n\n**Changes:** Updated menu.json`
    };
  }

  const actionDetails = actionList.map((a, i) => `${i + 1}. \`${a.action}\` — ${a.name || 'N/A'}`).join('\n');
  return {
    title: `AI Update: ${actionList.length} menu changes`,
    body: `## AI-Generated Update\n\n**Original Command:** "${originalCommand}"\n\n**Actions (${actionList.length}):**\n${actionDetails}\n\n**Changes:** Updated menu.json with ${actionList.length} modifications`
  };
}

// ── Main Pipeline ───────────────────────────────────────────
async function runPipeline(action, originalCommand) {
  const timestamp = Date.now();
  const branchName = `ai-update-${timestamp}`;
  const steps = [];

  const log = (step, status, detail) => {
    const entry = { step, status, detail, time: new Date().toISOString() };
    steps.push(entry);
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    console.log(`${icon} [STEP] ${step}: ${detail}`);
  };

  // Normalize action input (single or array)
  const actionList = Array.isArray(action) ? action : [action];
  const actionSummary = actionList.map(a => `${a.action}:${a.name || '?'}`).join(', ');

  console.log(`\n📦 [PIPELINE] Received ${actionList.length} action(s): ${actionSummary}`);

  try {
    // Step 1: Ensure repo is ready
    log('git-setup', 'success', 'Initializing repository');
    const { git, repoDir, localMode } = await ensureRepo();

    // Step 2: Create branch
    await createBranch(git, branchName);
    log('create-branch', 'success', `Created branch: ${branchName}`);

    // Step 3: Apply changes
    // Copy current backend menu.json to workspace if it doesn't exist
    const menuPath = path.join(repoDir, 'menu.json');
    if (!fs.existsSync(menuPath)) {
      // Fetch current menu from backend
      try {
        const res = await fetch(`${BACKEND_URL}/menu`);
        const currentMenu = await res.json();
        fs.writeFileSync(menuPath, JSON.stringify(currentMenu, null, 2));
        console.log('📋 [PIPELINE] Fetched current menu from backend');
      } catch {
        // Use default menu
        fs.writeFileSync(menuPath, JSON.stringify([
          { "name": "Coffee", "price": 100, "available": true },
          { "name": "Espresso", "price": 120, "available": true },
          { "name": "Americano", "price": 110, "available": true }
        ], null, 2));
      }
    }

    // Apply ALL actions before committing (single or array)
    const updatedMenu = applyActions(menuPath, actionList);
    log('apply-changes', 'success', `Applied ${actionList.length} action(s) — menu now has ${updatedMenu.length} items`);

    // Step 4: Single commit for all changes
    const commitMsg = buildCommitMessage(actionList, originalCommand);
    try {
      await commitAndPush(git, commitMsg, branchName, localMode);
      log('commit', 'success', `Committed: ${commitMsg.split('\n')[0]}`);
    } catch (commitErr) {
      log('commit', 'error', `Commit failed: ${commitErr.message}`);
      // Return structured error instead of crashing
      return {
        status: 'ERROR',
        error: `Git commit failed: ${commitErr.message}`,
        action: actionList,
        steps,
        timestamp: new Date().toISOString()
      };
    }

    // Step 5: Create PR
    let pr = { number: 0, url: 'local-mode', localMode: true };
    try {
      const prInfo = buildPrInfo(actionList, originalCommand);
      pr = await createPullRequest(branchName, prInfo.title, prInfo.body);
      log('create-pr', 'success', pr.localMode ? 'Local mode — no PR' : `PR #${pr.number}: ${pr.url}`);
    } catch (err) {
      log('create-pr', 'error', err.message);
    }

    // Step 6: Run tests via MCP
    let testResult = { status: 'SKIP' };
    try {
      console.log('\n🧪 [PIPELINE] Running tests via MCP...');
      const testRes = await fetch(`${MCP_URL}/run-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchName, menuData: updatedMenu })
      });
      testResult = await testRes.json();
      log('run-tests', testResult.status === 'PASS' ? 'success' : 'error',
        `Tests ${testResult.status}: ${testResult.summary || ''}`);
    } catch (err) {
      log('run-tests', 'error', `MCP unreachable: ${err.message}`);
      // If we can't reach MCP, validate locally
      testResult = localValidation(updatedMenu);
      log('local-validation', testResult.status === 'PASS' ? 'success' : 'error',
        `Local validation ${testResult.status}`);
    }

    // Step 7: Deploy or Discard
    if (testResult.status === 'PASS') {
      // Deploy: Update the backend's menu.json via API
      try {
        const updateRes = await fetch(`${BACKEND_URL}/menu/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menu: updatedMenu })
        });

        if (updateRes.ok) {
          log('deploy', 'success', 'Updated menu deployed successfully via API');
        } else {
          const errData = await updateRes.json().catch(() => ({}));
          log('deploy', 'error', `Backend rejected update: ${errData.error || updateRes.status}`);
        }

        // Merge PR if exists
        if (pr.number > 0 && !pr.localMode) {
          await mergePullRequest(pr.number);
          log('merge-pr', 'success', `PR #${pr.number} merged`);
        }
      } catch (err) {
        log('deploy', 'error', `Deploy failed: ${err.message}`);
      }
    } else {
      log('deploy', 'error', `Tests failed — changes discarded`);
      // Don't merge, don't deploy
    }

    // Switch back to main
    await switchToMain(git).catch(() => {});

    return {
      status: testResult.status === 'PASS' ? 'DEPLOYED' : 'REJECTED',
      branch: branchName,
      pr: pr.localMode ? null : { number: pr.number, url: pr.url },
      tests: testResult,
      action: actionList,
      actionsProcessed: actionList.length,
      menu: updatedMenu,
      steps,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    log('pipeline', 'error', err.message);
    return {
      status: 'ERROR',
      error: err.message,
      steps,
      timestamp: new Date().toISOString()
    };
  }
}

// ── Local Validation (fallback when MCP is unreachable) ─────
function localValidation(menu) {
  const errors = [];

  // Check valid JSON array
  if (!Array.isArray(menu)) {
    errors.push('Menu is not an array');
  }

  // Check duplicates
  const names = menu.map(i => i.name.toLowerCase());
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) {
    errors.push(`Duplicate items: ${dupes.join(', ')}`);
  }

  // Check required fields
  menu.forEach((item, i) => {
    if (!item.name) errors.push(`Item ${i}: missing name`);
    if (typeof item.price !== 'number' || item.price <= 0) errors.push(`Item ${i}: invalid price`);
    if (typeof item.available !== 'boolean') errors.push(`Item ${i}: invalid availability`);
  });

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    summary: errors.length === 0 ? 'All local checks passed' : errors.join('; '),
    results: errors.length === 0 ? ['Valid JSON', 'No duplicates', 'All fields valid'] : errors
  };
}

module.exports = { runPipeline };
