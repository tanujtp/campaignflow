import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Code, Play, Download, Image as ImageIcon, Monitor, Smartphone } from 'lucide-react';

const API_BASE = '/api';

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Hello {{name}}');
  const [body, setBody] = useState('<p>Hi {{name}},</p>\n<p>I noticed your work at {{company}} and wanted to connect.</p>\n<p>Best,<br/>Founder</p>');
  const [pacing, setPacing] = useState(3);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewMode, setPreviewMode] = useState('web');
  
  // Preview data extracted from the first row of uploaded CSV
  const [previewData, setPreviewData] = useState({ name: 'Jane Doe', company: 'Acme Corp', email: 'jane@example.com' });
  const imageInputRef = useRef(null);

  // Generate CSV Template download
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,email,company\nJane Doe,jane@example.com,Acme Corp\nJohn Smith,john@example.com,Global Tech";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "campaign_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Read first two lines to extract preview data
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length >= 2) {
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const firstRow = lines[1].split(',').map(v => v.trim());
          
          const newData = {};
          headers.forEach((header, index) => {
            if (firstRow[index]) {
              newData[header] = firstRow[index];
            }
          });
          setPreviewData(newData);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImageUpload = async (e) => {
    const imgFile = e.target.files && e.target.files[0];
    if (!imgFile) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', imgFile);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        // Append image to the body
        setBody(prev => prev + `\n<img src="${data.url}" alt="Image" style="max-width: 100%; height: auto;" />`);
      } else {
        alert(data.error || "Failed to upload image");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image");
    } finally {
      setUploadingImage(false);
      // Reset input
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!file || !name || !subject || !body) {
      alert("Please fill all fields and upload a CSV.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('name', name);
    formData.append('subject', subject);
    formData.append('body', body);
    formData.append('pacingSeconds', pacing);

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.error) {
        alert("Error: " + data.error);
        setLoading(false);
      } else {
        // Automatically start the campaign for V1 simplicity
        await fetch(`${API_BASE}/campaigns/${data.campaignId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'running' })
        });
        
        navigate(`/campaigns/${data.campaignId}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create campaign");
      setLoading(false);
    }
  };

  // Helper to render preview with dummy/csv data
  const renderPreview = (template) => {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, field) => {
      const key = field.trim().toLowerCase();
      // Case-insensitive match for the field
      const valueKey = Object.keys(previewData).find(k => k.toLowerCase() === key);
      return valueKey ? previewData[valueKey] : `[${field.trim()}]`;
    });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: step === 1 ? '800px' : '100%', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Create Campaign</h1>
      
      {/* Step 1: Basics & CSV */}
      <div className="card glass-panel" style={{ display: step === 1 ? 'block' : 'none' }}>
        <h2>1. Setup & Recipients</h2>
        
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label className="form-label">Campaign Name</label>
          <input 
            type="text" 
            className="form-control" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g., Q3 Founder Outreach"
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Upload CSV (must contain 'email' column)</label>
            <button 
              onClick={handleDownloadTemplate} 
              className="btn" 
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'transparent', color: 'var(--accent-color)' }}
            >
              <Download size={14} /> Download Template
            </button>
          </div>
          <div 
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('csv-upload').click()}
          >
            <Upload size={32} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
            <p style={{ fontWeight: 500 }}>{file ? file.name : 'Click to select CSV file'}</p>
            <input 
              id="csv-upload"
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
          </div>
          {file && (
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Preview data loaded: {Object.keys(previewData).join(', ')}
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Pacing (seconds between emails)</label>
          <input 
            type="number" 
            className="form-control" 
            value={pacing} 
            onChange={e => setPacing(e.target.value)} 
            min="1"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!file || !name}>
            Next: Write Email
          </button>
        </div>
      </div>

      {/* Step 2: Template (Side-by-Side Layout) */}
      <div style={{ display: step === 2 ? 'block' : 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Left: Editor */}
          <div className="card glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>2. Email Template</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                />
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  onClick={() => imageInputRef.current.click()}
                  disabled={uploadingImage}
                >
                  <ImageIcon size={14} /> {uploadingImage ? 'Uploading...' : 'Insert Image'}
                </button>
                <div className="badge badge-primary"><Code size={14} style={{ marginRight: '0.2rem' }}/> HTML Supported</div>
              </div>
            </div>
            
            <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Use {"{{column_name}}"} to insert variables from your CSV.
            </p>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input 
                type="text" 
                className="form-control" 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">HTML Body</label>
              <textarea 
                className="form-control" 
                style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                value={body} 
                onChange={e => setBody(e.target.value)} 
              />
            </div>
          </div>

          {/* Right: Preview */}
          <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Live Preview</h2>
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
              flex: 1,
              backgroundColor: '#ffffff', 
              color: '#000000',
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              width: previewMode === 'mobile' ? '375px' : '100%',
              margin: '0 auto',
              transition: 'width 0.3s ease'
            }}>
              {/* Fake Email Header */}
              <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#475569', fontSize: '0.85rem' }}>To:</strong> {previewData.email || '[email]'}
                </div>
                <div>
                  <strong style={{ color: '#475569', fontSize: '0.85rem' }}>Subject:</strong> {renderPreview(subject)}
                </div>
              </div>
              
              {/* Email Body */}
              <div 
                style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', fontSize: '0.95rem' }}
                dangerouslySetInnerHTML={{ __html: renderPreview(body) }}
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={() => setStep(1)}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Launching...' : <><Play size={18} /> Launch Campaign</>}
          </button>
        </div>
      </div>
    </div>
  );
}
