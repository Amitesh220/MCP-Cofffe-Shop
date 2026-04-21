import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 transition-all duration-300 hover:text-accent">
          Welcome to Our Coffee Shop
        </h1>
        <p className="text-lg md:text-xl mb-8 transition-all duration-300 hover:text-slate-300">
          Freshly brewed coffee and delightful pastries await you!
        </p>
        <a href="#menu" className="btn btn-primary transition-all duration-300 hover:bg-accent">
          Explore the Menu
        </a>
      </div>
    </section>
  );
};

export default HeroSection;