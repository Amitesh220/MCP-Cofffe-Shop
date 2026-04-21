const express = require('express');
const { parseOwnerCommand } = require('../services/aiParser');
const router = express.Router();

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3001';
const CATEGORY_ENDPOINTS = {
  MENU: "http://agent:3001/run-pipeline",
  UI: "http://agent:3001/run-ui-pipeline",
  API: "http://agent:3001/run-api-pipeline",
  DEFAULT: "http://agent:3001/run-pipeline"
};


// ── Duplicate Detection & Pipeline Lock ──────────────────────
let isRunning = false;

// POST /owner-command — accept natural language input from owner
router.post('/', async (req, res) => {
  if (isRunning) {
    return res.json({ status: "ignored", message: "Pipeline already running" });
  }

  isRunning = true;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX #5: PIPELINE LOCK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🗣️  [OWNER COMMAND] "${command}"`);
  console.log(`🔒 [LOCK] Pipeline started`);
  console.log(`${'═'.repeat(60)}`);

  try {
    // Step 1: Parse with AI (Universal Parser)
    console.log('\n🤖 [AI] Parsing command...');
    const parsed = await parseOwnerCommand(command);
    console.log(`🤖 [AI] Parsed result:`);
    console.log(`   Category:   ${parsed.category}`);
    console.log(`   Intent:     ${parsed.intent}`);
    console.log(`   Confidence: ${parsed.confidence}`);
    console.log(`   Actions:    ${parsed.actions.length}`);

    // Step 2: Handle UNKNOWN category
    if (parsed.category === 'UNKNOWN') {
      console.log('❓ [AI] Could not classify command');
            return res.json({
        status: 'CLARIFICATION_NEEDED',
        command,
        parsedAction: parsed,
        message: parsed.clarification || 'Could not understand the command. Please try rephrasing.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 3: Handle errors from parser
    if (parsed.error) {
      console.log('❌ [AI] Parser error:', parsed.error);
            return res.status(400).json({
        status: 'PARSE_ERROR',
        command,
        error: parsed.error
      });
    }

    // Step 4: Route to appropriate agent endpoint based on category
    const endpoint =
      CATEGORY_ENDPOINTS[parsed.category] ||
      CATEGORY_ENDPOINTS.DEFAULT;

    console.log(`\n🚀 [PIPELINE] Routing to ${parsed.category} handler: ${endpoint}`);

    // Build the payload based on category
    let agentPayload;
    if (parsed.category === 'DATA') {
      // DATA: Use legacyActions for backward compatibility with existing pipeline
      const action = parsed.legacyActions.length > 0
        ? (parsed.legacyActions.length === 1 ? parsed.legacyActions[0] : parsed.legacyActions)
        : parsed.actions;
      agentPayload = { action, originalCommand: command, parsed };
    } else {
      // UI, SYSTEM, ANALYSIS: Send full parsed result
      agentPayload = { parsed, originalCommand: command };
    }

    // Step 5: Trigger agent pipeline
    console.log(`🚀 [PIPELINE] Triggering agent service at ${endpoint}...`);
    const agentResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentPayload)
    });

    const agentResult = await agentResponse.json();
    console.log(`🚀 [PIPELINE] Agent result status: ${agentResult.status}`);

    res.json({
      status: "success",
      category: parsed.category,
      message: "Pipeline executed"
    });
  } catch (error) {
    console.error(`\n❌ [OWNER COMMAND] Pipeline failed: ${error.message}`);
    
    res.status(500).json({
      status: "error",
      message: error.message
    });
  } finally {
    isRunning = false;
  }
});

module.exports = router;
