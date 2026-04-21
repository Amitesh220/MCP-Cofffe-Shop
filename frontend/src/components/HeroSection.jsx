import React from 'react';

const HeroSection = () => {
  return (
    <section className="hero">
      <h1>Welcome to Our Coffee Shop</h1>
      <p>Discover the best coffee in town, brewed with love and powered by AI.</p>
      <div className="ai-badge">
        <div className="pulse"></div>
        AI-Powered · Fresh Daily
      </div>
      <a href="#menu-section" className="btn btn-primary" style={{ marginTop: '2rem', display: 'inline-block' }}>
        View Menu
      </a>
    </section>
  );
};

export default HeroSection;