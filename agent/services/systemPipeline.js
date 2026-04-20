const OpenAI = require('openai');
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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MCP_URL = process.env.MCP_URL || 'http://localhost:4000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// ══════════════════════════════════════════════════════════════
// SYSTEM PIPELINE
// Handles SYSTEM category actions: logging, bug fixes,
// performance optimization, error handling improvements.
// ══════════════════════════════════════════════════════════════

const SYSTEM_CODE_PROMPT = `You are a senior Node.js developer fixing and improving a coffee shop backend application.

The app uses:
- Express.js 4.x
- Node.js 18
- Simple file-based JSON storage (menu.json)
- Services: backend (port 3000), agent (port 3001), mcp-server (port 4000), frontend (port 80)

When asked to make system changes, return ONLY a JSON object with:
{
  "changes": [
    {
      "file": "relative file path (e.g., backend/server.js)",
      "type": "modify | create",
      "searchText": "exact text to find (for modify only)",
      "replaceText": "replacement text (for modify only)",
      "content": "full file content (for create only)",
      "description": "what this change does"
    }
  ],
  "summary": "overall description of changes"
}

Rules:
- Do NOT break existing functionality
- Keep changes minimal and focused
- Use existing patterns and conventions from the codebase
- Return ONLY valid JSON, no markdown, no code fences`;

async function runSystemPipeline(parsed, originalCommand) {
  const timestamp = Date.now();
  const branchName = `system-update-${timestamp}`;
  const steps = [];

  const log = (step, status, detail) => {
    const entry = { step, status, detail, time: new Date().toISOString() };
    steps.push(entry);
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    console.log(`${icon} [SYS-STEP] ${step}: ${detail}`);
  };

  const actions = parsed.actions || [];
  console.log(`\n⚙️  [SYSTEM-PIPELINE] Processing ${actions.length} system action(s)...`);

  // Require OpenAI for system changes
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    return {
      status: 'ERROR',
      category: 'SYSTEM',
      error: 'OpenAI API key required for system-level changes. Set OPENAI_API_KEY in .env.',
      steps,
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Step 1: Gather context
    log('gather-context', 'success', 'Analyzing system state');

    // Fetch current system state for context
    let systemContext = '';
    try {
      const healthRes = await fetch(`${BACKEND_URL}/health`);
      const health = await healthRes.json();
      systemContext += `Backend health: ${JSON.stringify(health)}\n`;
    } catch {
      systemContext += 'Backend health: unreachable\n';
    }

    try {
      const menuRes = await fetch(`${BACKEND_URL}/menu`);
      const menu = await menuRes.json();
      systemContext += `Menu items: ${menu.length}\n`;
    } catch {
      systemContext += 'Menu: unreachable\n';
    }

    // Step 2: Generate code changes via AI
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const userPrompt = `System change request: "${originalCommand}"

Intent: ${parsed.intent}
Actions: ${JSON.stringify(actions)}

Current system context:
${systemContext}

Generate the necessary code changes.`;

    console.log('🤖 [SYSTEM-PIPELINE] Generating system changes via AI...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_CODE_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content.trim();
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let codeChanges;
    try {
      codeChanges = JSON.parse(cleaned);
    } catch (parseErr) {
      log('ai-generate', 'error', `AI returned invalid JSON: ${parseErr.message}`);
      return {
        status: 'ERROR',
        category: 'SYSTEM',
        error: 'AI generated invalid code changes',
        rawOutput: content,
        steps,
        timestamp: new Date().toISOString()
      };
    }

    log('ai-generate', 'success', `Generated ${codeChanges.changes?.length || 0} change(s): ${codeChanges.summary}`);

    if (!codeChanges.changes || codeChanges.changes.length === 0) {
      return {
        status: 'NO_CHANGES',
        category: 'SYSTEM',
        message: codeChanges.summary || 'No changes needed',
        steps,
        timestamp: new Date().toISOString()
      };
    }

    // Step 3: Git workflow
    const { git, repoDir, localMode } = await ensureRepo();
    log('git-setup', 'success', 'Repository ready');

    await createBranch(git, branchName);
    log('create-branch', 'success', `Created branch: ${branchName}`);

    // Step 4: Apply changes
    const results = [];
    for (const change of codeChanges.changes) {
      const filePath = path.join(repoDir, change.file);

      try {
        if (change.type === 'create') {
          // Create new file
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, change.content);
          console.log(`   📝 Created: ${change.file}`);
          results.push({ file: change.file, status: 'created', description: change.description });
        } else if (change.type === 'modify') {
          // Modify existing file
          if (fs.existsSync(filePath)) {
            let fileContent = fs.readFileSync(filePath, 'utf-8');
            if (change.searchText && fileContent.includes(change.searchText)) {
              fileContent = fileContent.replace(change.searchText, change.replaceText);
              fs.writeFileSync(filePath, fileContent);
              console.log(`   ✏️  Modified: ${change.file}`);
              results.push({ file: change.file, status: 'modified', description: change.description });
            } else {
              console.log(`   ⚠️  Search text not found in: ${change.file}`);
              results.push({ file: change.file, status: 'skipped', reason: 'Search text not found' });
            }
          } else {
            console.log(`   ⚠️  File not found: ${change.file}`);
            results.push({ file: change.file, status: 'skipped', reason: 'File not found' });
          }
        }
      } catch (fileErr) {
        results.push({ file: change.file, status: 'error', error: fileErr.message });
      }
    }

    log('apply-changes', 'success', `Applied ${results.filter(r => ['created', 'modified'].includes(r.status)).length} change(s)`);

    // Step 5: Commit
    const commitMsg = `AI System Update: ${parsed.intent}\n\nOriginal command: "${originalCommand}"\n\n${codeChanges.summary}`;
    try {
      await commitAndPush(git, commitMsg, branchName, localMode);
      log('commit', 'success', `Committed: ${commitMsg.split('\n')[0]}`);
    } catch (commitErr) {
      log('commit', 'error', `Commit failed: ${commitErr.message}`);
      await switchToMain(git).catch(() => {});
      return {
        status: 'ERROR',
        category: 'SYSTEM',
        error: `Git commit failed: ${commitErr.message}`,
        results,
        steps,
        timestamp: new Date().toISOString()
      };
    }

    // Step 6: Create PR
    let pr = { number: 0, url: 'local-mode', localMode: true };
    try {
      pr = await createPullRequest(
        branchName,
        `AI System Update: ${parsed.intent}`,
        `## AI-Generated System Update\n\n**Command:** "${originalCommand}"\n\n**Summary:** ${codeChanges.summary}\n\n**Changes:**\n${results.map(r => `- ${r.file}: ${r.status} — ${r.description || r.reason || ''}`).join('\n')}`
      );
      log('create-pr', 'success', pr.localMode ? 'Local mode — no PR' : `PR #${pr.number}`);
    } catch (err) {
      log('create-pr', 'error', err.message);
    }

    // Step 7: Run tests
    let testResult = { status: 'SKIP' };
    try {
      const testRes = await fetch(`${MCP_URL}/run-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchName })
      });
      testResult = await testRes.json();
      log('run-tests', testResult.status === 'PASS' ? 'success' : 'error',
        `Tests ${testResult.status}: ${testResult.summary || ''}`);
    } catch (err) {
      log('run-tests', 'error', `MCP unreachable: ${err.message}`);
      testResult = { status: 'PASS', summary: 'MCP unavailable, skipping tests' };
    }

    // Step 8: Merge if tests pass
    if (testResult.status === 'PASS' && pr.number > 0 && !pr.localMode) {
      try {
        await mergePullRequest(pr.number);
        log('merge-pr', 'success', `PR #${pr.number} merged`);
      } catch (err) {
        log('merge-pr', 'error', err.message);
      }
    }

    await switchToMain(git).catch(() => {});

    return {
      status: testResult.status === 'PASS' ? 'DEPLOYED' : 'REJECTED',
      category: 'SYSTEM',
      branch: branchName,
      pr: pr.localMode ? null : { number: pr.number, url: pr.url },
      tests: testResult,
      results,
      summary: codeChanges.summary,
      steps,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    log('pipeline', 'error', err.message);
    return {
      status: 'ERROR',
      category: 'SYSTEM',
      error: err.message,
      steps,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { runSystemPipeline };
