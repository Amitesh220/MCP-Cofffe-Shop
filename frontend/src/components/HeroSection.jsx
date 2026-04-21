import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 transition duration-300 hover:text-accent">
          Welcome to Our Coffee Shop
        </h1>
        <p className="text-lg md:text-xl mb-8 transition duration-300 hover:text-slate-400">
          Discover the finest coffee and delightful pastries.
        </p>
        <a href="#menu" className="btn btn-primary text-lg py-2 px-4 rounded transition duration-300 hover:bg-accent">
          View Menu
        </a>
      </div>
    </section>
  );
};

export default HeroSection;