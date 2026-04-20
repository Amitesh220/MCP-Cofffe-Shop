const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ══════════════════════════════════════════════════════════════
// UNIVERSAL ACTION SCHEMA
// ══════════════════════════════════════════════════════════════
//
// {
//   "category": "UI | DATA | SYSTEM | ANALYSIS | UNKNOWN",
//   "intent": "short description",
//   "actions": [
//     {
//       "type": "ADD | UPDATE | DELETE | STYLE | GENERATE | ANALYZE",
//       "target": "component / element / file / data",
//       "details": {}
//     }
//   ],
//   "confidence": 0.0 - 1.0
// }
//
// For DATA category, legacy fields are also included for backward
// compatibility with the existing pipeline processor:
//   "legacyActions": [ { action, name, price, available } ]
//
// ══════════════════════════════════════════════════════════════

// ── System Prompt for AI Product Engineer ────────────────────
const SYSTEM_PROMPT = `You are an AI Product Engineer for a coffee shop web application.

Your job is to:
1. Understand the user's intent
2. Classify the request into a category: UI, DATA, SYSTEM, ANALYSIS
3. Generate a structured JSON output

## CATEGORIES

### DATA — Menu/data changes
Examples: "Add latte for 150", "Remove espresso", "Update coffee price to 200", "Disable americano"
Supported action types: ADD, UPDATE, DELETE
Target: the menu item name
Details: { name, price, available }

### UI — Frontend visual changes
Examples: "Add hero section", "Change button color to red", "Make layout modern", "Add animation", "Improve UI", "Change hero text to Welcome"
Supported action types: ADD, DELETE, STYLE, UPDATE, GENERATE, UPDATE_TEXT, CHANGE_STYLE, ADD_SECTION, REMOVE_SECTION
Target: component or element name (e.g., "HeroSection", "Navbar", "button")
Details: { description, styles, content, componentName, field, value, property }

### SYSTEM — DevOps / backend behavior changes
Examples: "Add logging", "Fix bug", "Optimize performance", "Add error handling", "Improve loading speed"
Supported action types: ADD, UPDATE, DELETE, GENERATE, ANALYZE
Target: the system aspect (e.g., "logging", "error-handling", "performance")
Details: { description, files, scope }

### ANALYSIS — Questions / critical thinking (NO code changes)
Examples: "What is the biggest bug?", "Why did pipeline fail?", "Is frontend working?", "Show system status"
Action type: ANALYZE
Target: what to analyze (e.g., "bugs", "pipeline", "system-status", "performance")
Details: { question }

## RULES
- NEVER return undefined or null values
- ALWAYS return valid JSON
- If unsure → category = "UNKNOWN" with confidence < 0.3
- Be flexible — user can ask ANYTHING
- For DATA category, include "legacyActions" array with objects containing: { action: "ADD_ITEM|REMOVE_ITEM|UPDATE_PRICE|TOGGLE_AVAILABILITY", name, price, available }
- Capitalize item names properly (e.g., "Cappuccino", "Green Tea")
- Price must be a positive integer
- Support multiple actions from a single command (e.g., "Add mocha and remove latte")
- confidence must be a number between 0.0 and 1.0

## OUTPUT FORMAT
Return ONLY this JSON structure, nothing else:
{
  "category": "UI | DATA | SYSTEM | ANALYSIS | UNKNOWN",
  "intent": "short description of what user wants",
  "actions": [
    {
      "type": "ADD | UPDATE | DELETE | STYLE | GENERATE | ANALYZE | UPDATE_TEXT | CHANGE_STYLE | ADD_SECTION | REMOVE_SECTION",
      "target": "target component name (e.g., HeroSection, Navbar)",
      "field": "optional field name for text update",
      "property": "optional css property for style update",
      "value": "optional value for text or style update",
      "details": {}
    }
  ],
  "confidence": 0.85,
  "legacyActions": []
}

Output ONLY JSON. No markdown, no explanation, no code fences.`;

// ── Fallback Regex Parser (works without API key) ───────────
function fallbackParser(command) {
  const cmd = command.toLowerCase().trim();

  // ── DATA: Menu operations ──────────────────────────────────

  // ADD: "add latte for 150" or "add latte at 150"
  const addMatch = cmd.match(/^add\s+(.+?)\s+(?:for|at|price|@)\s*(\d+)/i);
  if (addMatch) {
    const name = addMatch[1].replace(/\b\w/g, l => l.toUpperCase());
    const price = parseInt(addMatch[2]);
    return {
      category: 'DATA',
      intent: `Add ${name} to menu at ₹${price}`,
      actions: [{ type: 'ADD', target: name, details: { name, price, available: true } }],
      confidence: 0.9,
      legacyActions: [{ action: 'ADD_ITEM', name, price, available: true }]
    };
  }

  // REMOVE: "remove latte" or "delete latte"
  const removeMatch = cmd.match(/^(?:remove|delete)\s+(.+)/i);
  if (removeMatch) {
    const name = removeMatch[1].replace(/\b\w/g, l => l.toUpperCase());
    return {
      category: 'DATA',
      intent: `Remove ${name} from menu`,
      actions: [{ type: 'DELETE', target: name, details: { name } }],
      confidence: 0.9,
      legacyActions: [{ action: 'REMOVE_ITEM', name }]
    };
  }

  // UPDATE PRICE: "update price of latte to 200" or "change latte price to 200"
  const priceMatch = cmd.match(/(?:update|change|set)\s+(?:price\s+(?:of\s+)?)?(.+?)\s+(?:to|=)\s*(\d+)/i);
  if (priceMatch) {
    const name = priceMatch[1].replace(/\b\w/g, l => l.toUpperCase());
    const price = parseInt(priceMatch[2]);
    return {
      category: 'DATA',
      intent: `Update ${name} price to ₹${price}`,
      actions: [{ type: 'UPDATE', target: name, details: { name, price } }],
      confidence: 0.9,
      legacyActions: [{ action: 'UPDATE_PRICE', name, price }]
    };
  }

  // TOGGLE OFF: "disable latte" or "make latte unavailable"
  const disableMatch = cmd.match(/^(?:disable|hide|make\s+(.+?)\s+unavailable)/i);
  if (disableMatch) {
    const name = (disableMatch[1] || cmd.replace(/^(?:disable|hide)\s+/i, '')).replace(/\b\w/g, l => l.toUpperCase());
    return {
      category: 'DATA',
      intent: `Disable ${name}`,
      actions: [{ type: 'UPDATE', target: name, details: { name, available: false } }],
      confidence: 0.9,
      legacyActions: [{ action: 'TOGGLE_AVAILABILITY', name, available: false }]
    };
  }

  // ── ANALYSIS: Question-like commands ───────────────────────
  // Check BEFORE toggle so "show status" doesn't match as a menu toggle
  const analysisKeywords = /^(what|why|how|is|are|show|status|check|tell|explain|describe|list|diagnose)/i;
  if (analysisKeywords.test(cmd)) {
    return {
      category: 'ANALYSIS',
      intent: command,
      actions: [{ type: 'ANALYZE', target: 'general', details: { question: command } }],
      confidence: 0.7,
      legacyActions: []
    };
  }

  // TOGGLE ON: "enable latte" or "make latte available"
  const enableMatch = cmd.match(/^(?:enable|make\s+(.+?)\s+available)/i);
  if (enableMatch) {
    const name = (enableMatch[1] || cmd.replace(/^enable\s+/i, '')).replace(/\b\w/g, l => l.toUpperCase());
    return {
      category: 'DATA',
      intent: `Enable ${name}`,
      actions: [{ type: 'UPDATE', target: name, details: { name, available: true } }],
      confidence: 0.9,
      legacyActions: [{ action: 'TOGGLE_AVAILABILITY', name, available: true }]
    };
  }

  // ── UI: UI-related keywords ────────────────────────────────
  const uiKeywords = /\b(hero|banner|footer|card|section|layout|animation|color|font|modern|redesign|theme|dark mode|style|component|button color|header|navbar|sidebar)\b/i;
  if (uiKeywords.test(cmd)) {
    return {
      category: 'UI',
      intent: command,
      actions: [{ type: 'GENERATE', target: 'ui', details: { description: command } }],
      confidence: 0.5,
      legacyActions: [],
      _note: 'UI commands require OpenAI API key for full functionality'
    };
  }

  // ── SYSTEM: System-related keywords ────────────────────────
  const systemKeywords = /\b(fix|bug|log|logging|optimize|performance|error|deploy|build|speed|cache|security|debug)\b/i;
  if (systemKeywords.test(cmd)) {
    return {
      category: 'SYSTEM',
      intent: command,
      actions: [{ type: 'ANALYZE', target: 'system', details: { description: command } }],
      confidence: 0.5,
      legacyActions: [],
      _note: 'SYSTEM commands require OpenAI API key for full functionality'
    };
  }

  // ── UNKNOWN ────────────────────────────────────────────────
  return {
    category: 'UNKNOWN',
    intent: command,
    actions: [],
    confidence: 0.1,
    legacyActions: [],
    clarification: `Could not understand: "${command}". Try commands like "Add latte for 150", "What is system status?", or "Add a hero section".`
  };
}

// ── OpenAI Universal Parser ─────────────────────────────────
async function parseWithOpenAI(command) {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: command }
    ],
    temperature: 0,
    max_tokens: 1000
  });

  const content = response.choices[0].message.content.trim();

  // Strip markdown code fences if present
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // ── Validation & Sanitization ─────────────────────────────
  // Ensure required fields exist and are valid
  if (!parsed.category || !['UI', 'DATA', 'SYSTEM', 'ANALYSIS', 'UNKNOWN'].includes(parsed.category)) {
    parsed.category = 'UNKNOWN';
  }

  if (!parsed.intent || typeof parsed.intent !== 'string') {
    parsed.intent = command;
  }

  if (!Array.isArray(parsed.actions)) {
    parsed.actions = [];
  }

  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    parsed.confidence = 0.5;
  }

  if (!Array.isArray(parsed.legacyActions)) {
    parsed.legacyActions = [];
  }

  // Ensure no undefined values anywhere in the response
  const sanitized = JSON.parse(JSON.stringify(parsed, (key, value) => {
    if (value === undefined) return null;
    return value;
  }));

  return sanitized;
}

// ── Main Export ─────────────────────────────────────────────
async function parseOwnerCommand(command) {
  if (!command || typeof command !== 'string' || command.trim().length === 0) {
    return {
      category: 'UNKNOWN',
      intent: '',
      actions: [],
      confidence: 0,
      legacyActions: [],
      error: 'Empty or invalid command'
    };
  }

  // Try OpenAI first, fall back to regex
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your-openai-api-key-here') {
    try {
      console.log('🤖 [AI] Using OpenAI universal parser...');
      const result = await parseWithOpenAI(command);
      console.log(`🤖 [AI] Category: ${result.category} | Confidence: ${result.confidence}`);
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
