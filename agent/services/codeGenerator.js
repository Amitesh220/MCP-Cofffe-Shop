const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ══════════════════════════════════════════════════════════════
// AI CODE GENERATOR
// Generates React component code, CSS, and import statements
// for UI changes requested by the owner.
// ══════════════════════════════════════════════════════════════

const COMPONENT_PROMPT = `You are a senior React developer generating components for a coffee shop web application.

The app uses:
- React 18 with functional components and hooks
- React Router v6
- Tailwind CSS
- Vite as bundler

Existing CSS class patterns in the app (Vanilla CSS is still present, but you must use Tailwind CSS for new components):
- .container, .page-wrapper — layout wrappers
- .menu-grid — CSS grid for cards
- .menu-card, .card — card components
- .btn, .btn-primary — buttons
- .status-grid, .status-card — dashboard grid
- .log-panel, .log-content — log display
- .online, .offline — status indicators
- Color palette: dark backgrounds (#1a1a2e, #16213e), accent (#e94560, #0f3460), text (#eee, #aaa)

RULES:
1. Return ONLY a JSON object with: { componentCode, cssCode, componentName, importStatement }
2. componentCode: Complete production-ready React functional component using Tailwind CSS classes. Clean JSX.
3. cssCode: Leave empty string. Use Tailwind CSS for all styling.
4. componentName: PascalCase name (e.g., "HeroSection")
5. importStatement: The import line for App.jsx (e.g., "import HeroSection from './components/HeroSection';")
6. Use Tailwind CSS utilities that match the existing dark color palette (e.g., bg-slate-900, text-slate-100, border-slate-700).
7. Add smooth transitions and hover effects using Tailwind.
8. Make it responsive using Tailwind breakpoints.
9. Do NOT use any external libraries/dependencies.
10. Do NOT modify or remove any existing components. Only create a new component and integrate it safely into the existing structure. No explanations.
11. Return ONLY valid JSON, no markdown, no code fences`;

const STYLE_UPDATE_PROMPT = `You are a CSS expert modifying styles for a coffee shop web application.

The app uses vanilla CSS with a dark theme:
- Backgrounds: #1a1a2e, #16213e, #0f3460
- Accents: #e94560 (red), #533483 (purple)
- Text: #eee (primary), #aaa (secondary)
- Border radius: 12px for cards
- Transitions: 0.3s ease

Return ONLY a JSON object with:
{
  "cssChanges": "the CSS rules to add or modify",
  "description": "what the style change does"
}

Return ONLY valid JSON, no markdown, no code fences.`;

const CONTENT_UPDATE_PROMPT = `You are a React developer updating content in an existing component.

Return ONLY a JSON object with:
{
  "targetComponent": "component filename (e.g., MenuPage.jsx)",
  "searchText": "exact text/code to find",
  "replaceText": "replacement text/code",
  "description": "what the change does"
}

If multiple changes are needed, return an array of such objects.
Return ONLY valid JSON, no markdown, no code fences.`;

// ── Generate New Component ──────────────────────────────────
async function generateComponent(action, existingComponents = [], appJsxContent = '') {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    return {
      error: 'OpenAI API key required for UI code generation',
      suggestion: 'Set OPENAI_API_KEY in your .env file'
    };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const userPrompt = `Generate a React component for the following request:

Action: ${action.type}
Target: ${action.target}
Description: ${action.details?.description || action.target}
${action.details?.styles ? `Styles: ${JSON.stringify(action.details.styles)}` : ''}
${action.details?.content ? `Content: ${action.details.content}` : ''}

Existing components in the app: ${existingComponents.join(', ')}

Current App.jsx content for context (understand layout and routing):
\`\`\`jsx
${appJsxContent}
\`\`\`

Generate the component now.`;

  console.log('🎨 [CODE-GEN] Generating React component...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: COMPONENT_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  const content = response.choices[0].message.content.trim();
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const result = JSON.parse(cleaned);

    // Validate required fields
    if (!result.componentCode || !result.componentName) {
      throw new Error('Missing componentCode or componentName in generated output');
    }

    // Ensure import statement exists
    if (!result.importStatement) {
      result.importStatement = `import ${result.componentName} from './components/${result.componentName}';`;
    }

    // Ensure CSS exists (may be empty)
    if (!result.cssCode) {
      result.cssCode = '';
    }

    console.log(`🎨 [CODE-GEN] Generated component: ${result.componentName}`);
    return result;
  } catch (parseErr) {
    console.error(`❌ [CODE-GEN] Failed to parse generated code: ${parseErr.message}`);
    return {
      error: `Code generation produced invalid output: ${parseErr.message}`,
      rawOutput: content
    };
  }
}

// ── Generate Style Update ───────────────────────────────────
async function generateStyleUpdate(action) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    return {
      error: 'OpenAI API key required for style generation',
      suggestion: 'Set OPENAI_API_KEY in your .env file'
    };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const userPrompt = `Modify the CSS for the following request:

Target element: ${action.target}
Change type: ${action.type}
Description: ${action.details?.description || `Style change for ${action.target}`}
${action.details?.styles ? `Requested styles: ${JSON.stringify(action.details.styles)}` : ''}`;

  console.log('🎨 [CODE-GEN] Generating CSS update...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: STYLE_UPDATE_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1000
  });

  const content = response.choices[0].message.content.trim();
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    return { error: `Style generation produced invalid output: ${parseErr.message}`, rawOutput: content };
  }
}

// ── Generate Content Update ─────────────────────────────────
async function generateContentUpdate(action, componentSource) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
    return {
      error: 'OpenAI API key required for content updates',
      suggestion: 'Set OPENAI_API_KEY in your .env file'
    };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const userPrompt = `Update content in a React component for this request:

Target: ${action.target}
Change: ${action.details?.description || action.details?.content || action.target}
Current component source:
${componentSource}`;

  console.log('🎨 [CODE-GEN] Generating content update...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: CONTENT_UPDATE_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1000
  });

  const content = response.choices[0].message.content.trim();
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    return { error: `Content update produced invalid output: ${parseErr.message}`, rawOutput: content };
  }
}

// ── Basic JSX Validation ────────────────────────────────────
function validateJSX(code) {
  const errors = [];

  // Check for basic structure
  if (!code.includes('import React') && !code.includes("from 'react'")) {
    errors.push('Missing React import');
  }

  if (!code.includes('export default')) {
    errors.push('Missing default export');
  }

  if (!code.includes('return')) {
    errors.push('Missing return statement');
  }

  // Check for balanced braces
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }

  // Check for balanced parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateComponent,
  generateStyleUpdate,
  generateContentUpdate,
  validateJSX
};
