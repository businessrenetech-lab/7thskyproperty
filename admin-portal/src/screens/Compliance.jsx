import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, Upload, Trash2, Eye, Plus, FileText, CheckCircle2,
  AlertCircle, Search, Home, Building2, Key, Receipt, Wallet, ClipboardCheck
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field,
  Input, Textarea, Select, KV, Spinner, SearchInput, EmptyState
} from '../ui/kit';

export default function Compliance() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const listingTypeFilter = searchParams.get('listing_type');
  const propertyIdFilter = Number(searchParams.get('property_id') || 0);
  
  // Properties lists
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPropId, setSelectedPropId] = useState(propertyIdFilter || null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Property details & documents log
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Register definition & entries
  const [defs, setDefs] = useState([]);
  const [activeDef, setActiveDef] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Form states
  const [activeDrawer, setActiveDrawer] = useState(null); // 'add_check' | 'upload_doc'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 1. Fetch properties
  const loadProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const { data } = await api.get('/properties?limit=100');
      setProperties(data.data || []);
      
      const filtered = (data.data || []).filter(p => {
        if (categoryFilter && p.category !== categoryFilter) return false;
        if (listingTypeFilter && p.listing_type !== listingTypeFilter) return false;
        return true;
      });

      if (filtered.length && !selectedPropId) {
        setSelectedPropId(filtered[0].id);
      }
    } catch {
      toast.error('Failed to load properties list');
    } finally {
      setLoadingProps(false);
    }
  }, [selectedPropId, categoryFilter, listingTypeFilter, toast]);

  // 2. Fetch register definitions
  useEffect(() => {
    api.get('/registers/definitions')
      .then(({ data }) => {
        const list = data.data || [];
        setDefs(list);
        const verifDef = list.find(d => d.register_key === 'ownership_verification');
        if (verifDef) {
          setActiveDef(verifDef);
        }
      })
      .catch(() => {});
    loadProperties();
  }, [categoryFilter, listingTypeFilter, loadProperties]);

  // 3. Load Selected Property Details (Docs & Registers)
  const loadPropertyDetails = useCallback(async () => {
    if (!selectedPropId) return;
    
    // Find selected property object
    const prop = properties.find(p => p.id === selectedPropId);
    if (prop) setSelectedProperty(prop);

    // Fetch unified documents
    setLoadingDocs(true);
    try {
      const docRes = await api.get(`/properties/${selectedPropId}/documents`);
      setDocs(docRes.data.data || []);
    } catch {
      toast.error('Failed to load property document timeline');
    } finally {
      setLoadingDocs(false);
    }

    // Fetch ownership verification register entries
    if (activeDef) {
      setLoadingEntries(true);
      try {
        const entRes = await api.get(`/registers/entries?register_definition_id=${activeDef.id}&property_id=${selectedPropId}`);
        setEntries(entRes.data.data || []);
      } catch {
        toast.error('Failed to load compliance register entries');
      } finally {
        setLoadingEntries(false);
      }
    }
  }, [selectedPropId, properties, activeDef, toast]);

  useEffect(() => {
    loadPropertyDetails();
  }, [loadPropertyDetails]);

  // Save compliance check
  const saveCheck = async (e) => {
    e.preventDefault();
    if (!activeDef || !selectedPropId) return;
    setSaving(true);
    try {
      const dataPayload = {
        document: form.document,
        required: form.required || 'Yes',
        received: form.received || 'Yes',
        verified: form.verified || 'Pending',
        verification_method: form.verification_method,
        remarks: form.remarks
      };
      
      const payload = {
        register_definition_id: activeDef.id,
        vertical_key: 'rural_rent', // vertical standard for compliance checklist
        property_id: selectedPropId,
        data: dataPayload,
        status: form.verified
      };

      await api.post('/registers/entries', payload);
      toast.success('Compliance checklist item added');
      setActiveDrawer(null);
      loadPropertyDetails();
    } catch (err) {
      toast.error('Failed to save compliance item');
    } finally {
      setSaving(false);
    }
  };

  // Upload Property Document
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPropId) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      toast.info('Uploading document file...');
      const uploadRes = await api.post('/projects/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      const payload = {
        doc_type: form.doc_type || 'deed',
        title: form.title || file.name,
        file_url: uploadRes.data.file_url,
        file_name: uploadRes.data.file_name,
        is_private: true
      };

      await api.post(`/properties/${selectedPropId}/documents`, payload);
      toast.success('Compliance document registered successfully');
      setActiveDrawer(null);
      loadPropertyDetails();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeEntry = async (id) => {
    if (!window.confirm('Remove this checklist verification entry?')) return;
    try {
      await api.delete(`/registers/entries/${id}`);
      toast.success('Checklist item removed');
      loadPropertyDetails();
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  // Filter properties by search term
  const filteredProperties = properties.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (listingTypeFilter && p.listing_type !== listingTypeFilter) return false;

    return p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.property_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.area?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHead
        title="Property Compliance Dashboard"
        desc="Audit property ownership documents, tax clearances, utility status, and view aggregate property records."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'stretch' }}>
        
        {/* Left Side: Property Catalog List */}
        <div className="card card-pad" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>Select Property</h3>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties..."
              style={{ paddingLeft: 28 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 8, top: 10, color: 'var(--muted)' }} />
          </div>

          {loadingProps ? (
            <Spinner />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '600px', overflowY: 'auto' }}>
              {filteredProperties.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPropId(p.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: p.id === selectedPropId ? 'var(--primary-bg)' : 'var(--surface)',
                    color: p.id === selectedPropId ? 'var(--primary)' : 'var(--text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: p.id === selectedPropId ? '3px solid var(--primary)' : '1px solid var(--border)'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div className="between" style={{ marginTop: 4 }}>
                    <span className="code-chip" style={{ fontSize: 10, padding: '2px 4px' }}>{p.property_code}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.area}</span>
                  </div>
                </div>
              ))}
              {!filteredProperties.length && <p className="cell-sub" style={{ textAlign: 'center' }}>No matching properties.</p>}
            </div>
          )}
        </div>

        {/* Right Side: Selected Property Audit Details */}
        <div>
          {selectedProperty ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Property Details Summary Card */}
              <div className="card card-pad" style={{ background: 'var(--surface)', borderLeft: '4px solid var(--success)' }}>
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedProperty.title}</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: 12 }}>{selectedProperty.address}, {selectedProperty.area}, {selectedProperty.city}</p>
                    <div className="row" style={{ marginTop: 8, gap: 12 }}>
                      <Badge tone="blue">{selectedProperty.category.toUpperCase()}</Badge>
                      <Badge tone="grey">{selectedProperty.property_type}</Badge>
                      <StatusBadge status={selectedProperty.status} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Asking / Rent Price</div>
                    <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>৳ {Number(selectedProperty.price || 0).toLocaleString()}</h3>
                    <span className="cell-sub" style={{ fontSize: 11 }}>{selectedProperty.listing_type.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* TWO PANEL AUDIT SYSTEM */}
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'stretch' }}>
                
                {/* 1. Left Sub-panel: Unified Documents Feed */}
                <div className="card card-pad">
                  <div className="between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14 }}>Unified Documents Log</h3>
                    <Button size="xs" icon={Upload} onClick={() => { setForm({ title: '', doc_type: 'deed' }); setActiveDrawer('upload_doc'); }}>Upload File</Button>
                  </div>
                  
                  {loadingDocs ? (
                    <Spinner />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 550, overflowY: 'auto' }}>
                      {docs.map((d, idx) => {
                        const isUploadedFile = d.source === 'upload';
                        const isInvoice = d.source === 'invoice';
                        const isPayment = d.source === 'payment';
                        const isInspection = d.source === 'inspection';
                        
                        return (
                          <div key={d.id || idx} style={{ display: 'flex', gap: 10, padding: 8, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-2)' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: isInvoice ? 'var(--danger-bg)' : isPayment ? 'var(--success-bg)' : isInspection ? 'var(--amber-bg)' : 'var(--primary-bg)',
                              color: isInvoice ? 'var(--danger)' : isPayment ? 'var(--success)' : isInspection ? 'var(--amber)' : 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isInvoice ? <Receipt size={12} /> : isPayment ? <Wallet size={12} /> : isInspection ? <ClipboardCheck size={12} /> : <FileText size={12} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 12, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{d.title}</div>
                              <div className="between" style={{ marginTop: 2 }}>
                                <span className="cell-sub" style={{ fontSize: 10 }}>{new Date(d.date).toLocaleDateString()}</span>
                                {d.file_url ? (
                                  <a href={d.file_url} target="_blank" rel="noreferrer" className="row" style={{ gap: 2, fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>
                                    View <Eye size={10} />
                                  </a>
                                ) : (
                                  <span className="cell-sub" style={{ fontSize: 10, textTransform: 'capitalize' }}>{d.source}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!docs.length && <p className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>No files or invoices logged yet.</p>}
                    </div>
                  )}
                </div>

                {/* 2. Right Sub-panel: Ownership & Compliance Checklist Register */}
                <div className="card card-pad">
                  <div className="between" style={{ marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14 }}>Ownership Verification Checklist</h3>
                    <Button size="xs" icon={Plus} onClick={() => { setForm({ document: 'Deed Registration Copy', required: 'Yes', received: 'Yes', verified: 'Pending' }); setActiveDrawer('add_check'); }}>Add Checklist Item</Button>
                  </div>

                  {loadingEntries ? (
                    <Spinner />
                  ) : (
                    <DataTable
                      columns={[
                        { key: 'document', header: 'Verify Item', render: (r) => <b style={{ fontSize: 12 }}>{r.data.document}</b> },
                        { key: 'required', header: 'Required?', render: (r) => <span style={{ fontSize: 11 }}>{r.data.required}</span> },
                        { key: 'received', header: 'Received?', render: (r) => <span style={{ fontSize: 11 }}>{r.data.received}</span> },
                        { key: 'verified', header: 'Verified Status', render: (r) => <Badge tone={r.data.verified === 'Yes' ? 'green' : r.data.verified === 'No' ? 'red' : 'amber'}>{r.data.verified}</Badge> },
                        { key: 'method', header: 'Method', render: (r) => <span className="cell-sub">{r.data.verification_method || '—'}</span> },
                        { key: 'remarks', header: 'Remarks', render: (r) => <span className="cell-sub">{r.data.remarks || '—'}</span> },
                        { key: '_x', header: '', render: (r) => (
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeEntry(r.id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      ]}
                      rows={entries}
                      empty={
                        <div style={{ textAlign: 'center', padding: 30 }}>
                          <ShieldCheck size={28} style={{ color: 'var(--muted)', marginBottom: 8 }} />
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Compliance Checklist Empty</p>
                          <p className="cell-sub" style={{ fontSize: 11, marginTop: 4 }}>Add Deed checks, Mutation Khatians, and Utility checks to secure verification.</p>
                        </div>
                      }
                    />
                  )}
                </div>

              </div>
              
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
          )}
        </div>

      </div>

      {/* DRAWERS */}
      
      {/* 1. Add Compliance Check Drawer */}
      {activeDrawer === 'add_check' && (
        <Drawer title="Add Compliance Checklist Item" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button><Button onClick={saveCheck} disabled={saving}>{saving ? <Spinner /> : 'Save Item'}</Button></>}>
          <form onSubmit={saveCheck} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Document Checklist Item" required>
              <Select value={form.document || ''} onChange={(e) => setForm({ ...form, document: e.target.value })}>
                <option value="">— Select Check Item —</option>
                <option value="Registered Sale Deed (Dalil)">Registered Sale Deed (Dalil)</option>
                <option value="Mutation Khatian (Namjari)">Mutation Khatian (Namjari)</option>
                <option value="Holding Tax Clearance Receipts">Holding Tax Clearance Receipts</option>
                <option value="Electricity Bill (DESCO/DPDC)">Electricity Bill (DESCO/DPDC)</option>
                <option value="WASA Clearance Receipts">WASA Clearance Receipts</option>
                <option value="Titas Gas Bill Clearance">Titas Gas Bill Clearance</option>
                <option value="RAJUK Approved Building Plan">RAJUK Approved Building Plan</option>
                <option value="Property Insurance Cover">Property Insurance Cover</option>
              </Select>
            </Field>
            <Field label="Required for listing?"><Select value={form.required || 'Yes'} onChange={(e) => setForm({ ...form, required: e.target.value })}><option value="Yes">Yes</option><option value="No">No</option></Select></Field>
            <Field label="Received Copy?"><Select value={form.received || 'Yes'} onChange={(e) => setForm({ ...form, received: e.target.value })}><option value="Yes">Yes</option><option value="No">No</option></Select></Field>
            <Field label="Verification Status"><Select value={form.verified || 'Pending'} onChange={(e) => setForm({ ...form, verified: e.target.value })}><option value="Pending">Pending Audit</option><option value="Yes">Yes (Approved)</option><option value="No">No (Rejected / Disputed)</option></Select></Field>
            <Field label="Verification Audit Method"><Input value={form.verification_method || ''} onChange={(e) => setForm({ ...form, verification_method: e.target.value })} placeholder="e.g. Sub-registry search / Online TIN search" /></Field>
            <Field label="Auditor Remarks / Notes" full><Textarea value={form.remarks || ''} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
          </form>
        </Drawer>
      )}

      {/* 2. Upload Compliance Document Drawer */}
      {activeDrawer === 'upload_doc' && (
        <Drawer title="Upload Property Compliance File" onClose={() => setActiveDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setActiveDrawer(null)}>Cancel</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Document Category" required>
              <Select value={form.doc_type || 'deed'} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
                <option value="deed">Ownership Deed (Dalil)</option>
                <option value="mutation">Mutation Khatian</option>
                <option value="tax_receipt">Tax Receipt / TIN</option>
                <option value="utility">Utility bill copy</option>
                <option value="insurance">Insurance Policy</option>
                <option value="other">Other compliance proof</option>
              </Select>
            </Field>
            <Field label="Document Title" required><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Deed No 1034 Scan" /></Field>
            
            <div style={{ padding: 20, border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center', background: 'var(--surface-2)', cursor: 'pointer', position: 'relative' }} onClick={() => document.getElementById('compliance-file-upload').click()}>
              {uploading ? (
                <div style={{ padding: 10 }}><Spinner /><p style={{ margin: '8px 0 0 0', fontSize: 13 }}>Uploading and registering file...</p></div>
              ) : (
                <>
                  <Upload size={24} style={{ color: 'var(--muted)', marginBottom: 8 }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>Click to browse and upload proof file</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--muted)' }}>Supports PDF, PNG, JPG scans up to 5MB</p>
                </>
              )}
              <input type="file" id="compliance-file-upload" style={{ display: 'none' }} onChange={handleDocUpload} disabled={uploading} />
            </div>
          </div>
        </Drawer>
      )}

    </div>
  );
}
