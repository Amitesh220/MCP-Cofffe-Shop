import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 transition-transform transform hover:scale-105">Welcome to Our Coffee Shop</h1>
        <p className="text-lg md:text-2xl mb-8 transition-opacity duration-300 hover:opacity-80">Brewing the best coffee in town, one cup at a time.</p>
        <a href="#menu" className="btn btn-primary py-2 px-4 rounded-lg transition-colors duration-300 hover:bg-e94560">Explore Menu</a>
      </div>
    </section>
  );
};

export default HeroSection;