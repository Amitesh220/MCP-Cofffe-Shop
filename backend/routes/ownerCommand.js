const express = require('express');
const { parseOwnerCommand } = require('../services/aiParser');
const router = express.Router();

router.post('/', async (req, res) => {
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

    // Route to agent
    const endpoint = "http://agent:3001/run-ui-pipeline";

    const response = await fetch(endpoint, {
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
  }
});

module.exports = router;
