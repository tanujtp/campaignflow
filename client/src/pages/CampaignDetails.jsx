import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, XCircle, MailOpen, CornerUpLeft, Monitor, Smartphone } from 'lucide-react';

const API_BASE = '/api';

export default function CampaignDetails() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState('web');

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}`);
      const data = await res.json();
      setCampaign(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch campaign details', err);
    }
  };

  if (loading) {
    return <div className="text-muted">Loading campaign details...</div>;
  }

  if (!campaign) {
    return <div className="text-muted">Campaign not found.</div>;
  }

  const { recipients } = campaign;
  const total = recipients.length;
  const sent = recipients.filter(r => ['sent', 'opened', 'replied'].includes(r.status)).length;
  const opened = recipients.filter(r => ['opened', 'replied'].includes(r.status)).length;
  const replied = recipients.filter(r => r.status === 'replied').length;
  const failed = recipients.filter(r => r.status === 'failed').length;

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'queued': return <Clock size={16} className="text-muted" />;
      case 'sent': return <CheckCircle size={16} color="var(--accent-color)" />;
      case 'opened': return <MailOpen size={16} color="var(--warning-color)" />;
      case 'replied': return <CornerUpLeft size={16} color="var(--success-color)" />;
      case 'failed': return <XCircle size={16} color="var(--error-color)" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'queued': return 'badge-neutral';
      case 'sent': return 'badge-primary';
      case 'opened': return 'badge-warning';
      case 'replied': return 'badge-success';
      case 'failed': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Helper to render preview with dummy data for the details view
  const renderPreview = (template) => {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, field) => {
      return `[${field.trim()}]`;
    });
  };

  return (
    <div className="animate-fade-in">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        <ArrowLeft size={18} /> Back to Dashboard
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{campaign.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className={`badge ${campaign.status === 'running' ? 'badge-primary' : campaign.status === 'completed' ? 'badge-success' : 'badge-neutral'}`}>
              {campaign.status}
            </span>
            <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
              Subject: "{campaign.template_subject}"
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid stagger-1">
        <div className="metric-card">
          <div className="metric-label">Delivery Rate</div>
          <div className="metric-value" style={{ color: 'var(--accent-color)' }}>
            {total > 0 ? Math.round((sent / total) * 100) : 0}%
          </div>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{sent} / {total} emails</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Open Rate</div>
          <div className="metric-value" style={{ color: 'var(--warning-color)' }}>
            {sent > 0 ? Math.round((opened / sent) * 100) : 0}%
          </div>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{opened} opens</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Reply Rate</div>
          <div className="metric-value" style={{ color: 'var(--success-color)' }}>
            {sent > 0 ? Math.round((replied / sent) * 100) : 0}%
          </div>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{replied} replies</div>
        </div>
      </div>

      {/* Template Preview Section */}
      <div className="card stagger-2" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Template Preview</h2>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px', gap: '0.25rem' }}>
            <button 
              className="btn" 
              style={{ 
                padding: '0.25rem 0.75rem', 
                fontSize: '0.85rem', 
                backgroundColor: previewMode === 'web' ? 'var(--surface-hover)' : 'transparent',
                color: previewMode === 'web' ? 'white' : 'var(--text-secondary)'
              }}
              onClick={() => setPreviewMode('web')}
            >
              <Monitor size={14} style={{ marginRight: '0.25rem' }}/> Web
            </button>
            <button 
              className="btn" 
              style={{ 
                padding: '0.25rem 0.75rem', 
                fontSize: '0.85rem', 
                backgroundColor: previewMode === 'mobile' ? 'var(--surface-hover)' : 'transparent',
                color: previewMode === 'mobile' ? 'white' : 'var(--text-secondary)'
              }}
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone size={14} style={{ marginRight: '0.25rem' }}/> Mobile
            </button>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#ffffff', 
          color: '#000000',
          borderRadius: '8px', 
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          width: previewMode === 'mobile' ? '375px' : '100%',
          margin: '0 auto',
          transition: 'width 0.3s ease',
          height: '400px'
        }}>
          {/* Fake Email Header */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#475569', fontSize: '0.85rem' }}>To:</strong> [email]
            </div>
            <div>
              <strong style={{ color: '#475569', fontSize: '0.85rem' }}>Subject:</strong> {renderPreview(campaign.template_subject)}
            </div>
          </div>
          
          {/* Email Body */}
          <div 
            style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', fontSize: '0.95rem' }}
            dangerouslySetInnerHTML={{ __html: renderPreview(campaign.template_body) }}
          />
        </div>
      </div>

      <div className="card stagger-3">
        <h2 style={{ marginBottom: '1.5rem' }}>Recipients Log</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Last Opened</th>
                <th>Replied At</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.email}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StatusIcon status={r.status} />
                      <span className={`badge ${getStatusBadge(r.status)}`} style={{ fontSize: '0.7rem' }}>
                        {r.status}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted">{formatDate(r.sent_at)}</td>
                  <td className="text-muted">{formatDate(r.opened_at)}</td>
                  <td className="text-muted">{formatDate(r.replied_at)}</td>
                  <td>
                    {r.status === 'failed' && (
                      <span className="text-secondary" style={{ fontSize: '0.8rem' }} title={r.error_reason}>
                        {r.error_reason?.substring(0, 30)}...
                      </span>
                    )}
                    {r.status === 'replied' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success-color)' }}>
                        Reply captured
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
