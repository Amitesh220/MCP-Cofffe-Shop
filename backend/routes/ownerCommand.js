const express = require('express');
const { parseOwnerCommand } = require('../services/aiParser');
const router = express.Router();

let pipelineRunning = false;

async function waitForService(url) {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Service not ready");
}

async function safeFetch(url, options, retries = 3) {
  try {
    return await fetch(url, options);
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return safeFetch(url, options, retries - 1);
    }
    throw e;
  }
}

router.post('/', async (req, res) => {
  if (pipelineRunning) {
    return res.status(429).json({ message: "Pipeline already running" });
  }
  pipelineRunning = true;
  try {
    const command = req.body?.command;

    if (!command) {
      return res.status(400).json({
        status: "error",
        message: "Command missing"
      });
    }

    console.log(`🗣️  [OWNER COMMAND] "${command}"`);

    // Call AI parser
    const parsed = await parseOwnerCommand(command);

    if (!parsed) {
      return res.status(500).json({
        status: "error",
        message: "Parsing failed"
      });
    }

    // Wait for agent to be ready
    await waitForService("http://agent:3001/health");

    // Route to agent
    const endpoint = "http://agent:3001/run-ui-pipeline";

    const response = await safeFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsed)
    });

    const data = await response.json();

    return res.json({
      status: "success",
      result: data
    });

  } catch (error) {
    console.error("❌ OWNER COMMAND ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: error.message
    });
  } finally {
    pipelineRunning = false;
  }
});

module.exports = router;
