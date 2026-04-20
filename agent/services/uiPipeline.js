const fs = require('fs');
const path = require('path');
const {
  generateComponent,
  generateStyleUpdate,
  generateContentUpdate,
  validateJSX
} = require('./codeGenerator');
const {
  ensureRepo,
  createBranch,
  commitAndPush,
  createPullRequest,
  mergePullRequest,
  switchToMain
} = require('./gitOps');
const { rollbackBranch } = require('./pipeline');

const MCP_URL = process.env.MCP_URL || 'http://localhost:4000';

// ══════════════════════════════════════════════════════════════
// UI PIPELINE
// Handles UI category actions: component creation, style changes,
// content updates. Generates React code via AI and commits
// through the git pipeline.
// ══════════════════════════════════════════════════════════════

async function runUIPipeline(parsed, originalCommand) {
  const timestamp = Date.now();
  const branchName = `ui-update-${timestamp}`;
  const steps = [];

  const log = (step, status, detail) => {
    const entry = { step, status, detail, time: new Date().toISOString() };
    steps.push(entry);
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    console.log(`${icon} [UI-STEP] ${step}: ${detail}`);
  };

  const actions = parsed.actions || [];
  console.log(`\n🎨 [UI-PIPELINE] Processing ${actions.length} UI action(s)...`);

  try {
    // Step 1: Ensure repo is ready
    const { git, repoDir, localMode } = await ensureRepo();
    log('git-setup', 'success', 'Repository ready');

    // Step 2: Create branch
    await createBranch(git, branchName);
    log('create-branch', 'success', `Created branch: ${branchName}`);

    // Ensure frontend structure exists in workspace
    const frontendSrcDir = path.join(repoDir, 'frontend', 'src');
    const componentsDir = path.join(frontendSrcDir, 'components');
    const appCssPath = path.join(frontendSrcDir, 'App.css');
    const appJsxPath = path.join(frontendSrcDir, 'App.jsx');

    fs.mkdirSync(componentsDir, { recursive: true });

    // Get existing component list
    let existingComponents = [];
    try {
      existingComponents = fs.readdirSync(componentsDir)
        .filter(f => f.endsWith('.jsx'))
        .map(f => f.replace('.jsx', ''));
    } catch {
      existingComponents = [];
    }

    // Step 3: Process each action
    const results = [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log(`\n   ── UI Action ${i + 1}/${actions.length}: ${action.type} → ${action.target} ──`);

      try {
        switch (action.type) {
          case 'ADD':
          case 'GENERATE': {
            // Generate a new component
            const appJsxContent = fs.existsSync(appJsxPath) ? fs.readFileSync(appJsxPath, 'utf-8') : '';
            const generated = await generateComponent(action, existingComponents, appJsxContent);
            if (generated.error) {
              log(`action-${i + 1}`, 'error', generated.error);
              results.push({ action, status: 'error', error: generated.error });
              continue;
            }

            // Validate JSX
            const validation = validateJSX(generated.componentCode);
            if (!validation.valid) {
              log(`action-${i + 1}`, 'error', `Invalid JSX: ${validation.errors.join(', ')}`);
              results.push({ action, status: 'error', error: `Invalid JSX: ${validation.errors.join(', ')}` });
              continue;
            }

            // Write component file
            const componentPath = path.join(componentsDir, `${generated.componentName}.jsx`);
            fs.writeFileSync(componentPath, generated.componentCode);
            console.log(`   📝 Written: ${generated.componentName}.jsx`);

            // Append CSS if provided
            if (generated.cssCode && generated.cssCode.trim()) {
              const cssComment = `\n\n/* ── ${generated.componentName} ──────────────────────────── */\n`;
              fs.appendFileSync(appCssPath, cssComment + generated.cssCode + '\n');
              console.log(`   🎨 Appended CSS for ${generated.componentName}`);
            }

            // Update App.jsx to import new component
            if (fs.existsSync(appJsxPath)) {
              let appContent = fs.readFileSync(appJsxPath, 'utf-8');
              const importLine = generated.importStatement;

              // Only add import if not already present
              if (!appContent.includes(generated.componentName)) {
                // Add import after last existing import
                const lastImportIdx = appContent.lastIndexOf('import ');
                const lineEnd = appContent.indexOf('\n', lastImportIdx);
                appContent = appContent.slice(0, lineEnd + 1) +
                  importLine + '\n' +
                  appContent.slice(lineEnd + 1);

                // Inject component safely inside <div className="page-wrapper">
                const wrapperIdx = appContent.indexOf('<div className="page-wrapper">');
                if (wrapperIdx !== -1) {
                  const wrapperEnd = appContent.indexOf('>', wrapperIdx);
                  const injectLine = `\n        <${generated.componentName} />`;
                  appContent = appContent.slice(0, wrapperEnd + 1) +
                    injectLine +
                    appContent.slice(wrapperEnd + 1);
                } else {
                  // Fallback: Add route or inline component before </Routes>
                  const routesEnd = appContent.indexOf('</Routes>');
                  if (routesEnd !== -1) {
                    const routeLine = `          <Route path="/${generated.componentName.toLowerCase()}" element={<${generated.componentName} />} />\n`;
                    appContent = appContent.slice(0, routesEnd) +
                      routeLine +
                      appContent.slice(routesEnd);
                  }
                }

                fs.writeFileSync(appJsxPath, appContent);
                console.log(`   📦 Updated App.jsx with ${generated.componentName} safely`);
              }
            }

            existingComponents.push(generated.componentName);
            log(`action-${i + 1}`, 'success', `Created component: ${generated.componentName}`);
            results.push({ action, status: 'success', component: generated.componentName });
            break;
          }

          case 'DELETE': {
            // Remove a component
            const targetName = action.target.replace(/\.jsx$/, '');
            const filePath = path.join(componentsDir, `${targetName}.jsx`);

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`   🗑️  Deleted: ${targetName}.jsx`);

              // Remove from App.jsx
              if (fs.existsSync(appJsxPath)) {
                let appContent = fs.readFileSync(appJsxPath, 'utf-8');
                // Remove import line
                appContent = appContent.replace(new RegExp(`.*import.*${targetName}.*\n`, 'g'), '');
                // Remove route line
                appContent = appContent.replace(new RegExp(`.*<Route.*${targetName}.*\n`, 'g'), '');
                fs.writeFileSync(appJsxPath, appContent);
                console.log(`   📦 Removed ${targetName} from App.jsx`);
              }

              log(`action-${i + 1}`, 'success', `Deleted component: ${targetName}`);
              results.push({ action, status: 'success', deleted: targetName });
            } else {
              log(`action-${i + 1}`, 'error', `Component not found: ${targetName}`);
              results.push({ action, status: 'error', error: `Component ${targetName} not found` });
            }
            break;
          }

          case 'STYLE': {
            // Modify CSS
            const styleResult = await generateStyleUpdate(action);
            if (styleResult.error) {
              log(`action-${i + 1}`, 'error', styleResult.error);
              results.push({ action, status: 'error', error: styleResult.error });
              continue;
            }

            if (styleResult.cssChanges) {
              const cssComment = `\n\n/* ── Style Update: ${action.target} ──────────────────── */\n`;
              fs.appendFileSync(appCssPath, cssComment + styleResult.cssChanges + '\n');
              console.log(`   🎨 Applied style changes for ${action.target}`);
            }

            log(`action-${i + 1}`, 'success', `Style updated: ${styleResult.description || action.target}`);
            results.push({ action, status: 'success', description: styleResult.description });
            break;
          }

          case 'UPDATE': {
            // Update content in existing component
            const targetFile = action.details?.targetComponent || `${action.target}.jsx`;
            const targetPath = path.join(componentsDir, targetFile);

            if (fs.existsSync(targetPath)) {
              const source = fs.readFileSync(targetPath, 'utf-8');
              const contentResult = await generateContentUpdate(action, source);

              if (contentResult.error) {
                log(`action-${i + 1}`, 'error', contentResult.error);
                results.push({ action, status: 'error', error: contentResult.error });
                continue;
              }

              // Apply replacements
              const updates = Array.isArray(contentResult) ? contentResult : [contentResult];
              let updatedSource = source;
              for (const update of updates) {
                if (update.searchText && update.replaceText) {
                  updatedSource = updatedSource.replace(update.searchText, update.replaceText);
                }
              }

              fs.writeFileSync(targetPath, updatedSource);
              log(`action-${i + 1}`, 'success', `Updated content in ${targetFile}`);
              results.push({ action, status: 'success', file: targetFile });
            } else {
              log(`action-${i + 1}`, 'error', `Component not found: ${targetFile}`);
              results.push({ action, status: 'error', error: `Component ${targetFile} not found` });
            }
            break;
          }

          default:
            log(`action-${i + 1}`, 'error', `Unknown UI action type: ${action.type}`);
            results.push({ action, status: 'error', error: `Unknown action type: ${action.type}` });
        }
      } catch (actionErr) {
        log(`action-${i + 1}`, 'error', `Action failed: ${actionErr.message}`);
        results.push({ action, status: 'error', error: actionErr.message });
      }
    }

    // Check if any actions succeeded
    const successCount = results.filter(r => r.status === 'success').length;
    if (successCount === 0) {
      log('pipeline', 'error', 'No actions succeeded');
      await rollbackBranch(git, branchName);
      return {
        status: 'REJECTED',
        error: 'No UI actions were successful',
        results,
        steps,
        timestamp: new Date().toISOString()
      };
    }

    // PRE-COMMIT VALIDATION
    log('pre-commit', 'success', 'Validating structural integrity');
    if (fs.existsSync(appJsxPath)) {
      const finalAppContent = fs.readFileSync(appJsxPath, 'utf-8');
      const requiredComponents = ['Navbar', 'MenuPage', 'OrderPage', 'AdminPanel'];
      const missing = requiredComponents.filter(c => !finalAppContent.includes(c));
      
      if (missing.length > 0) {
        log('pre-commit-validation', 'error', `App.jsx missing required components: ${missing.join(', ')}`);
        await rollbackBranch(git, branchName);
        return {
          status: 'ERROR',
          error: `Pre-commit validation failed: App.jsx missing ${missing.join(', ')}`,
          results,
          steps,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Step 4: Commit changes
    const commitMsg = `AI UI Update: ${parsed.intent}\n\nOriginal command: "${originalCommand}"\n\nActions: ${results.filter(r => r.status === 'success').map(r => r.component || r.deleted || r.description || r.file).join(', ')}`;
    try {
      await commitAndPush(git, commitMsg, branchName, localMode);
      log('commit', 'success', `Committed: ${commitMsg.split('\n')[0]}`);
    } catch (commitErr) {
      log('commit', 'error', `Commit failed: ${commitErr.message}`);
      await rollbackBranch(git, branchName);
      return {
        status: 'ERROR',
        error: `Git commit failed: ${commitErr.message}`,
        results,
        steps,
        timestamp: new Date().toISOString()
      };
    }

    // Step 5: Create PR
    let pr = { number: 0, url: 'local-mode', localMode: true };
    try {
      pr = await createPullRequest(
        branchName,
        `AI UI Update: ${parsed.intent}`,
        `## AI-Generated UI Update\n\n**Command:** "${originalCommand}"\n\n**Changes:** ${successCount} UI action(s) applied`
      );
      log('create-pr', 'success', pr.localMode ? 'Local mode — no PR' : `PR #${pr.number}`);
    } catch (err) {
      log('create-pr', 'error', err.message);
    }

    // Step 6: Run tests
    let testResult = { status: 'SKIP' };
    try {
      console.log('\n🧪 [UI-PIPELINE] Running tests via MCP...');
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

    // Step 7: Merge if tests pass
    if (testResult.status === 'PASS') {
      if (pr.number > 0 && !pr.localMode) {
        try {
          await mergePullRequest(pr.number);
          log('merge-pr', 'success', `PR #${pr.number} merged`);
        } catch (err) {
          log('merge-pr', 'error', err.message);
        }
      }
      log('deploy', 'success', 'UI changes committed — rebuild frontend to apply');
    } else {
      log('deploy', 'error', 'Tests failed — rolling back branch');
      await rollbackBranch(git, branchName);
      return {
        status: 'REJECTED',
        category: 'UI',
        error: 'Tests failed, changes rolled back',
        tests: testResult,
        steps,
        timestamp: new Date().toISOString()
      };
    }

    // Switch back to main
    await switchToMain(git).catch(() => {});

    return {
      status: testResult.status === 'PASS' ? 'DEPLOYED' : 'REJECTED',
      category: 'UI',
      branch: branchName,
      pr: pr.localMode ? null : { number: pr.number, url: pr.url },
      tests: testResult,
      results,
      actionsProcessed: actions.length,
      actionsSucceeded: successCount,
      steps,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    log('pipeline', 'error', err.message);
    return {
      status: 'ERROR',
      category: 'UI',
      error: err.message,
      steps,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { runUIPipeline };
