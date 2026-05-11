import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Upload, Download, CheckSquare, Square, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { inputStyle, stageColors, stageLabels, stageIcons } from './CRMComponents';
import { useToast } from '../../context/ToastContext';

const ContactsTab = ({ contacts, onRefresh }) => {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', source: 'Walk-in', notes: '' });
  const [saving, setSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [sourceSavingId, setSourceSavingId] = useState(null);
  
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Bulk features state
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkActionStage, setBulkActionStage] = useState('');

  const leadStages = ['new', 'contacted', 'interested', 'trial', 'enrolled', 'fees_pending', 'payment_rejected', 'successful', 'lost'];
  const sources = [...new Set(contacts.map(c => c.source).filter(Boolean))];
  const sourceOptions = [...new Set(['Walk-in', 'Facebook', 'Instagram', 'WhatsApp', 'Referral', 'Website Enquiry', 'Website Purchase', 'Trial Class Booking', 'Other', ...sources])];

  const filtered = contacts.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.email?.toLowerCase().includes(search.toLowerCase()) && !c.phone?.includes(search)) return false;
    if (sourceFilter && c.source !== sourceFilter) return false;
    if (leadStatusFilter) {
      if (leadStatusFilter === 'None') {
        if (c.CurrentLead) return false;
      } else {
        if (!c.CurrentLead || c.CurrentLead.status !== leadStatusFilter) return false;
      }
    }
    return true;
  });

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', company: '', source: 'Walk-in', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editingId) {
        await api.put(`/crm/contacts/${editingId}`, form);
      } else {
        await api.post('/crm/contacts', form);
      }
      resetForm(); onRefresh();
    } catch { toast.error('Failed to save contact'); }
    finally { setSaving(false); }
  };

  const startEdit = (c) => {
    setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', company: c.company || '', source: c.source || 'Walk-in', notes: c.notes || '' });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/crm/contacts/${id}`); setConfirmDelete(null); onRefresh(); }
    catch { toast.error('Failed to delete'); }
  };

  const updateLeadPosition = async (contact, status) => {
    if (!contact.CurrentLead?.id) return;
    setStatusSavingId(contact.id);
    try {
      await api.patch(`/crm/leads/${contact.CurrentLead.id}/status`, { status });
      onRefresh();
    } catch {
      toast.error('Failed to update pipeline position');
    } finally {
      setStatusSavingId(null);
    }
  };

  const updateLeadSource = async (contact, source) => {
    if ((contact.source || '') === source && (contact.CurrentLead?.source || source) === source) return;
    setSourceSavingId(contact.id);
    try {
      await api.put(`/crm/contacts/${contact.id}`, { source });
      if (contact.CurrentLead?.id) {
        await api.put(`/crm/leads/${contact.CurrentLead.id}`, { source });
      }
      onRefresh();
    } catch {
      toast.error('Failed to update lead source');
    } finally {
      setSourceSavingId(null);
    }
  };

  // Bulk Actions
  const toggleSelection = (id) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedContacts.length === filtered.length && filtered.length > 0) setSelectedContacts([]);
    else setSelectedContacts(filtered.map(c => c.id));
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkActionStage) { toast.warning('Select a stage first'); return; };
    setSaving(true);
    try {
      await api.patch('/crm/contacts/bulk-status', { contactIds: selectedContacts, status: bulkActionStage });
      setSelectedContacts([]); onRefresh();
    } catch { toast.error('Failed to update bulk status'); }
    finally { setSaving(false); setBulkActionStage(''); }
  };

  // CSV Upload
  const downloadSampleCSV = () => {
    const url = window.URL.createObjectURL(new Blob(['Name,Phone,Email,Source,Notes\nJane Doe,0170000000,jane@example.com,Facebook,Interested in PTE'], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'sample_contacts.csv'; a.click();
  };

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) { toast.warning('Please select a file to upload'); return; };
    setBulkUploading(true);
    try {
      const fileText = await bulkFile.text();
      const rows = fileText.split('\n').filter(r => r.trim());
      if (rows.length < 2) throw new Error('File must contain at least one data row and headers.');
      
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const payload = [];
      
      for(let i = 1; i < rows.length; i++) {
        // Simple CSV parse. (Fails on commas inside quotes, but fine for basic names/phones)
        const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = cols[idx]; });
        if (obj.name) payload.push(obj);
      }
      
      const res = await api.post('/crm/contacts/bulk-upload', { contacts: payload });
      toast.success('Contacts imported: ' + res.data.message);
      setShowBulkUpload(false); setBulkFile(null); onRefresh();
    } catch (e) { toast.error(e.message || 'Failed to upload contacts'); }
    finally { setBulkUploading(false); }
  };

  const gridStyle = { 
    display: 'grid', 
    gridTemplateColumns: '40px 1.7fr 1.1fr 1.5fr 1fr 1fr 0.9fr 1.25fr 0.7fr', 
    gap: '0.4rem', 
    padding: '0.6rem 1rem', 
    alignItems: 'center' 
  };

  return (
    <div>
      <style>{`
        .crm-contacts-table-wrap { overflow-x: auto; }
        .crm-contacts-table-grid { min-width: 980px; }
        .crm-contact-cards { display: none; }
        @media (max-width: 820px) {
          .crm-contacts-header { align-items: stretch !important; flex-direction: column; gap: 0.75rem; }
          .crm-contacts-actions { width: 100%; display: grid !important; grid-template-columns: 1fr 1fr; }
          .crm-contacts-actions button { justify-content: center; }
          .crm-contacts-filters { flex-direction: column; align-items: stretch !important; }
          .crm-contacts-filters > div,
          .crm-contacts-filters > select,
          .crm-contacts-filters > button { width: 100% !important; max-width: none !important; }
          .crm-contacts-search-wrap { flex: none !important; height: auto !important; min-height: 0 !important; }
          .crm-contacts-table-wrap { display: none; }
          .crm-contact-cards { display: grid; gap: 0.75rem; }
          .crm-contact-form { grid-template-columns: 1fr !important; }
          .crm-bulk-bar { left: 1rem !important; right: 1rem !important; bottom: 5.25rem !important; transform: none !important; flex-wrap: wrap; justify-content: space-between; }
        }
      `}</style>

      {/* Header */}
      <div className="crm-contacts-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.15rem' }}>Contact Directory</h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{filtered.length} of {contacts.length} contacts</p>
        </div>
        <div className="crm-contacts-actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => setShowBulkUpload(s => !s)} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', padding: '0.48rem 0.85rem', borderRadius: '8px', color: 'var(--text)' }}>
            <Upload size={16} /> Bulk Upload
          </button>
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(s => !s); }} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.9rem' }}>
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Floating Action Bar for Bulk Selecting */}
      {selectedContacts.length > 0 && (
        <div className="crm-bulk-bar" style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.8rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', zIndex: 1000, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>{selectedContacts.length} Selected</span>
          <div style={{ height: '24px', width: '1px', background: 'var(--border)' }}></div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Action:</span>
            <select value={bulkActionStage} onChange={e => setBulkActionStage(e.target.value)} style={{ ...inputStyle, padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: '160px' }}>
              <option value="">Update Pipeline Stage</option>
              {leadStages.map(s => <option key={s} value={s}>{stageLabels[s] || s}</option>)}
            </select>
            <button onClick={handleBulkStatusUpdate} disabled={saving || !bulkActionStage} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
              {saving ? 'Saving...' : 'Apply'}
            </button>
          </div>
          <button onClick={() => setSelectedContacts([])} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="crm-contacts-filters" style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', alignItems: 'center' }}>
        <div className="crm-contacts-search-wrap" style={{ position: 'relative', flex: '1 1 280px', maxWidth: '360px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2rem', width: '100%' }} />
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ ...inputStyle, width: '160px' }}>
          <option value="">All Sources</option>
          {sources.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={leadStatusFilter} onChange={e => setLeadStatusFilter(e.target.value)} style={{ ...inputStyle, width: '160px' }}>
          <option value="">All Lead Stages</option>
          <option value="None">No Lead</option>
          {leadStages.map(s => <option key={s} value={s}>{stageLabels[s] || s}</option>)}
        </select>
        {(search || sourceFilter || leadStatusFilter) && (
          <button onClick={() => { setSearch(''); setSourceFilter(''); setLeadStatusFilter(''); }} style={{ padding: '0.5rem 0.8rem', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* CSV Bulk Upload Modal */}
      {showBulkUpload && (
        <div style={{ marginBottom: '1.2rem', padding: '1.5rem', background: 'var(--glass)', border: '1px solid var(--primary)', borderRadius: '12px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}><Upload size={16} color="var(--primary)" /> Bulk Upload Contacts</h4>
            <X size={16} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowBulkUpload(false)} />
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.8rem' }}>Upload a CSV file with the standard headers (Name, Phone, Email, Source, Notes). New Contacts and initial Pipeline Leads will be automatically created.</p>
            <button type="button" onClick={downloadSampleCSV} style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Download Sample CSV
            </button>
          </div>
          <form onSubmit={handleCSVUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input required type="file" accept=".csv" onChange={e => setBulkFile(e.target.files[0])} style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text)' }} />
            <button type="submit" disabled={bulkUploading || !bulkFile} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>{bulkUploading ? 'Uploading...' : 'Upload & Import'}</button>
          </form>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ marginBottom: '1.2rem', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>{editingId ? <><Edit2 size={14} color="var(--primary)" /> Edit Contact</> : <><UserPlus size={14} color="var(--primary)" /> New Contact</>}</h4>
            <X size={16} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={resetForm} />
          </div>
          <form className="crm-contact-form" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem' }}>
            <input required placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
            <input placeholder="Company / Institution" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} style={inputStyle} />
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inputStyle}>
              {sourceOptions.map(s => <option key={s}>{s}</option>)}
            </select>
            <input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={resetForm} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>{saving ? '...' : editingId ? 'Update' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Contact Table */}
      <div className="glass-morphism crm-contacts-table-wrap" style={{ padding: '0.5rem', borderRadius: '12px' }}>
        <div className="crm-contacts-table-grid" style={{ ...gridStyle, fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', fontWeight: '700', letterSpacing: '0.5px' }}>
          <div onClick={toggleAll} style={{ cursor: 'pointer', marginLeft: '5px' }}>
             {selectedContacts.length === filtered.length && filtered.length > 0 ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} />}
          </div>
          <span>Name</span><span>Phone</span><span>Email</span><span>Source</span><span>Company</span><span>Since</span><span>Lead Position</span><span>Actions</span>
        </div>
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem', fontSize: '0.85rem' }}>
            {contacts.length === 0 ? 'No contacts yet. They are auto-created when leads are enrolled.' : 'No contacts match your filters.'}
          </p>
        ) : filtered.map(c => (
          <div key={c.id} className="crm-contacts-table-grid" style={{ ...gridStyle, borderBottom: '1px solid var(--border)', fontSize: '0.82rem', transition: 'background 0.15s', background: selectedContacts.includes(c.id) ? 'var(--glass)' : 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
            onMouseLeave={e => e.currentTarget.style.background = selectedContacts.includes(c.id) ? 'var(--glass)' : 'transparent'}>
            
            {/* Checkbox */}
            <div onClick={() => toggleSelection(c.id)} style={{ cursor: 'pointer', marginLeft: '5px' }}>
              {selectedContacts.includes(c.id) ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-dim)" opacity={0.5} />}
            </div>

            <div>
              <span style={{ fontWeight: '600' }}>{c.name}</span>
              {c.notes && <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>{c.notes.substring(0, 40)}{c.notes.length > 40 ? '...' : ''}</p>}
            </div>
            <span style={{ color: 'var(--text-dim)' }}>{c.phone || '—'}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>{c.email || '—'}</span>
            <select
              value={c.source || ''}
              onChange={(e) => updateLeadSource(c, e.target.value)}
              disabled={sourceSavingId === c.id}
              style={{
                ...inputStyle,
                padding: '0.38rem 0.55rem',
                fontSize: '0.72rem',
                background: 'var(--glass)'
              }}
            >
              <option value="">No source</option>
              {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>{c.company || '—'}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Since {new Date(c.createdAt || c.created_at).toLocaleDateString()}</span>
            <div>
              {c.CurrentLead ? (
                <select
                  value={c.CurrentLead.status}
                  onChange={(e) => updateLeadPosition(c, e.target.value)}
                  disabled={statusSavingId === c.id}
                  style={{
                    ...inputStyle,
                    padding: '0.38rem 0.55rem',
                    fontSize: '0.72rem',
                    color: stageColors[c.CurrentLead.status] || 'var(--text)',
                    borderColor: `${stageColors[c.CurrentLead.status] || '#475569'}55`,
                    background: 'var(--glass)'
                  }}
                >
                  {leadStages.map((stage) => (
                    <option key={stage} value={stage}>{stageLabels[stage] || stage}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>No lead</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button onClick={() => startEdit(c)} style={{ padding: '3px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }} title="Edit">
                <Edit2 size={12} />
              </button>
              {confirmDelete === c.id ? (
                <button onClick={() => handleDelete(c.id)} style={{ padding: '3px 6px', background: '#ef444420', border: '1px solid #ef444440', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', fontSize: '0.6rem', fontWeight: '700' }}>
                  Sure?
                </button>
              ) : (
                <button onClick={() => setConfirmDelete(c.id)} style={{ padding: '3px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }} title="Delete">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="crm-contact-cards">
        {filtered.length === 0 ? (
          <div className="glass-morphism" style={{ padding: '2rem 1rem', borderRadius: '14px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {contacts.length === 0 ? 'No contacts yet. They are auto-created when leads are enrolled.' : 'No contacts match your filters.'}
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="glass-morphism" style={{ padding: '0.9rem', borderRadius: '14px', border: selectedContacts.includes(c.id) ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.65rem', minWidth: 0 }}>
                <button type="button" onClick={() => toggleSelection(c.id)} style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: selectedContacts.includes(c.id) ? 'var(--primary)' : 'var(--text-dim)' }}>
                  {selectedContacts.includes(c.id) ? <CheckSquare size={17} /> : <Square size={17} />}
                </button>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.25rem' }}>{c.name}</p>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={c.source || ''}
                      onChange={(e) => updateLeadSource(c, e.target.value)}
                      disabled={sourceSavingId === c.id}
                      style={{ ...inputStyle, width: '150px', padding: '0.45rem 0.55rem', fontSize: '0.72rem', background: 'var(--glass)' }}
                    >
                      <option value="">No source</option>
                      {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                    </select>
                    {c.company && <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{c.company}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button onClick={() => startEdit(c)} style={{ padding: '5px 7px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }} title="Edit">
                  <Edit2 size={13} />
                </button>
                {confirmDelete === c.id ? (
                  <button onClick={() => handleDelete(c.id)} style={{ padding: '5px 7px', background: '#ef444420', border: '1px solid #ef444440', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontSize: '0.65rem', fontWeight: 800 }}>
                    Sure?
                  </button>
                ) : (
                  <button onClick={() => setConfirmDelete(c.id)} style={{ padding: '5px 7px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }} title="Delete">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              <span><strong style={{ color: 'var(--text)' }}>Phone:</strong> {c.phone || '—'}</span>
              <span><strong style={{ color: 'var(--text)' }}>Email:</strong> {c.email || '—'}</span>
              <span><strong style={{ color: 'var(--text)' }}>Since:</strong> {new Date(c.createdAt || c.created_at).toLocaleDateString()}</span>
              {c.notes && <span><strong style={{ color: 'var(--text)' }}>Notes:</strong> {c.notes.substring(0, 90)}{c.notes.length > 90 ? '...' : ''}</span>}
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              {c.CurrentLead ? (
                <select
                  value={c.CurrentLead.status}
                  onChange={(e) => updateLeadPosition(c, e.target.value)}
                  disabled={statusSavingId === c.id}
                  style={{ ...inputStyle, padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: stageColors[c.CurrentLead.status] || 'var(--text)', borderColor: `${stageColors[c.CurrentLead.status] || '#475569'}55`, background: 'var(--glass)', width: '100%' }}
                >
                  {leadStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage] || stage}</option>)}
                </select>
              ) : (
                <span style={{ display: 'inline-flex', fontSize: '0.7rem', color: 'var(--text-dim)', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '999px' }}>No lead</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      {contacts.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          {sources.map(s => {
            const count = contacts.filter(c => c.source === s).length;
            return <span key={s} style={{ padding: '3px 8px', background: 'var(--glass)', borderRadius: '6px' }}>{s}: {count}</span>;
          })}
        </div>
      )}
    </div>
  );
};

export default ContactsTab;
