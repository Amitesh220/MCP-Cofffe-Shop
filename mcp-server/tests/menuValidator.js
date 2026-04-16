const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

/**
 * Validate menu data structure and integrity
 */
async function validateMenu(menuData) {
  const tests = [];
  const failures = [];

  // If no data provided, fetch from backend
  let menu = menuData;
  if (!menu) {
    try {
      const res = await fetch(`${BACKEND_URL}/menu`);
      menu = await res.json();
    } catch (err) {
      tests.push({ name: 'Fetch menu from backend', status: 'fail', detail: err.message });
      failures.push('Could not fetch menu from backend');
      return { tests, failures };
    }
  }

  // Test 1: Valid JSON Array
  if (Array.isArray(menu)) {
    tests.push({ name: 'Menu is valid JSON array', status: 'pass' });
    console.log('  ✅ Menu is valid JSON array');
  } else {
    tests.push({ name: 'Menu is valid JSON array', status: 'fail', detail: 'Not an array' });
    failures.push('Menu is not a valid JSON array');
    console.log('  ❌ Menu is NOT a valid JSON array');
    return { tests, failures }; // Can't continue
  }

  // Test 2: No duplicate items
  const names = menu.map(i => i.name?.toLowerCase());
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length === 0) {
    tests.push({ name: 'No duplicate items', status: 'pass' });
    console.log('  ✅ No duplicate items');
  } else {
    tests.push({ name: 'No duplicate items', status: 'fail', detail: `Duplicates: ${dupes.join(', ')}` });
    failures.push(`Duplicate items found: ${dupes.join(', ')}`);
    console.log(`  ❌ Duplicate items: ${dupes.join(', ')}`);
  }

  // Test 3: Required fields present
  let fieldsOk = true;
  menu.forEach((item, i) => {
    if (!item.name || typeof item.name !== 'string') {
      fieldsOk = false;
      failures.push(`Item ${i}: missing or invalid name`);
    }
    if (typeof item.price !== 'number' || item.price <= 0) {
      fieldsOk = false;
      failures.push(`Item ${i} (${item.name || 'unknown'}): invalid price`);
    }
    if (typeof item.available !== 'boolean') {
      fieldsOk = false;
      failures.push(`Item ${i} (${item.name || 'unknown'}): invalid availability`);
    }
  });
  if (fieldsOk) {
    tests.push({ name: 'All items have required fields', status: 'pass' });
    console.log('  ✅ All items have required fields (name, price, available)');
  } else {
    tests.push({ name: 'All items have required fields', status: 'fail', detail: 'See failures' });
    console.log('  ❌ Some items missing required fields');
  }

  // Test 4: Prices are positive
  const negativePrices = menu.filter(i => typeof i.price === 'number' && i.price <= 0);
  if (negativePrices.length === 0) {
    tests.push({ name: 'All prices are positive', status: 'pass' });
    console.log('  ✅ All prices are positive');
  } else {
    tests.push({ name: 'All prices are positive', status: 'fail', detail: `${negativePrices.length} items with invalid price` });
    failures.push('Some items have non-positive prices');
    console.log('  ❌ Some items have non-positive prices');
  }

  // Test 5: Menu not empty
  if (menu.length > 0) {
    tests.push({ name: 'Menu is not empty', status: 'pass' });
    console.log(`  ✅ Menu has ${menu.length} items`);
  } else {
    tests.push({ name: 'Menu is not empty', status: 'fail', detail: 'Menu is empty' });
    failures.push('Menu is empty');
    console.log('  ❌ Menu is empty');
  }

  return { tests, failures };
}

module.exports = { validateMenu };
