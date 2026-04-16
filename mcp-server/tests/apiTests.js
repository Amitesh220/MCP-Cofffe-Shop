const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

/**
 * Run API tests against the backend service
 */
async function runApiTests() {
  const tests = [];
  const failures = [];

  // Test 1: GET /menu returns 200
  try {
    const res = await fetch(`${BACKEND_URL}/menu`);
    if (res.status === 200) {
      tests.push({ name: 'GET /menu returns 200', status: 'pass' });
      console.log('  ✅ GET /menu returns 200');

      // Test 2: Response is an array
      const data = await res.json();
      if (Array.isArray(data)) {
        tests.push({ name: 'GET /menu returns array', status: 'pass' });
        console.log(`  ✅ GET /menu returns array (${data.length} items)`);
      } else {
        tests.push({ name: 'GET /menu returns array', status: 'fail', detail: 'Not an array' });
        failures.push('GET /menu did not return an array');
        console.log('  ❌ GET /menu did NOT return an array');
      }
    } else {
      tests.push({ name: 'GET /menu returns 200', status: 'fail', detail: `Status: ${res.status}` });
      failures.push(`GET /menu returned ${res.status}`);
      console.log(`  ❌ GET /menu returned ${res.status}`);
    }
  } catch (err) {
    tests.push({ name: 'GET /menu is reachable', status: 'fail', detail: err.message });
    failures.push(`Backend unreachable: ${err.message}`);
    console.log(`  ❌ Backend unreachable: ${err.message}`);
  }

  // Test 3: GET /health returns ok
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    const data = await res.json();
    if (data.status === 'ok') {
      tests.push({ name: 'GET /health returns ok', status: 'pass' });
      console.log('  ✅ GET /health returns ok');
    } else {
      tests.push({ name: 'GET /health returns ok', status: 'fail', detail: `Status: ${data.status}` });
      failures.push('Health check did not return ok');
      console.log('  ❌ Health check did not return ok');
    }
  } catch (err) {
    tests.push({ name: 'GET /health is reachable', status: 'fail', detail: err.message });
    failures.push(`Health endpoint unreachable: ${err.message}`);
    console.log(`  ❌ Health endpoint unreachable: ${err.message}`);
  }

  // Test 4: POST /order validates items
  try {
    const res = await fetch(`${BACKEND_URL}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] })
    });
    if (res.status === 400) {
      tests.push({ name: 'POST /order rejects empty items', status: 'pass' });
      console.log('  ✅ POST /order correctly rejects empty items');
    } else {
      tests.push({ name: 'POST /order rejects empty items', status: 'fail', detail: `Status: ${res.status}` });
      failures.push('POST /order did not reject empty items');
      console.log(`  ❌ POST /order did not reject empty items (got ${res.status})`);
    }
  } catch (err) {
    tests.push({ name: 'POST /order validation', status: 'fail', detail: err.message });
    failures.push(`Order endpoint unreachable: ${err.message}`);
    console.log(`  ❌ Order endpoint unreachable: ${err.message}`);
  }

  return { tests, failures };
}

module.exports = { runApiTests };
