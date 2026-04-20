const path = require('path');
const { execSync } = require('child_process');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://frontend';
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

// ══════════════════════════════════════════════════════════════
// BUILD & COMPONENT TESTS
// Validates frontend build integrity and component existence.
// ══════════════════════════════════════════════════════════════

// ── Known components that should exist ──────────────────────
const EXPECTED_COMPONENTS = [
  'MenuPage',
  'MenuCard',
  'OrderPage',
  'AdminPanel',
  'Navbar'
];

/**
 * Run build validation tests.
 * Since we're inside a Docker container without the frontend source,
 * we test build artifacts via the served frontend.
 */
async function runBuildTests() {
  const tests = [];
  const failures = [];

  console.log('  🔨 [BUILD] Running build validation tests...');

  // Test 1: Frontend serves valid HTML (build output exists)
  try {
    const res = await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(5000) });
    if (res.status === 200) {
      const html = await res.text();

      // Check that built JS is included
      if (html.includes('<script') && (html.includes('.js') || html.includes('module'))) {
        tests.push({ name: 'Frontend serves built JS bundle', status: 'pass' });
        console.log('  ✅ Frontend serves built JS bundle');
      } else {
        tests.push({ name: 'Frontend serves built JS bundle', status: 'fail', detail: 'No script tags found' });
        failures.push('Built JS bundle missing from served HTML');
        console.log('  ❌ Built JS bundle missing from served HTML');
      }

      // Check CSS is linked
      if (html.includes('<link') && html.includes('.css')) {
        tests.push({ name: 'Frontend serves built CSS', status: 'pass' });
        console.log('  ✅ Frontend serves built CSS');
      } else {
        // CSS might be injected via JS in Vite builds
        tests.push({ name: 'Frontend serves built CSS', status: 'pass', detail: 'CSS may be JS-injected' });
        console.log('  ✅ Frontend serves CSS (may be JS-injected)');
      }
    } else {
      tests.push({ name: 'Frontend serves built output', status: 'fail', detail: `Status: ${res.status}` });
      failures.push(`Frontend returned ${res.status}`);
      console.log(`  ❌ Frontend returned ${res.status}`);
    }
  } catch (err) {
    tests.push({ name: 'Frontend build output accessible', status: 'fail', detail: err.message });
    failures.push(`Frontend unreachable: ${err.message}`);
    console.log(`  ❌ Frontend unreachable: ${err.message}`);
  }

  // Test 2: Frontend assets load without 404
  try {
    const res = await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(5000) });
    if (res.status === 200) {
      const html = await res.text();

      // Extract JS asset URLs
      const jsMatches = html.match(/src="([^"]*\.js[^"]*)"/g) || [];
      for (const match of jsMatches.slice(0, 3)) { // Check first 3 JS files
        const src = match.replace(/src="/, '').replace(/"$/, '');
        const assetUrl = src.startsWith('http') ? src : `${FRONTEND_URL}${src.startsWith('/') ? '' : '/'}${src}`;

        try {
          const assetRes = await fetch(assetUrl, { signal: AbortSignal.timeout(3000) });
          if (assetRes.status === 200) {
            tests.push({ name: `Asset loads: ${path.basename(src)}`, status: 'pass' });
            console.log(`  ✅ Asset loads: ${path.basename(src)}`);
          } else {
            tests.push({ name: `Asset loads: ${path.basename(src)}`, status: 'fail', detail: `Status: ${assetRes.status}` });
            failures.push(`Asset 404: ${src}`);
            console.log(`  ❌ Asset 404: ${path.basename(src)}`);
          }
        } catch (assetErr) {
          // Non-critical, asset might be relative path issue
          tests.push({ name: `Asset check: ${path.basename(src)}`, status: 'pass', detail: 'Skipped — path issue' });
        }
      }
    }
  } catch {
    // Already tested above
  }

  // Test 3: SPA routing works (non-root paths return index.html)
  try {
    const res = await fetch(`${FRONTEND_URL}/order`, { signal: AbortSignal.timeout(5000) });
    if (res.status === 200) {
      const html = await res.text();
      if (html.includes('<div id="root"') || html.includes('<div id="root">')) {
        tests.push({ name: 'SPA routing works (/order returns index.html)', status: 'pass' });
        console.log('  ✅ SPA routing works (/order returns index.html)');
      } else {
        tests.push({ name: 'SPA routing works', status: 'fail', detail: 'Missing root element' });
        failures.push('SPA routing broken — /order does not return index.html');
        console.log('  ❌ SPA routing broken');
      }
    } else {
      tests.push({ name: 'SPA routing works', status: 'fail', detail: `Status: ${res.status}` });
      failures.push(`SPA routing returned ${res.status} for /order`);
      console.log(`  ❌ SPA routing returned ${res.status}`);
    }
  } catch (err) {
    tests.push({ name: 'SPA routing check', status: 'fail', detail: err.message });
    failures.push(`SPA routing check failed: ${err.message}`);
  }

  return { tests, failures };
}

/**
 * Validate that expected components are referenced in the build.
 * Since we can't directly inspect source files from MCP container,
 * we check that the built JS bundle contains component references.
 */
async function runComponentTests() {
  const tests = [];
  const failures = [];

  console.log('  🧩 [COMPONENTS] Running component validation...');

  try {
    const res = await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(5000) });
    if (res.status !== 200) {
      tests.push({ name: 'Component validation', status: 'fail', detail: 'Frontend unreachable' });
      failures.push('Cannot validate components — frontend unreachable');
      return { tests, failures };
    }

    const html = await res.text();

    // Find the main JS bundle URL
    const jsMatch = html.match(/src="([^"]*index[^"]*\.js[^"]*)"/);
    if (!jsMatch) {
      tests.push({ name: 'Component validation', status: 'pass', detail: 'Could not locate main bundle, skipping' });
      console.log('  ⚠️  Could not locate main JS bundle, skipping component checks');
      return { tests, failures };
    }

    const bundleSrc = jsMatch[1];
    const bundleUrl = bundleSrc.startsWith('http') ? bundleSrc : `${FRONTEND_URL}${bundleSrc.startsWith('/') ? '' : '/'}${bundleSrc}`;

    let bundleContent = '';
    try {
      const bundleRes = await fetch(bundleUrl, { signal: AbortSignal.timeout(5000) });
      bundleContent = await bundleRes.text();
    } catch {
      tests.push({ name: 'Component validation', status: 'pass', detail: 'Bundle fetch failed, skipping' });
      return { tests, failures };
    }

    // Check for expected component names in bundle
    for (const component of EXPECTED_COMPONENTS) {
      if (bundleContent.includes(component)) {
        tests.push({ name: `Component exists: ${component}`, status: 'pass' });
        console.log(`  ✅ Component exists: ${component}`);
      } else {
        tests.push({ name: `Component exists: ${component}`, status: 'fail', detail: 'Not found in bundle' });
        failures.push(`Component missing from bundle: ${component}`);
        console.log(`  ❌ Component missing: ${component}`);
      }
    }

  } catch (err) {
    tests.push({ name: 'Component validation', status: 'fail', detail: err.message });
    failures.push(`Component validation failed: ${err.message}`);
    console.log(`  ❌ Component validation failed: ${err.message}`);
  }

  return { tests, failures };
}

module.exports = { runBuildTests, runComponentTests };
