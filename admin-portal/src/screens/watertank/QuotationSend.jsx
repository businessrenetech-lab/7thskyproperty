import React, { useState, useEffect } from 'react';
import { Send, Loader2, Eye, Paperclip } from 'lucide-react';
import api from '../../services/api';
import { WtDrawer, bdt, toast, errText } from './common';

/*
 * Send the quotation — the operator sees the exact branded email the client
 * will receive, with the PDF attached, before anything leaves the building.
 * Nothing is sent until they press Send.
 */

export default function QuotationSendDrawer({ quote, client, buildPdf, onClose, onSent }) {
  const [to, setTo] = useState(client?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/wt-quotes/${quote.id}/email-preview`)
      .then(({ data }) => {
        setPreviewHtml(data.html);
        setSubject(data.subject);
        if (!to && data.to) setTo(data.to);
      })
      .catch((e) => setErr(errText(e, 'Could not load the email preview')))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id]);

  // re-render the preview when the operator personalises the message
  const refreshPreview = async (msg) => {
    try {
      const { data } = await api.get(`/wt-quotes/${quote.id}/email-preview`, { params: { message: msg } });
      setPreviewHtml(data.html);
    } catch { /* keep the previous preview */ }
  };

  const openPreview = () => {
    const w = window.open('', '_blank');
    if (w) { w.document.write(previewHtml); w.document.close(); }
    else toast.err('Allow pop-ups to preview the email.');
  };

  const send = async () => {
    if (!to.trim()) { setErr('Enter the client email address.'); return; }
    setErr(''); setBusy('pdf');
    try {
      const blob = await buildPdf();
      const base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1]);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      setBusy('send');
      const { data } = await api.post(`/wt-quotes/${quote.id}/send`, {
        to: to.trim(), subject, message, pdf_base64: base64,
      });
      toast.ok(data.message || `Quotation sent to ${to}`);
      onSent(to.trim());
    } catch (e) {
      setErr(errText(e, 'Could not send the quotation'));
      setBusy('');
    }
  };

  return (
    <WtDrawer
      wide
      title="Email quotation to client"
      subtitle={`${quote.code} · ${bdt(quote.total)}`}
      onClose={onClose}
      footer={<>
        <button className="wt-btn" onClick={openPreview} disabled={!previewHtml}><Eye size={14} /> Preview email</button>
        <button className="wt-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>Cancel</button>
        <button className="wt-btn primary" disabled={!!busy || !to.trim()} onClick={send}>
          {busy === 'pdf' ? <><Loader2 size={14} className="wt-spin" /> Building PDF…</>
            : busy === 'send' ? <><Loader2 size={14} className="wt-spin" /> Sending…</>
              : <><Send size={14} /> Send quotation</>}
        </button>
      </>}
    >
      {err && <div className="wt-formerr">{err}</div>}

      <div className="wt-note">
        <Paperclip size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
        The branded quotation PDF is attached automatically. Contact details on the email and the
        PDF come from Settings, so they stay correct everywhere.
      </div>

      <div className="wt-field">
        <label>To *</label>
        <input className="wt-input" type="email" value={to} onChange={(e) => setTo(e.target.value)}
          placeholder="client@example.com" />
        {!client?.email && <span className="hint">No email on the client record — add one there so it fills in next time.</span>}
      </div>

      <div className="wt-field">
        <label>Subject</label>
        <input className="wt-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="wt-field">
        <label>Personal message</label>
        <textarea className="wt-input" rows={4} style={{ resize: 'vertical' }} value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => refreshPreview(message)}
          placeholder="Leave blank to use the standard covering note." />
        <span className="hint">Replaces the default opening paragraph. The totals block and footer stay as they are.</span>
      </div>

      <div className="wt-field">
        <label>Email preview</label>
        {loading
          ? <div style={{ padding: 30, textAlign: 'center' }}><Loader2 size={18} className="wt-spin" style={{ color: 'var(--wt-muted)' }} /></div>
          : <iframe
              title="Email preview" srcDoc={previewHtml} sandbox=""
              style={{ width: '100%', height: 460, border: '1px solid var(--wt-line)', borderRadius: 10, background: '#f1f5f9' }}
            />}
      </div>
    </WtDrawer>
  );
}
