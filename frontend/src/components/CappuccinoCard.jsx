import React from 'react';

const CappuccinoCard = () => {
  return (
    <div className="menu-card bg-slate-800 border border-slate-700 rounded-lg shadow-lg transition-transform transform hover:scale-105 p-4">
      <h2 className="text-xl font-bold text-slate-100">Cappuccino</h2>
      <p className="text-slate-300">A rich and creamy coffee drink made with espresso and steamed milk.</p>
      <button className="btn btn-primary mt-4">Order Now</button>
    </div>
  );
};

export default CappuccinoCard;