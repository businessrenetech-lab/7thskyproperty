import React, { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, Trash2, AlertCircle, Download } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const CATEGORIES = ['contract', 'id', 'certificate', 'tax', 'other'];
const CAT_COLORS = { contract: '#00D4FF', id: '#00FF94', certificate: '#FFB347', tax: '#9B6DFF', other: '#777' };

const StaffDocuments = () => {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_id: '', title: '', category: 'other', expiry_date: '', notes: '', file: null });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, staffRes, expRes] = await Promise.all([
        api.get('/hrm/documents'),
        api.get('/payroll/staff'),
        api.get('/hrm/documents/expiring'),
      ]);
      setDocs(docsRes.data);
      setStaff(staffRes.data);
      setExpiring(expRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (form[key]) formData.append(key, form[key]);
      });
      
      await api.post('/hrm/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      setForm({ user_id: '', title: '', category: 'other', expiry_date: '', notes: '', file: null });
      fetchData();
    } catch (err) { toast.error('Failed to upload document'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await api.delete(`/hrm/documents/${id}`); fetchData(); }
    catch (err) { toast.error('Failed'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={24} /> Document Vault</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Contracts, IDs, certificates, and compliance docs</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Upload Document</button>
      </div>

      {/* Expiring alerts */}
      {expiring.length > 0 && (
        <div className="glass-morphism" style={{ padding: '1rem', borderLeft: '4px solid #FFB347' }}>
          <h4 style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}><AlertCircle size={16} color="#FFB347" /> Expiring Documents ({expiring.length})</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {expiring.map(d => (
              <span key={d.id} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', background: 'rgba(255,179,71,0.1)', color: '#FFB347' }}>
                {d.Staff?.name}: {d.title} (expires {d.expiry_date})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="glass-morphism" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              <th style={{ padding: '1rem', textAlign: 'left', paddingLeft: '2rem' }}>Document</th>
              <th style={{ padding: '1rem' }}>Category</th>
              <th style={{ padding: '1rem' }}>Expiry</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>No documents uploaded</td></tr>
            ) : Object.entries(docs.reduce((acc, doc) => {
                  const name = doc.Staff?.name || 'Unknown Staff';
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(doc);
                  return acc;
                }, {})).map(([staffName, staffDocs]) => (
              <React.Fragment key={staffName}>
                {/* Staff Group Header */}
                <tr style={{ background: 'var(--glass)', borderBottom: '1px solid var(--border)' }}>
                  <td colSpan={4} style={{ padding: '0.8rem 1rem', fontWeight: '700', fontSize: '0.9rem', color: 'var(--primary)' }}>
                    {staffName} 
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                      ({staffDocs.length} {staffDocs.length === 1 ? 'document' : 'documents'})
                    </span>
                  </td>
                </tr>
                {/* Individual Documents */}
                {staffDocs.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', paddingLeft: '2rem' }}>{d.title}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', background: `${CAT_COLORS[d.category]}15`, color: CAT_COLORS[d.category] }}>{d.category}</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{d.expiry_date || 'N/A'}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', justifyContent: 'center' }}>
                        {d.file_url && (
                          <a href={d.file_url.startsWith('http') ? d.file_url : `http://localhost:5000${d.file_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', cursor: 'pointer' }} title="Download File">
                            <Download size={16} />
                          </a>
                        )}
                        <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Upload Document">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Staff Member</label>
            <select className="glass-input" required value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Select...</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Document Title</label><input className="glass-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Employment Contract" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Category</label>
              <select className="glass-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Expiry Date</label><input type="date" className="glass-input" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Upload File</label><input type="file" className="glass-input" required onChange={e => setForm({ ...form, file: e.target.files[0] })} /></div>
          <div className="form-group"><label>Notes</label><textarea className="glass-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Upload</button>
        </form>
      </Modal>
    </div>
  );
};

export default StaffDocuments;
