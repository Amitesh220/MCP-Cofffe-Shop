import React from 'react';

const HeroSection = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <div className="pulse"></div>
            <span>✨ AI-Powered Coffee Experience</span>
          </div>

          <h1 className="hero-title">
            Welcome to Our
            <span className="hero-title-accent"> Premium </span>
            Coffee Shop
          </h1>


          <h1 className="hero-title">
            Hi, this is            <span className="hero-title-accent"> working! </span>
            Coffee Shop
          </h1>


          <p className="hero-description">
            Discover the finest artisanal coffee, expertly brewed with passion and powered by cutting-edge AI technology.
            Every cup tells a story of quality, innovation, and exceptional taste.
          </p>
          <p className="hero-working-message" style={{ fontWeight: 'bold' }}>
            Hi, this is working!
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">☕</span>
              <span>Premium Beans</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>AI-Curated Menu</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Lightning Fast</span>
            </div>
          </div>

          <div className="hero-actions">
            <a href="#menu-section" className="btn btn-primary hero-cta">
              Explore Our Menu
              <span className="btn-arrow">→</span>
            </a>
            <a href="#about" className="btn btn-secondary">
              Learn More
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-placeholder">
            <div className="coffee-cup">
              <div className="steam"></div>
              <div className="cup-body"></div>
            </div>
            <div className="floating-elements">
              <div className="floating-bean bean-1">☕</div>
              <div className="floating-bean bean-2">🫘</div>
              <div className="floating-bean bean-3">✨</div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-stats">
        <div className="stat-item">
          <span className="stat-number">500+</span>
          <span className="stat-label">Happy Customers</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">50+</span>
          <span className="stat-label">Premium Blends</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">24/7</span>
          <span className="stat-label">AI Support</span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
