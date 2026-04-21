import React, { useState, useEffect } from 'react';
import MenuCard from './MenuCard';

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "3.107.182.204"
    ? "http://3.107.182.204:3000"
    : "http://backend:3000";

function MenuPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      await fetch(`${API_BASE}/health`); // Validate backend reachability
      const res = await fetch(`${API_BASE}/menu`);
      if (!res.ok) throw new Error('Failed to load menu');
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON response");
      }
      
      setMenu(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    // Auto-refresh every 10 seconds to catch pipeline updates
    const interval = setInterval(fetchMenu, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      {/* Hero section */}
      <section className="hero">
        <h1>Our Menu</h1>
        <p>Freshly brewed beverages crafted with passion. Our menu evolves with AI-powered updates.</p>
        <div className="ai-badge">
          <div className="pulse"></div>
          AI-Powered · Auto-Updating
        </div>
      </section>

      {/* Menu items */}
      <section className="menu-section" id="menu-section">
        <div className="section-header">
          <h2>☕ Beverages</h2>
          <span className="item-count">{menu?.length || 0} items</span>
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading menu...</p>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <p>❌ {error}</p>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem', marginTop: '1rem' }} onClick={fetchMenu}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (!menu || menu.length === 0) && (
          <div className="empty-state">
            <p>No items on the menu yet. Ask the owner to add some!</p>
          </div>
        )}

        {!loading && !error && menu?.length > 0 && (
          <div className="menu-grid">
            {menu?.map((item, index) => (
              <MenuCard key={item?.name || index} item={item} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MenuPage;
