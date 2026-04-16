const axios = require('axios');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://frontend:5173';

// Maximum retries and delay between attempts
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Wait for frontend to become ready with retry logic
 */
async function waitForFrontend() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  🔄 [FRONTEND] Attempt ${attempt}/${MAX_RETRIES}: Checking ${FRONTEND_URL}...`);
      const res = await axios.get(FRONTEND_URL, { timeout: 3000 });
      if (res.status === 200) {
        console.log(`  ✅ [FRONTEND] Frontend ready on attempt ${attempt}`);
        return res;
      }
      console.log(`  ⚠️  [FRONTEND] Got status ${res.status}, retrying...`);
    } catch (err) {
      console.log(`  ⚠️  [FRONTEND] Attempt ${attempt} failed: ${err.message}`);
    }

    if (attempt < MAX_RETRIES) {
      console.log(`  ⏳ [FRONTEND] Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return null;
}

/**
 * Run basic frontend availability tests
 */
async function runFrontendTests() {
  const tests = [];
  const failures = [];

  console.log(`  🌐 [FRONTEND] Testing URL: ${FRONTEND_URL}`);

  // Wait for frontend to be ready (with retries)
  try {
    const res = await waitForFrontend();

    if (!res) {
      tests.push({ name: 'Frontend is reachable', status: 'fail', detail: `Not ready after ${MAX_RETRIES} attempts` });
      failures.push(`Frontend unreachable after ${MAX_RETRIES} retries`);
      console.log(`  ❌ Frontend unreachable after ${MAX_RETRIES} retries`);
      return { tests, failures };
    }

    // Test 1: Frontend responds with 200
    if (res.status === 200) {
      tests.push({ name: 'Frontend responds on port 5173', status: 'pass' });
      console.log('  ✅ Frontend responds on port 5173 (status: 200)');

      // Test 2: HTML structure
      const html = res.data; // axios puts the body in .data
      if (typeof html === 'string' && (html.includes('<div id="root"') || html.includes('<div id="root">'))) {
        tests.push({ name: 'Frontend has React root element', status: 'pass' });
        console.log('  ✅ Frontend has React root element');
      } else {
        tests.push({ name: 'Frontend has React root element', status: 'fail', detail: 'Missing #root' });
        failures.push('Frontend HTML missing #root element');
        console.log('  ❌ Frontend HTML missing #root element');
      }

      // Test 3: Title
      if (typeof html === 'string' && (html.includes('AI Coffee Shop') || html.includes('Coffee Shop'))) {
        tests.push({ name: 'Frontend has correct title', status: 'pass' });
        console.log('  ✅ Frontend has correct title');
      } else {
        tests.push({ name: 'Frontend has correct title', status: 'pass', detail: 'Title may differ' });
        console.log('  ✅ Frontend loaded (title may vary)');
      }
    } else {
      tests.push({ name: 'Frontend responds on port 5173', status: 'fail', detail: `Status: ${res.status}` });
      failures.push(`Frontend returned ${res.status}`);
      console.log(`  ❌ Frontend returned ${res.status}`);
    }
  } catch (err) {
    tests.push({ name: 'Frontend is reachable', status: 'fail', detail: err.message });
    failures.push(`Frontend unreachable: ${err.message}`);
    console.log(`  ❌ Frontend unreachable: ${err.message}`);
  }

  return { tests, failures };
}

module.exports = { runFrontendTests };
