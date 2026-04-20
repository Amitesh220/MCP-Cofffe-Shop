import React from 'react';

function MenuCard({ item, index }) {
  const icons = ['☕', '🍵', '🥤', '🧋', '🍶', '🫖', '🥛', '🍹'];
  const icon = icons[index % icons.length];
  
  const itemName = item?.name || 'Unknown Item';
  const itemAvailable = item?.available ?? false;
  const itemPrice = item?.price || 0;

  return (
    <div
      className={`menu-card fade-in ${!itemAvailable ? 'unavailable' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      id={`menu-item-${itemName.toLowerCase().replace(/\s+/g, '-')}`}
      data-mcp-core="MenuCard"
    >
      <div className="card-top">
        <div className="card-icon">{icon}</div>
        <span className={`availability-badge ${itemAvailable ? 'available' : 'unavailable'}`}>
          {itemAvailable ? '● Available' : '● Sold Out'}
        </span>
      </div>
      <div className="card-name">{itemName}</div>
      <div className="card-price">
        <span className="currency">₹</span>{itemPrice}
      </div>
    </div>
  );
}

export default MenuCard;
