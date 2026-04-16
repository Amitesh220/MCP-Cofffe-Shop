import React from 'react';

function MenuCard({ item, index }) {
  const icons = ['☕', '🍵', '🥤', '🧋', '🍶', '🫖', '🥛', '🍹'];
  const icon = icons[index % icons.length];

  return (
    <div
      className={`menu-card fade-in ${!item.available ? 'unavailable' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      id={`menu-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="card-top">
        <div className="card-icon">{icon}</div>
        <span className={`availability-badge ${item.available ? 'available' : 'unavailable'}`}>
          {item.available ? '● Available' : '● Sold Out'}
        </span>
      </div>
      <div className="card-name">{item.name}</div>
      <div className="card-price">
        <span className="currency">₹</span>{item.price}
      </div>
    </div>
  );
}

export default MenuCard;
