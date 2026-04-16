const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const MENU_PATH = path.join(__dirname, '..', 'menu.json');
const orders = [];

// POST /order — create an order
router.post('/', (req, res) => {
  try {
    const { items, customerName } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Validate items against menu
    const raw = fs.readFileSync(MENU_PATH, 'utf-8');
    const menu = JSON.parse(raw);
    const menuNames = menu.map(m => m.name.toLowerCase());

    const invalidItems = items.filter(i => !menuNames.includes(i.toLowerCase()));
    if (invalidItems.length > 0) {
      return res.status(400).json({ error: `Invalid items: ${invalidItems.join(', ')}` });
    }

    // Check availability
    const unavailable = items.filter(i => {
      const menuItem = menu.find(m => m.name.toLowerCase() === i.toLowerCase());
      return menuItem && !menuItem.available;
    });
    if (unavailable.length > 0) {
      return res.status(400).json({ error: `Unavailable items: ${unavailable.join(', ')}` });
    }

    // Calculate total
    let total = 0;
    const orderItems = items.map(i => {
      const menuItem = menu.find(m => m.name.toLowerCase() === i.toLowerCase());
      total += menuItem.price;
      return { name: menuItem.name, price: menuItem.price };
    });

    const order = {
      id: uuidv4(),
      customerName: customerName || 'Guest',
      items: orderItems,
      total,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    orders.push(order);
    console.log(`🧾 [ORDER] New order ${order.id} — ${order.items.length} items, ₹${order.total}`);
    res.status(201).json(order);
  } catch (err) {
    console.error('❌ [ORDER] Error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /order — list orders
router.get('/', (req, res) => {
  res.json(orders);
});

module.exports = router;
