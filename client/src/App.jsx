import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mail, LayoutDashboard, Settings as SettingsIcon, Plus, Send } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CampaignBuilder from './pages/CampaignBuilder';
import CampaignDetails from './pages/CampaignDetails';
import Settings from './pages/Settings';

function Sidebar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
      <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: '8px' }}>
          <Send size={20} color="white" />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Campaignflow CRM</h2>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link to="/" className={`nav-link ${isActive('/')}`} style={navLinkStyle(location.pathname === '/')}>
          <LayoutDashboard size={18} /> Dashboard
        </Link>
        <Link to="/campaigns/new" className={`nav-link ${isActive('/campaigns/new')}`} style={navLinkStyle(location.pathname === '/campaigns/new')}>
          <Plus size={18} /> New Campaign
        </Link>
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        <Link to="/settings" style={{ textDecoration: 'none' }}>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
            <SettingsIcon size={18} /> Settings
          </button>
        </Link>
      </div>
    </aside>
  );
}

const navLinkStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  color: active ? 'white' : 'var(--text-secondary)',
  backgroundColor: active ? 'var(--surface-hover)' : 'transparent',
  fontWeight: 500,
  transition: 'all 0.2s ease',
  textDecoration: 'none'
});

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns/new" element={<CampaignBuilder />} />
            <Route path="/campaigns/:id" element={<CampaignDetails />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
