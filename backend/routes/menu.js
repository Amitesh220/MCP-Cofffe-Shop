const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const MENU_PATH = path.join(__dirname, '..', 'menu.json');

// GET /menu — return current menu
router.get('/', (req, res) => {
  try {
    const raw = fs.readFileSync(MENU_PATH, 'utf-8');
    const menu = JSON.parse(raw);
    console.log(`📋 [MENU] Returning ${menu.length} items`);
    res.json(menu);
  } catch (err) {
    console.error('❌ [MENU] Failed to read menu:', err.message);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

// POST /menu/update — internal endpoint for agent to push menu updates
router.post('/update', (req, res) => {
  try {
    const { menu } = req.body;

    if (!Array.isArray(menu)) {
      return res.status(400).json({ error: 'Menu must be an array' });
    }

    fs.writeFileSync(MENU_PATH, JSON.stringify(menu, null, 2));
    console.log(`✅ [MENU] Updated menu with ${menu.length} items`);
    res.json({ status: 'ok', items: menu.length });
  } catch (err) {
    console.error('❌ [MENU] Failed to update menu:', err.message);
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

module.exports = router;
