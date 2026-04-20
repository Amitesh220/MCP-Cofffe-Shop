const express = require('express');
const { parseOwnerCommand } = require('../services/aiParser');
const router = express.Router();

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3001';

// ── Category → Agent Endpoint Mapping ───────────────────────
const CATEGORY_ENDPOINTS = {
  DATA: '/run-pipeline',
  UI: '/run-ui-pipeline',
  SYSTEM: '/run-system-pipeline',
  ANALYSIS: '/analyze'
};

// POST /owner-command — accept natural language input from owner
router.post('/', async (req, res) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string is required' });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🗣️  [OWNER COMMAND] "${command}"`);
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
    const endpoint = CATEGORY_ENDPOINTS[parsed.category];
    if (!endpoint) {
      console.log(`❌ [AI] Unknown category: ${parsed.category}`);
      return res.status(400).json({
        status: 'INVALID_CATEGORY',
        command,
        category: parsed.category,
        error: `Unknown category: ${parsed.category}`
      });
    }

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
    console.log(`🚀 [PIPELINE] Triggering agent service at ${AGENT_URL}${endpoint}...`);
    const agentResponse = await fetch(`${AGENT_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentPayload)
    });

    const agentResult = await agentResponse.json();
    console.log(`🚀 [PIPELINE] Agent result status: ${agentResult.status}`);

    // Step 6: Return enriched result
    const result = {
      status: agentResult.status || 'COMPLETED',
      category: parsed.category,
      intent: parsed.intent,
      confidence: parsed.confidence,
      command,
      parsedAction: parsed,
      pipeline: agentResult,
      timestamp: new Date().toISOString()
    };

    console.log(`\n✅ [OWNER COMMAND] Pipeline completed — Category: ${parsed.category}, Status: ${result.status}`);
    console.log(`${'═'.repeat(60)}\n`);

    res.json(result);
  } catch (err) {
    console.error(`\n❌ [OWNER COMMAND] Pipeline failed: ${err.message}`);
    console.log(`${'═'.repeat(60)}\n`);
    res.status(500).json({
      status: 'ERROR',
      command,
      error: err.message
    });
  }
});

module.exports = router;
