import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4 transition-all duration-300 hover:text-accent">Welcome to Our Coffee Shop</h1>
        <p className="text-lg mb-8">Experience the best coffee in town, brewed with love and passion.</p>
        <a href="/order" className="btn btn-primary transition-all duration-300 hover:bg-accent">Order Now</a>
      </div>
    </section>
  );
};

export default HeroSection;