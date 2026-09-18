import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2, PenLine, XCircle, Upload, PenTool, Type, Eraser,
  Check, ShieldCheck, Printer, Download, ArrowDown, FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { Spinner, Button } from '../ui/kit';

/**
 * Figma-grade Signature Capture Component
 * Supports:
 *  1. Upload Signature (image file -> optimized base64 data URL)
 *  2. Draw Signature (HTML5 canvas with pointer & touch support)
 *  3. Type Legal Name (live cursive script rendering)
 */
function SignatureCapture({ value, onChange, signerName, label, required }) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'draw' | 'type'
  const [typedName, setTypedName] = useState(signerName || '');
  const [fontStyle, setFontStyle] = useState("'Caveat', 'Brush Script MT', 'Segoe Script', cursive");
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasEmpty, setCanvasEmpty] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const isImage = typeof value === 'string' && value.startsWith('data:image/');
  const hasValue = Boolean(value && String(value).trim());

  // Handle uploaded file (PNG, JPG, WEBP)
  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // High-DPI canvas downsampling to maintain crisp quality while keeping payload ~10-25KB
        const maxW = 520;
        const maxH = 160;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/png');
        onChange(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Canvas drawing handlers
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#003768';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setCanvasEmpty(false);
  };

  const drawMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && !canvasEmpty) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearCanvas = (e) => {
    if (e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasEmpty(true);
    onChange('');
  };

  // Apply typed signature
  const handleTypeChange = (text) => {
    setTypedName(text);
    onChange(text);
  };

  return (
    <div style={{
      border: '1.5px solid #e2e8f0',
      borderRadius: '14px',
      background: '#ffffff',
      padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      marginBottom: '16px'
    }}>
      {/* Header Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#012a4e', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PenLine size={16} color="#00AEEF" />
          <span>{label || 'Legal Signature'}</span>
          {required && <span style={{ color: '#ef4444', fontWeight: '800' }}>*</span>}
        </label>
        {hasValue && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#059669',
            background: '#ecfdf5',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid #a7f3d0'
          }}>
            <Check size={13} /> Signature captured
          </span>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '6px',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '10px',
        marginBottom: '14px'
      }}>
        <button
          type="button"
          onClick={() => setMode('upload')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: mode === 'upload' ? '700' : '600',
            color: mode === 'upload' ? '#012a4e' : '#64748b',
            background: mode === 'upload' ? '#ffffff' : 'transparent',
            borderRadius: '7px',
            border: 'none',
            boxShadow: mode === 'upload' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Upload size={14} /> Upload Signature
        </button>
        <button
          type="button"
          onClick={() => setMode('draw')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: mode === 'draw' ? '700' : '600',
            color: mode === 'draw' ? '#012a4e' : '#64748b',
            background: mode === 'draw' ? '#ffffff' : 'transparent',
            borderRadius: '7px',
            border: 'none',
            boxShadow: mode === 'draw' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <PenTool size={14} /> Draw Signature
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('type');
            if (!value) handleTypeChange(signerName || '');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: mode === 'type' ? '700' : '600',
            color: mode === 'type' ? '#012a4e' : '#64748b',
            background: mode === 'type' ? '#ffffff' : 'transparent',
            borderRadius: '7px',
            border: 'none',
            boxShadow: mode === 'type' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Type size={14} /> Type Name
        </button>
      </div>

      {/* Tab 1: Upload Mode */}
      {mode === 'upload' && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) processImageFile(e.target.files[0]);
            }}
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#00AEEF' : '#cbd5e1'}`,
              borderRadius: '12px',
              padding: '24px 16px',
              textAlign: 'center',
              background: dragOver ? '#f0f9ff' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px'
            }}>
              <Upload size={20} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              Click to choose signature image, or drag &amp; drop
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              PNG, JPG, or WEBP supported · Clear photo on white paper or transparent PNG
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Draw Mode */}
      {mode === 'draw' && (
        <div>
          <div style={{
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            background: '#fafafa',
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'none'
          }}>
            {/* Ruled baseline guide */}
            <div style={{
              position: 'absolute',
              left: '20px',
              right: '20px',
              bottom: '36px',
              borderBottom: '1px dashed #cbd5e1',
              pointerEvents: 'none'
            }} />
            <canvas
              ref={canvasRef}
              width={540}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={drawMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={drawMove}
              onTouchEnd={stopDrawing}
              style={{
                display: 'block',
                width: '100%',
                height: '140px',
                cursor: 'crosshair',
                touchAction: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Draw on the line using mouse, stylus or finger</span>
            <button
              type="button"
              onClick={clearCanvas}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <Eraser size={12} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Type Mode */}
      {mode === 'type' && (
        <div>
          <input
            className="input"
            placeholder="Type your full legal name"
            value={typedName}
            onChange={(e) => handleTypeChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              marginBottom: '10px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Elegant Script', font: "'Caveat', cursive, sans-serif" },
              { label: 'Formal Calligraphy', font: "'Brush Script MT', 'Segoe Script', cursive" },
              { label: 'Signature Hand', font: "'Dancing Script', 'Segoe Script', cursive" }
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setFontStyle(f.font)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${fontStyle === f.font ? '#00AEEF' : '#e2e8f0'}`,
                  background: fontStyle === f.font ? '#f0f9ff' : '#ffffff',
                  color: fontStyle === f.font ? '#0284c7' : '#475569',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Signature Preview Plate */}
      {hasValue && (
        <div style={{
          marginTop: '14px',
          padding: '12px 14px',
          borderRadius: '10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#64748b', marginBottom: '4px' }}>
              Placement Preview (in agreement):
            </div>
            <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
              {isImage ? (
                <img
                  src={value}
                  alt="Signature Preview"
                  style={{ maxHeight: '44px', maxWidth: '220px', display: 'block', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontFamily: fontStyle, fontSize: '24px', color: '#003768', fontWeight: '600' }}>
                  {value}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={12} /> Reset
          </button>
        </div>
      )}
    </div>
  );
}

export default function SignPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [values, setValues] = useState({});
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const signSectionRef = useRef(null);

  const downloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    const fileBase = (state.envelope?.code || 'Agreement').replace(/[^a-zA-Z0-9-_]/g, '_');
    // Prefer the server-rendered PDF: it uses the same print engine as the signed
    // copy, so schedules land on their own pages with correct A4 margins. Falls
    // back to the client-side export only if the server PDF is unavailable.
    try {
      const res = await fetch(`/api/sign/${token}/signed-document?format=pdf`, { credentials: 'include' });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileBase}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setDownloadingPdf(false);
        return;
      }
    } catch (e) {
      console.error('Server PDF failed, falling back to client export:', e);
    }
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const sheet = document.querySelector('.agreement-sheet');
      if (!sheet) {
        alert('Document content could not be found for export.');
        return;
      }
      const opt = {
        margin: [10, 10, 12, 10],
        filename: `${fileBase}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'avoid-all'] },
      };
      await html2pdf().set(opt).from(sheet).save();
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      alert('Unable to generate PDF directly. Please use the Print button and select "Save as PDF".');
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/sign/${token}`);
        setState({ loading: false, ...data.data });
      } catch (e) {
        setState({ loading: false, error: e.response?.data?.error || 'Unable to load document.' });
      }
    })();
  }, [token]);

  const scrollToSigning = () => {
    signSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      // Validate required fields
      const missing = (state.fields || []).filter((f) => {
        if (!f.required) return false;
        if (f.field_type === 'date_signed') return false;
        const v = values[f.id];
        return v == null || String(v).trim() === '';
      });
      if (missing.length > 0) {
        setErr(`Please complete the required field: ${missing[0].label || missing[0].field_type}`);
        setBusy(false);
        return;
      }

      const fields = (state.fields || []).map((f) => ({
        id: f.id,
        value: f.field_type === 'date_signed'
          ? (values[f.id] || new Date().toISOString().slice(0, 10))
          : (values[f.id] || ''),
      }));
      const { data } = await api.post(`/sign/${token}/sign`, { fields });
      setDone(data.message || 'Signed successfully.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not submit signature.');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    const reason = prompt('Reason for declining (optional):') || '';
    try {
      await api.post(`/sign/${token}/decline`, { reason });
      setDone('You have declined to sign this agreement.');
    } catch {
      setErr('Failed to decline.');
    }
  };

  if (state.loading) {
    return (
      <div className="center-screen" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner />
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
            Loading secure document session...
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="center-screen" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: 480, width: '100%', background: '#ffffff', borderRadius: '16px', padding: '36px 28px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <XCircle size={44} color="#ef4444" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '19px', color: '#0f172a', margin: '0 0 8px', fontWeight: '800' }}>Unable to Access Document</h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 20px', lineHeight: '1.5' }}>{state.error}</p>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Please contact Seventh Sky Property Care if you believe this is an error.</div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="center-screen" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: 500, width: '100%', background: '#ffffff', borderRadius: '16px', padding: '36px 30px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <CheckCircle2 size={52} color="#10b981" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: '22px', color: '#012a4e', margin: '0 0 8px', fontWeight: '800' }}>{done}</h2>
          <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 20px', lineHeight: '1.6' }}>
            Your electronic signature and cryptographic timestamp have been recorded. All parties will receive a final executed copy once signing completes.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={downloadPdf} disabled={downloadingPdf}>
              <Download size={15} /> {downloadingPdf ? 'Exporting PDF...' : 'Download PDF'}
            </Button>
            <Button variant="ghost" onClick={() => window.print()}><Printer size={15} /> Print Summary</Button>
            <Button onClick={() => window.location.reload()}>View Agreement Status</Button>
          </div>
        </div>
      </div>
    );
  }

  const { envelope, signer, fields = [] } = state;
  const isCompleted = envelope.status === 'completed';
  const isAlreadySigned = signer.status === 'signed';
  const doneStatus = isAlreadySigned
    ? 'signed by you'
    : ['completed', 'voided', 'declined'].includes(envelope.status)
      ? (envelope.status === 'completed' ? 'fully signed & completed' : envelope.status)
      : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#0f172a', paddingBottom: '60px' }}>
      {/* Top Floating App Bar */}
      <header className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#012a4e 0%,#003768 50%,#00AEEF 100%)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '15px',
              boxShadow: '0 2px 6px rgba(1,42,78,0.2)'
            }}>
              7S
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#012a4e', letterSpacing: '0.4px' }}>
                Seventh Sky Property Care
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} color="#10b981" />
                <span>SSL 256-Bit Encrypted Signing Portal</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloadingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#012a4e',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                cursor: downloadingPdf ? 'wait' : 'pointer'
              }}
            >
              <Download size={14} /> {downloadingPdf ? 'Exporting PDF...' : 'Download PDF'}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print
            </button>

            {isCompleted && (
              <a
                href={`/api/sign/${token}/signed-document?download=1`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#ffffff',
                  background: '#012a4e',
                  borderRadius: '8px',
                  textDecoration: 'none'
                }}
              >
                <Download size={14} /> Download Signed HTML
              </a>
            )}

            {!doneStatus && (
              <button
                type="button"
                onClick={scrollToSigning}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#ffffff',
                  background: '#00AEEF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,174,239,0.3)'
                }}
              >
                <ArrowDown size={14} /> Jump to Sign
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 940, margin: '24px auto 0', padding: '0 16px' }}>
        {/* Status / Welcome Dossier Banner */}
        <div className="no-print" style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                background: '#012a4e',
                color: '#ffffff',
                padding: '2px 7px',
                borderRadius: '4px'
              }}>
                {envelope.code || 'AGREEMENT'}
              </span>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#012a4e', margin: 0 }}>
                {envelope.title}
              </h2>
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              Signing as: <strong style={{ color: '#0f172a' }}>{signer.name}</strong> ({signer.role?.replace(/_/g, ' ')}) · <span style={{ color: '#64748b' }}>{signer.email}</span>
            </div>
          </div>

          <div>
            {doneStatus ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ecfdf5',
                color: '#059669',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid #a7f3d0'
              }}>
                <CheckCircle2 size={15} /> Agreement {doneStatus}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fffbeb',
                color: '#b45309',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid #fde68a'
              }}>
                <AlertCircle size={15} /> Action required: Review &amp; Sign
              </span>
            )}
          </div>
        </div>

        {/* Read-Only Status Notice when already completed or signed */}
        {doneStatus && (
          <div className="no-print" style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #a7f3d0',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <CheckCircle2 size={32} color="#10b981" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#065f46', marginBottom: '2px' }}>
                This agreement is {doneStatus}.
              </div>
              <div style={{ fontSize: '12px', color: '#047857' }}>
                No further action is required from you. You can review the full signed document below or print a copy for your records.
              </div>
            </div>
          </div>
        )}

        {/* Document Sheet (Figma-grade presentation paper) */}
        {(() => {
          const docHtml = envelope.document_html || '';
          const hasEmbeddedDoc = docHtml.includes('provider-doc') || docHtml.includes('csa-doc') || docHtml.includes('csa-cover');
          return (
            <div
              className="agreement-sheet"
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 35px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)',
                padding: hasEmbeddedDoc ? 0 : '40px 48px',
                marginBottom: '28px',
                position: 'relative',
                overflow: 'hidden'
              }}
              dangerouslySetInnerHTML={{ __html: docHtml || '<p style="color:#94a3b8;text-align:center;">No document content.</p>' }}
            />
          );
        })()}

        {/* Live Signing Controls Form (Shown only when not already signed) */}
        {!doneStatus && (
          <div
            ref={signSectionRef}
            id="signing-action-card"
            className="no-print"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #00AEEF',
              boxShadow: '0 10px 30px rgba(0, 174, 239, 0.1)',
              padding: '28px 32px',
              marginBottom: '40px'
            }}
          >
            <div style={{ borderBottom: '1.5px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#00AEEF', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <ShieldCheck size={14} /> Legally Binding Electronic Attestation
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#012a4e', margin: '4px 0 2px' }}>
                Complete Your Signature
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                Please configure your signature and confirm the fields below. Once submitted, your signature will be securely affixed to the document.
              </p>
            </div>

            {/* Signature Fields Loop */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {fields.map((f) => {
                if (f.field_type === 'signature') {
                  return (
                    <SignatureCapture
                      key={f.id}
                      label={f.label || 'Your Signature'}
                      required={f.required}
                      signerName={signer.name}
                      value={values[f.id]}
                      onChange={(newVal) => setValues((prev) => ({ ...prev, [f.id]: newVal }))}
                    />
                  );
                }

                if (f.field_type === 'date_signed') {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  return (
                    <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', background: '#f8fafc' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                        {f.label || 'Date Signed'}
                      </label>
                      <input
                        className="input"
                        value={values[f.id] || todayStr}
                        disabled
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#0f172a',
                          fontWeight: '600'
                        }}
                      />
                    </div>
                  );
                }

                if (f.field_type === 'checkbox') {
                  return (
                    <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        id={`field-${f.id}`}
                        checked={!!values[f.id]}
                        onChange={(e) => setValues((prev) => ({ ...prev, [f.id]: e.target.checked ? 'checked' : '' }))}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor={`field-${f.id}`} style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>
                        {f.label || 'I agree and accept the terms above'} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                    </div>
                  );
                }

                return (
                  <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', background: '#ffffff' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                      {f.label || f.field_type} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      className="input"
                      value={values[f.id] || ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Error Banner */}
            {err && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{err}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #012a4e 0%, #003768 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(1,42,78,0.2)',
                  transition: 'transform 0.15s ease'
                }}
              >
                {busy ? <Spinner /> : <><ShieldCheck size={17} /> Sign &amp; Execute Agreement</>}
              </button>

              <button
                type="button"
                onClick={decline}
                disabled={busy}
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Decline
              </button>
            </div>

            {/* Legal Protection Statement */}
            <div style={{
              marginTop: '18px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '14px',
              fontSize: '11px',
              color: '#64748b',
              lineHeight: '1.5'
            }}>
              By clicking <strong>Sign &amp; Execute Agreement</strong>, you agree this electronic signature is your legally binding act under the Information &amp; Communication Technology (ICT) Act, 2006 (Bangladesh) and applicable electronic transactions regulations. An immutable SHA-256 cryptographic digest, IP address, and timestamp will be committed to the permanent audit trail.
            </div>
          </div>
        )}
      </main>

      {/* Global CSS for Print & PDF Optimization */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; }
          main { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          .agreement-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .clause-card, .schedule-card, .exec-card, .exec-panel {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
