import { useState, useEffect } from 'react';
import { Save, Key, Link as LinkIcon, Info } from 'lucide-react';

const API_BASE = '/api';

export default function Settings() {
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/env`);
      const data = await res.json();
      setConfig(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch settings', err);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/settings/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret
        })
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully! You can now connect your Gmail.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-muted">Loading settings...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Settings</h1>
        <p className="text-secondary">Configure your Google OAuth Application to enable Gmail sending.</p>
      </header>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          color: message.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Info size={18} />
          <span style={{ fontWeight: 500 }}>{message.text}</span>
        </div>
      )}

      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={20} color="var(--accent-color)" /> Google Cloud Credentials
        </h2>
        <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          To send emails, you must create a free Google Cloud project and generate an OAuth 2.0 Client ID. 
          See the README for step-by-step instructions.
        </p>

        <div className="form-group">
          <label className="form-label">Client ID</label>
          <input 
            type="text" 
            className="form-control" 
            value={config.clientId} 
            onChange={e => setConfig({ ...config, clientId: e.target.value })} 
            placeholder="e.g. 123456789-abcde.apps.googleusercontent.com"
          />
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label">Client Secret</label>
          <input 
            type="password" 
            className="form-control" 
            value={config.clientSecret} 
            onChange={e => setConfig({ ...config, clientSecret: e.target.value })} 
            placeholder="Enter your Client Secret"
          />
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed var(--border-color)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LinkIcon size={16} /> Authorized Redirect URI
          </h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            You must add exactly this URL to the "Authorized redirect URIs" section in your Google Cloud OAuth Client configuration.
          </p>
          <code style={{ 
            display: 'block', 
            padding: '0.75rem 1rem', 
            backgroundColor: 'rgba(0,0,0,0.4)', 
            borderRadius: '6px',
            color: 'var(--accent-color)',
            fontFamily: 'monospace',
            userSelect: 'all'
          }}>
            {config.redirectUri}
          </code>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
