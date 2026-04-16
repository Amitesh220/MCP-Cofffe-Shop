const express = require('express');
const { parseOwnerCommand } = require('../services/aiParser');
const router = express.Router();

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3001';

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
    // Step 1: Parse with AI
    console.log('\n🤖 [AI] Parsing command...');
    const action = await parseOwnerCommand(command);
    console.log('🤖 [AI] Parsed action:', JSON.stringify(action, null, 2));

    if (action.error) {
      console.log('❌ [AI] Failed to parse command');
      return res.status(400).json({
        status: 'PARSE_ERROR',
        command,
        error: action.error
      });
    }

    // Step 2: Trigger agent pipeline
    console.log('\n🚀 [PIPELINE] Triggering agent service...');
    const agentResponse = await fetch(`${AGENT_URL}/run-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, originalCommand: command })
    });

    const agentResult = await agentResponse.json();
    console.log('🚀 [PIPELINE] Agent result:', JSON.stringify(agentResult, null, 2));

    // Step 3: Return result
    const result = {
      status: agentResult.status || 'COMPLETED',
      command,
      parsedAction: action,
      pipeline: agentResult,
      timestamp: new Date().toISOString()
    };

    console.log(`\n✅ [OWNER COMMAND] Pipeline completed with status: ${result.status}`);
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
