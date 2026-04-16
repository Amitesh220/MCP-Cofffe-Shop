const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ── Fallback Regex Parser (works without API key) ───────────
function fallbackParser(command) {
  const cmd = command.toLowerCase().trim();

  // ADD: "add latte for 150" or "add latte at 150"
  const addMatch = cmd.match(/^add\s+(.+?)\s+(?:for|at|price|@)\s*(\d+)/i);
  if (addMatch) {
    return {
      action: 'ADD_ITEM',
      name: addMatch[1].replace(/\b\w/g, l => l.toUpperCase()),
      price: parseInt(addMatch[2]),
      available: true
    };
  }

  // REMOVE: "remove latte" or "delete latte"
  const removeMatch = cmd.match(/^(?:remove|delete)\s+(.+)/i);
  if (removeMatch) {
    return {
      action: 'REMOVE_ITEM',
      name: removeMatch[1].replace(/\b\w/g, l => l.toUpperCase())
    };
  }

  // UPDATE PRICE: "update price of latte to 200" or "change latte price to 200"
  const priceMatch = cmd.match(/(?:update|change|set)\s+(?:price\s+(?:of\s+)?)?(.+?)\s+(?:to|=)\s*(\d+)/i);
  if (priceMatch) {
    return {
      action: 'UPDATE_PRICE',
      name: priceMatch[1].replace(/\b\w/g, l => l.toUpperCase()),
      price: parseInt(priceMatch[2])
    };
  }

  // TOGGLE: "disable latte" or "make latte unavailable"
  const disableMatch = cmd.match(/^(?:disable|hide|make\s+(.+?)\s+unavailable)/i);
  if (disableMatch) {
    const name = disableMatch[1] || cmd.replace(/^(?:disable|hide)\s+/i, '');
    return {
      action: 'TOGGLE_AVAILABILITY',
      name: name.replace(/\b\w/g, l => l.toUpperCase()),
      available: false
    };
  }

  // ENABLE: "enable latte" or "make latte available"
  const enableMatch = cmd.match(/^(?:enable|show|make\s+(.+?)\s+available)/i);
  if (enableMatch) {
    const name = enableMatch[1] || cmd.replace(/^(?:enable|show)\s+/i, '');
    return {
      action: 'TOGGLE_AVAILABILITY',
      name: name.replace(/\b\w/g, l => l.toUpperCase()),
      available: true
    };
  }

  return { error: `Could not parse command: "${command}"` };
}

// ── OpenAI Parser ───────────────────────────────────────────
async function parseWithOpenAI(command) {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const systemPrompt = `You are an AI assistant for a coffee shop management system.
Your job is to convert natural language commands from the shop owner into structured JSON actions.

Supported actions:
1. ADD_ITEM — Add a new menu item
   { "action": "ADD_ITEM", "name": "Item Name", "price": 150, "available": true }

2. REMOVE_ITEM — Remove a menu item
   { "action": "REMOVE_ITEM", "name": "Item Name" }

3. UPDATE_PRICE — Change the price of an item
   { "action": "UPDATE_PRICE", "name": "Item Name", "price": 200 }

4. TOGGLE_AVAILABILITY — Enable or disable an item
   { "action": "TOGGLE_AVAILABILITY", "name": "Item Name", "available": true/false }

Rules:
- Capitalize item names properly (e.g., "Cappuccino", "Green Tea")
- Price must be a positive integer
- Return ONLY valid JSON, no markdown, no explanation
- If unsure, make your best guess at the action`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: command }
    ],
    temperature: 0,
    max_tokens: 200
  });

  const content = response.choices[0].message.content.trim();
  
  // Strip markdown code fences if present
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ── Main Export ─────────────────────────────────────────────
async function parseOwnerCommand(command) {
  // Try OpenAI first, fall back to regex
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your-openai-api-key-here') {
    try {
      console.log('🤖 [AI] Using OpenAI for parsing...');
      const result = await parseWithOpenAI(command);
      return result;
    } catch (err) {
      console.warn('⚠️  [AI] OpenAI failed, using fallback parser:', err.message);
      return fallbackParser(command);
    }
  } else {
    console.log('🤖 [AI] No API key, using fallback regex parser...');
    return fallbackParser(command);
  }
}

module.exports = { parseOwnerCommand, fallbackParser };
