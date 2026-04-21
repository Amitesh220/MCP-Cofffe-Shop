import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 transition-transform transform hover:scale-105">Welcome to Our Coffee Shop</h1>
        <p className="text-lg md:text-xl mb-8">Experience the best coffee in town, brewed just for you.</p>
        <a href="#" className="btn btn-primary bg-e94560 text-slate-100 hover:bg-e94560/80 transition duration-300 py-2 px-4 rounded">Order Now</a>
      </div>
    </section>
  );
};

export default HeroSection;