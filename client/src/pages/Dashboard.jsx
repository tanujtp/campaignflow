import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, BarChart3, Users, Play, Pause } from 'lucide-react';

const API_BASE = '/api';

export default function Dashboard() {
  const [status, setStatus] = useState({ connected: false, email: null });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000); // Poll campaigns
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/oauth/status`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns`);
      const data = await res.json();
      setCampaigns(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    }
  };

  const handleConnect = async () => {
    const res = await fetch(`${API_BASE}/oauth/url`);
    const { url } = await res.json();
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    await fetch(`${API_BASE}/oauth/disconnect`, { method: 'POST' });
    fetchStatus();
  };

  const toggleCampaignStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'running' ? 'paused' : 'running';
    await fetch(`${API_BASE}/campaigns/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchCampaigns();
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p className="text-secondary">Manage your email campaigns and view analytics.</p>
        </div>
        
        <div className="card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {status.connected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} color="var(--success-color)" />
                <span style={{ fontWeight: 500 }}>{status.email}</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleDisconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} color="var(--warning-color)" />
                <span className="text-secondary">Gmail not connected</span>
              </div>
              <button className="btn btn-primary" onClick={handleConnect}>Connect Gmail</button>
            </>
          )}
        </div>
      </header>

      {/* Overview Metrics */}
      <div className="dashboard-grid stagger-1">
        <div className="metric-card">
          <div className="metric-label"><BarChart3 size={16} /> Total Campaigns</div>
          <div className="metric-value">{campaigns.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label"><Users size={16} /> Total Recipients</div>
          <div className="metric-value">{campaigns.reduce((acc, c) => acc + c.total_recipients, 0)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label"><Mail size={16} /> Emails Sent</div>
          <div className="metric-value">{campaigns.reduce((acc, c) => acc + c.sent_count + c.opened_count + c.replied_count, 0)}</div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="card stagger-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Recent Campaigns</h2>
          <Link to="/campaigns/new" className="btn btn-primary">
            Create Campaign
          </Link>
        </div>

        {loading ? (
          <p className="text-muted">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }} className="glass-panel">
            <Mail size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No campaigns yet</h3>
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Create your first campaign to start sending.</p>
            <Link to="/campaigns/new" className="btn btn-primary">Get Started</Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Opens</th>
                  <th>Replies</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const sentTotal = c.sent_count + c.opened_count + c.replied_count;
                  const progress = c.total_recipients > 0 ? Math.round((sentTotal / c.total_recipients) * 100) : 0;
                  const openRate = sentTotal > 0 ? Math.round((c.opened_count + c.replied_count) / sentTotal * 100) : 0;
                  const replyRate = sentTotal > 0 ? Math.round((c.replied_count) / sentTotal * 100) : 0;
                  
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/campaigns/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link>
                        <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Created {new Date(c.created_at).toLocaleDateString()}</div>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'running' ? 'badge-primary' : c.status === 'completed' ? 'badge-success' : 'badge-neutral'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-gradient)' }}></div>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{progress}%</span>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          {sentTotal} / {c.total_recipients} sent
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{openRate}%</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{c.opened_count + c.replied_count} opens</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--success-color)' }}>{replyRate}%</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{c.replied_count} replies</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {c.status !== 'completed' && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 0.6rem' }}
                              onClick={() => toggleCampaignStatus(c.id, c.status)}
                              title={c.status === 'running' ? 'Pause' : 'Start'}
                            >
                              {c.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
