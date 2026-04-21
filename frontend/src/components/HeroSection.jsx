import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4 transition duration-300 hover:text-accent">
          Welcome to Our Coffee Shop
        </h1>
        <p className="text-lg mb-8 transition duration-300 hover:text-slate-300">
          Discover the finest coffee and pastries crafted with love.
        </p>
        <a href="#menu" className="btn btn-primary transition duration-300 hover:bg-accent">
          View Menu
        </a>
      </div>
    </section>
  );
};

export default HeroSection;