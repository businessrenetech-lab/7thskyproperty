import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, FileText, Check, X, Trash2, Link2, Copy, Send, FolderOpen, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import FileUpload, { fileSrc } from '../../ui/FileUpload';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  dateFmt, toast, errText, svcLabel, svcDocManager,
} from './common';

/*
 * Document Manager — Property Doc Verification & Transfer service lines only.
 *
 * Every client's property documents (NID, Khatian, deeds, survey plans …) filed
 * per client against the manifest's required-document checklist. Staff can upload
 * on the client's behalf, verify/reject, generate a tokenised upload link the
 * client fills in themselves, and search across everything filed. Scoped to the
 * active service line by the X-Service-Line header, like every wt screen.
 */

const NOTE = {
  amber: { background: 'var(--wt-amber-bg, #fef3c7)', borderColor: '#fcd34d', color: '#92400e' },
  green: { background: 'var(--wt-green-bg, #d1fae5)', borderColor: '#a7f3d0', color: 'var(--wt-green, #047857)' },
};

export default function DocManager() {
  const [ref, setRef] = useState({ groups: [], client_docs: [] });
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);       // client_code
  const [clientDocs, setClientDocs] = useState([]);
  const [clientReqs, setClientReqs] = useState([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);         // flat search results
  const [reqDrawer, setReqDrawer] = useState(false);
  const [lastLink, setLastLink] = useState('');

  const loadBase = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [r, s] = await Promise.all([
        api.get('/wt-client-docs/reference'),
        api.get('/wt-client-docs/summary'),
      ]);
      setRef(r.data || { groups: [], client_docs: [] });
      setSummary(s.data || []);
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  const loadClient = useCallback(async (code) => {
    if (!code) return;
    try {
      const [d, rq] = await Promise.all([
        api.get('/wt-client-docs', { params: { client_code: code } }),
        api.get('/wt-client-docs/requests', { params: { client_code: code } }),
      ]);
      setClientDocs(d.data || []);
      setClientReqs(rq.data || []);
    } catch (e) { toast.err(errText(e)); }
  }, []);

  useEffect(() => { if (selected) loadClient(selected); }, [selected, loadClient]);

  const runSearch = useCallback(async (term) => {
    if (!term || !term.trim()) { setResults(null); return; }
    try {
      const { data } = await api.get('/wt-client-docs', { params: { q: term.trim() } });
      setResults(data || []);
    } catch (e) { toast.err(errText(e)); }
  }, []);

  const docFor = (key) => clientDocs.find((d) => d.doc_key === key) || null;

  const attach = async (item, url, file) => {
    try {
      await api.post('/wt-client-docs', {
        client_code: selected, doc_key: item.key, doc_type: item.label, category: item.category,
        file_url: url, original_name: file?.name || (url || '').split('/').pop(),
        size: file?.size, mime: file?.type,
      });
      toast.ok(`${item.label} uploaded`);
      await Promise.all([loadClient(selected), loadBase()]);
    } catch (e) { toast.err(errText(e)); }
  };

  const setStatus = async (doc, status) => {
    try { await api.patch(`/wt-client-docs/${doc.id}`, { status }); toast.ok(`Marked ${status}`); await Promise.all([loadClient(selected), loadBase()]); }
    catch (e) { toast.err(errText(e)); }
  };
  const removeDoc = async (doc) => {
    if (!window.confirm(`Remove ${doc.doc_type}? This deletes the filed document.`)) return;
    try { await api.delete(`/wt-client-docs/${doc.id}`); toast.ok('Removed'); await Promise.all([loadClient(selected), loadBase()]); }
    catch (e) { toast.err(errText(e)); }
  };

  if (!svcDocManager()) {
    return <div style={{ padding: 24 }}><EmptyState title="Not available" hint="The Document Manager is only for Property Doc Verification & Transfer services." /></div>;
  }
  if (loading) return <Loading />;

  const selectedClient = summary.find((c) => c.client_code === selected);

  return (
    <div className="wt-page">
      <WtHead title="Document Manager" subtitle={`${svcLabel()} — client property documents`}>
        <button className="wt-btn ghost sm" onClick={loadBase}><RefreshCw size={13} /> Refresh</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', ...NOTE.amber }}>{error}</div>}

      {/* Global document search */}
      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1 }} placeholder="Search all documents — type, number, client, project, notes…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') runSearch(q); }} />
        <button className="wt-btn sm" onClick={() => runSearch(q)}>Search</button>
        {results != null && <button className="wt-btn ghost sm" onClick={() => { setQ(''); setResults(null); }}><X size={13} /> Clear</button>}
      </div>

      {results != null ? (
        <div className="wt-card wt-tblcard">
          <div style={{ padding: '14px 18px 0' }}><div className="wt-sec-title">Search results ({results.length})</div></div>
          {results.length ? (
            <table className="wt-tbl">
              <thead><tr><th>Client</th><th>Document</th><th>Category</th><th style={{ width: 110 }}>Status</th><th style={{ width: 120 }}>Filed</th><th style={{ width: 90, textAlign: 'right' }}>File</th></tr></thead>
              <tbody>
                {results.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.client_name}</strong><div className="muted" style={{ fontSize: 11 }}>{d.client_code}</div></td>
                    <td>{d.doc_type}{d.doc_number ? <div className="muted" style={{ fontSize: 11 }}>#{d.doc_number}</div> : null}</td>
                    <td style={{ textTransform: 'capitalize' }}>{d.category}</td>
                    <td><Pill value={d.status} sm /></td>
                    <td>{dateFmt(d.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>{d.file_url ? <a className="wt-btn ghost sm" href={fileSrc(d.file_url)} target="_blank" rel="noopener"><FileText size={12} /> View</a> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ padding: '10px 18px 16px', color: 'var(--wt-muted)' }}>No documents match “{q}”.</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 14, alignItems: 'start' }}>
          {/* Client index */}
          <div className="wt-card" style={{ padding: 10 }}>
            <div className="wt-sec-title" style={{ padding: '4px 8px 8px' }}>Clients ({summary.length})</div>
            {summary.length ? summary.map((c) => (
              <button key={c.client_code} onClick={() => setSelected(c.client_code)}
                style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: selected === c.client_code ? 'var(--wt-accent-tint)' : 'transparent', borderRadius: 8, padding: '9px 10px', cursor: 'pointer', marginBottom: 2 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.client_name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{c.client_code} · {c.verified}/{c.total} verified{c.required_missing.length ? ` · ${c.required_missing.length} required missing` : ''}</div>
              </button>
            )) : <EmptyState title="No documents yet" hint="Filed client documents will appear here." />}
          </div>

          {/* Selected client panel */}
          {selected && selectedClient ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="wt-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedClient.client_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{selectedClient.client_code} · {selectedClient.verified} verified · {selectedClient.submitted} submitted{selectedClient.rejected ? ` · ${selectedClient.rejected} rejected` : ''}</div>
                </div>
                <button className="wt-btn sm" onClick={() => { setLastLink(''); setReqDrawer(true); }}><Send size={13} /> Request from client</button>
              </div>

              {selectedClient.required_missing.length > 0 && (
                <div className="wt-note" style={{ display: 'flex', gap: 8, alignItems: 'center', ...NOTE.amber }}>
                  <AlertTriangle size={14} /> {selectedClient.required_missing.length} required document(s) still missing.
                </div>
              )}

              {/* Checklist grouped by the manifest reference */}
              {ref.groups.map((g) => (
                <div key={g.group} className="wt-card" style={{ padding: 0 }}>
                  <div style={{ padding: '12px 16px 4px' }}><div className="wt-sec-title"><FolderOpen size={13} style={{ marginRight: 6, verticalAlign: -2 }} />{g.group}</div></div>
                  <table className="wt-tbl">
                    <tbody>
                      {g.items.map((item) => {
                        const doc = docFor(item.key);
                        return (
                          <tr key={item.key}>
                            <td style={{ width: '42%' }}>
                              {item.label} {item.required && <span className="wt-pill sm red" style={{ marginLeft: 4 }}>Required</span>}
                              {doc?.doc_number ? <div className="muted" style={{ fontSize: 11 }}>#{doc.doc_number}</div> : null}
                            </td>
                            <td style={{ width: 110 }}>{doc ? <Pill value={doc.status} sm /> : <span className="muted" style={{ fontSize: 12 }}>Not provided</span>}</td>
                            <td style={{ textAlign: 'right' }}>
                              {doc && doc.file_url ? (
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <a className="wt-btn ghost sm" href={fileSrc(doc.file_url)} target="_blank" rel="noopener"><FileText size={12} /> View</a>
                                  {doc.status !== 'Verified' && <button className="wt-btn ghost sm" onClick={() => setStatus(doc, 'Verified')}><Check size={12} /> Verify</button>}
                                  {doc.status !== 'Rejected' && <button className="wt-btn ghost sm" onClick={() => setStatus(doc, 'Rejected')}><X size={12} /> Reject</button>}
                                  <button className="wt-btn ghost sm" onClick={() => removeDoc(doc)}><Trash2 size={12} /></button>
                                </div>
                              ) : (
                                <div style={{ minWidth: 200, display: 'inline-block' }}>
                                  <FileUpload compact label="" value="" onChange={(url, file) => url && attach(item, url, file)} />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Upload links */}
              <div className="wt-card wt-tblcard">
                <div style={{ padding: '14px 18px 0' }}><div className="wt-sec-title"><Link2 size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Upload links ({clientReqs.length})</div></div>
                {clientReqs.length ? (
                  <table className="wt-tbl">
                    <thead><tr><th style={{ width: 120 }}>Reference</th><th style={{ width: 110 }}>Status</th><th>Requested</th><th style={{ width: 130 }}>Expires</th></tr></thead>
                    <tbody>
                      {clientReqs.map((r) => (
                        <tr key={r.id}>
                          <td className="id">{r.code}</td>
                          <td><Pill value={r.status} sm /></td>
                          <td className="muted" style={{ fontSize: 12 }}>{(r.requested_docs || []).length} document(s){r.submitted_at ? ` · submitted ${dateFmt(r.submitted_at)}` : ''}</td>
                          <td>{dateFmt(r.token_expires_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div style={{ padding: '10px 18px 16px', color: 'var(--wt-muted)', fontSize: 12.5 }}>No upload links sent yet.</div>}
              </div>
            </div>
          ) : (
            <div className="wt-card" style={{ padding: 32 }}><EmptyState title="Select a client" hint="Pick a client on the left to see and manage their documents." /></div>
          )}
        </div>
      )}

      {reqDrawer && (
        <RequestDrawer
          client={selectedClient} reference={ref}
          onClose={() => setReqDrawer(false)}
          onCreated={(link) => { setLastLink(link); loadClient(selected); }}
        />
      )}
    </div>
  );
}

function RequestDrawer({ client, reference, onClose, onCreated }) {
  const [message, setMessage] = useState('');
  const [keys, setKeys] = useState(() => (reference.client_docs || []).map((d) => d.key));
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  const toggle = (k) => setKeys((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/wt-client-docs/requests', { client_code: client.client_code, requested_docs: keys, message });
      setLink(data.link);
      onCreated(data.link);
      toast.ok(data.emailed ? 'Link created and emailed to the client' : 'Upload link created');
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };

  return (
    <WtDrawer title={`Request documents — ${client?.client_name || ''}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {link ? (
          <div className="wt-note" style={{ display: 'flex', flexDirection: 'column', gap: 8, ...NOTE.green }}>
            <div>Secure upload link (share with the client):</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="wt-input" readOnly value={link} style={{ flex: 1, fontSize: 12 }} onFocus={(e) => e.target.select()} />
              <button className="wt-btn sm" onClick={() => { navigator.clipboard?.writeText(link); toast.ok('Copied'); }}><Copy size={13} /></button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="wt-sec-title" style={{ marginBottom: 6 }}>Documents to request</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflow: 'auto' }}>
                {(reference.client_docs || []).map((d) => (
                  <label key={d.key} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <input type="checkbox" checked={keys.includes(d.key)} onChange={() => toggle(d.key)} />
                    {d.label}{d.required && <span className="wt-pill sm red">Required</span>}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="wt-sec-title" style={{ marginBottom: 6 }}>Message to client (optional)</div>
              <textarea className="wt-input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Please upload the latest RS Khatian and title deed for your valuation." />
            </div>
            <button className="wt-btn" disabled={busy || !keys.length} onClick={create}><Send size={14} /> {busy ? 'Creating…' : 'Create upload link'}</button>
          </>
        )}
      </div>
    </WtDrawer>
  );
}
