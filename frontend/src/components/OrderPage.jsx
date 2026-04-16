import React, { useState, useEffect } from 'react';

const API_BASE = '';

function OrderPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/menu`)
      .then(r => r.json())
      .then(data => {
        setMenu(data.filter(i => i.available));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleItem = (name) => {
    setSelectedItems(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const getTotal = () => {
    return selectedItems.reduce((sum, name) => {
      const item = menu.find(m => m.name === name);
      return sum + (item ? item.price : 0);
    }, 0);
  };

  const submitOrder = async () => {
    if (selectedItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems,
          customerName: customerName || 'Guest'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setSelectedItems([]);
        setCustomerName('');
      } else {
        alert(data.error || 'Order failed');
      }
    } catch (err) {
      alert('Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (order) {
    return (
      <div className="container">
        <div className="order-page">
          <div className="order-confirmation fade-in">
            <div className="check-icon">✅</div>
            <h3>Order Confirmed!</h3>
            <p>Thank you, {order.customerName}! Your order of {order.items.length} item(s) totaling ₹{order.total} has been placed.</p>
            <div className="order-id">Order ID: {order.id}</div>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0.75rem 2rem', marginTop: '1.5rem' }}
              onClick={() => setOrder(null)}
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="order-page">
        <h2>📝 Place an Order</h2>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading menu...</p>
          </div>
        ) : (
          <div className="order-form fade-in">
            <div className="form-group">
              <label htmlFor="customer-name">Your Name</label>
              <input
                id="customer-name"
                type="text"
                placeholder="Enter your name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Select Items</label>
              <div className="checkbox-group">
                {menu.map(item => (
                  <label
                    key={item.name}
                    className={`checkbox-item ${selectedItems.includes(item.name) ? 'selected' : ''}`}
                    id={`order-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.name)}
                      onChange={() => toggleItem(item.name)}
                    />
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">₹{item.price}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="order-total">
                <span>Total ({selectedItems.length} items)</span>
                <span className="total-amount">₹{getTotal()}</span>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={submitOrder}
              disabled={selectedItems.length === 0 || submitting}
              id="place-order-btn"
            >
              {submitting ? 'Placing Order...' : `Place Order${selectedItems.length > 0 ? ` · ₹${getTotal()}` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderPage;
