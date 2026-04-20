import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Navbar from './components/Navbar';
import MenuPage from './components/MenuPage';
import MenuCard from './components/MenuCard';
import OrderPage from './components/OrderPage';
import AdminPanel from './components/AdminPanel';

// Prevent tree-shaking by creating a constant array referencing all core components
const CORE_COMPONENTS = [Navbar, MenuPage, MenuCard, OrderPage, AdminPanel];

function App() {
  return (
    <Router>
      {/* ═══ PROTECTED ZONE: CORE LAYOUT ═══ DO NOT MODIFY ═══ */}
      <div data-mcp-core="Navbar">
        <Navbar />
      </div>
      <div className="page-wrapper">
        <Routes>
          <Route path="/" element={<div data-mcp-core="MenuPage"><MenuPage /></div>} />
          <Route path="/order" element={<div data-mcp-core="OrderPage"><OrderPage /></div>} />
          <Route path="/admin" element={<div data-mcp-core="AdminPanel"><AdminPanel /></div>} />
        </Routes>
      </div>
      {/* ═══ END PROTECTED ZONE ═══ */}

      {/* ═══ AI INJECTION ZONE: New components go here ═══ */}
      <div id="ai-generated-root">
      </div>
      {/* ═══ END AI INJECTION ZONE ═══ */}

      {/* FORCE COMPONENT BUNDLING FOR MCP TESTS — DO NOT REMOVE */}
      <div style={{ display: "none" }} id="hidden-components-container" data-mcp-core="HiddenContainer">
        <MenuPage />
        <MenuCard data-mcp-core="MenuCard" />
        <OrderPage />
        <AdminPanel />
        <Navbar />
      </div>
    </Router>
  );
}

export default App;
