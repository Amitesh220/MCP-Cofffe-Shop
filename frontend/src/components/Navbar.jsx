import React from 'react';
import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="logo-icon">☕</span>
          <span>AI Coffee Shop</span>
        </NavLink>
        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            id="nav-menu"
          >
            Menu
          </NavLink>
          <NavLink
            to="/order"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            id="nav-order"
          >
            Order
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            id="nav-admin"
          >
            Admin
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
