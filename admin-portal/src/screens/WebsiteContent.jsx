// admin-portal/src/screens/WebsiteContent.jsx
//
// Website Content manager — edit the public site's contact/footer details,
// branding, social links, and the hero / service / card photo sets. Saves to
// SystemSetting via /public-website/admin/content; the website reads the same
// content from GET /public-website/site. Images use the minimalist UploadButton.
import React, { useEffect, useState, useCallback } from 'react';
import { Save, Plus, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, Spinner, Field, Input } from '../ui/kit';
import UploadButton from '../ui/UploadButton';
import { fileSrc } from '../ui/FileUpload';

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 };
const sel = { width: '100%', border: '1px solid var(--line, #e2e8f0)', borderRadius: 8, padding: '8px 10px', font: 'inherit' };

const CONTACT_FIELDS = [
  ['CONTACT_PHONE_PRIMARY', 'Primary phone'],
  ['CONTACT_PHONE_SECONDARY', 'Secondary phone'],
  ['CONTACT_WHATSAPP', 'WhatsApp'],
  ['CONTACT_EMAIL_PRIMARY', 'Primary email'],
  ['CONTACT_EMAIL_SUPPORT', 'Support email'],
  ['CONTACT_ADDRESS', 'Business address (footer)'],
  ['CONTACT_MAP_EMBED', 'Google Maps embed URL'],
];
const SOCIAL_FIELDS = [
  ['SOCIAL_FACEBOOK', 'Facebook'], ['SOCIAL_INSTAGRAM', 'Instagram'], ['SOCIAL_YOUTUBE', 'YouTube'],
  ['SOCIAL_LINKEDIN', 'LinkedIn'], ['SOCIAL_TIKTOK', 'TikTok'], ['SOCIAL_TWITTER', 'X / Twitter'],
];
const BRAND_TEXT = [
  ['BRAND_NAME', 'Brand name'], ['BRAND_TAGLINE', 'Tagline'],
];
const BRAND_COLOR = [['BRAND_PRIMARY_COLOR', 'Primary colour'], ['BRAND_ACCENT_COLOR', 'Accent colour']];
const BRAND_IMAGES = [
  ['BRAND_LOGO_URL', 'Logo (light)'], ['BRAND_LOGO_DARK_URL', 'Logo (dark)'], ['BRAND_FAVICON_URL', 'Favicon'],
];

const Section = ({ title, desc, children }) => (
  <div className="pm-card" style={{ marginBottom: 16 }}>
    <div className="pm-card-body" style={{ padding: 18 }}>
      <h3 style={{ margin: '0 0 2px', fontSize: 15, color: 'var(--navy)' }}>{title}</h3>
      {desc && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{desc}</div>}
      {children}
    </div>
  </div>
);

const ImageField = ({ label, value, onChange }) => (
  <div>
    <label style={lbl}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {value
        ? <img src={fileSrc(value)} alt={label} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
        : <div style={{ width: 60, height: 60, borderRadius: 8, border: '1px dashed var(--line)', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}><ImageIcon size={18} /></div>}
      <UploadButton folder="website" accept="image/*" value={value} onChange={onChange} label={value ? 'Replace' : 'Upload'} />
    </div>
  </div>
);

export default function WebsiteContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flat, setFlat] = useState({});                 // contact/branding/social flat keys
  const [hero, setHero] = useState([]);                 // [{url, heading, subheading}]
  const [services, setServices] = useState([]);         // [{name, url}]
  const [cards, setCards] = useState([]);               // [{title, url}]

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/public-website/admin/content');
      const g = data.data || {};
      const merged = { ...(g.contact || {}), ...(g.branding || {}), ...(g.social || {}) };
      setFlat(merged);
      const w = g.website || {};
      setHero(Array.isArray(w.WEBSITE_HERO_IMAGES) ? w.WEBSITE_HERO_IMAGES : []);
      setServices(Array.isArray(w.WEBSITE_SERVICE_PHOTOS) ? w.WEBSITE_SERVICE_PHOTOS : []);
      setCards(Array.isArray(w.WEBSITE_CARD_PHOTOS) ? w.WEBSITE_CARD_PHOTOS : []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load website content');
    } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const setKey = (k, v) => setFlat((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const settings = {
        ...flat,
        WEBSITE_HERO_IMAGES: hero.filter((h) => h.url),
        WEBSITE_SERVICE_PHOTOS: services.filter((s) => s.url),
        WEBSITE_CARD_PHOTOS: cards.filter((c) => c.url),
      };
      await api.put('/public-website/admin/content', { settings });
      toast.success('Website content saved — the site will reflect it.');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not save');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="pm-scope"><div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div></div>;

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Website</div><h1>Website Content</h1><div className="pm-meta">Contact &amp; footer details, branding, social links and site photos — edits reflect on the public website.</div></div>
        <div className="pm-head-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="pm-btn" onClick={load} disabled={saving}><RefreshCw size={14} /> Reload</button>
          <button className="pm-btn primary" onClick={save} disabled={saving} style={{ background: 'var(--navy)', color: '#fff' }}><Save size={14} /> {saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      <Section title="Contact & footer details" desc="Shown on the Contact page and in the site footer.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {CONTACT_FIELDS.map(([k, l]) => (
            <div key={k} style={k === 'CONTACT_ADDRESS' || k === 'CONTACT_MAP_EMBED' ? { gridColumn: '1 / -1' } : {}}>
              <label style={lbl}>{l}</label>
              <input style={sel} value={flat[k] || ''} onChange={(e) => setKey(k, e.target.value)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Branding" desc="Name, tagline, colours and logos used across the site.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {BRAND_TEXT.map(([k, l]) => (<div key={k}><label style={lbl}>{l}</label><input style={sel} value={flat[k] || ''} onChange={(e) => setKey(k, e.target.value)} /></div>))}
          {BRAND_COLOR.map(([k, l]) => (
            <div key={k}><label style={lbl}>{l}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={flat[k] || '#003768'} onChange={(e) => setKey(k, e.target.value)} style={{ width: 44, height: 36, border: '1px solid var(--line)', borderRadius: 8, background: 'none' }} />
                <input style={{ ...sel, flex: 1 }} value={flat[k] || ''} onChange={(e) => setKey(k, e.target.value)} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {BRAND_IMAGES.map(([k, l]) => (<ImageField key={k} label={l} value={flat[k] || ''} onChange={(url) => setKey(k, url)} />))}
        </div>
      </Section>

      <Section title="Social links">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SOCIAL_FIELDS.map(([k, l]) => (<div key={k}><label style={lbl}>{l}</label><input style={sel} value={flat[k] || ''} onChange={(e) => setKey(k, e.target.value)} placeholder="https://…" /></div>))}
        </div>
      </Section>

      <Repeater
        title="Hero section photos" desc="Big banner images (with optional heading/subheading) for the homepage hero/slider."
        rows={hero} setRows={setHero}
        blank={{ url: '', heading: '', subheading: '' }}
        render={(row, upd) => (
          <>
            <ImageField label="Hero image" value={row.url} onChange={(url) => upd({ url })} />
            <div><label style={lbl}>Heading</label><input style={sel} value={row.heading || ''} onChange={(e) => upd({ heading: e.target.value })} /></div>
            <div><label style={lbl}>Subheading</label><input style={sel} value={row.subheading || ''} onChange={(e) => upd({ subheading: e.target.value })} /></div>
          </>
        )}
      />

      <Repeater
        title="Service photos" desc="One image per service (e.g. Residential Sale, Water Tank, Air Conditioning…)."
        rows={services} setRows={setServices}
        blank={{ name: '', url: '' }}
        render={(row, upd) => (
          <>
            <div><label style={lbl}>Service name</label><input style={sel} value={row.name || ''} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Water Tank Cleaning" /></div>
            <ImageField label="Service image" value={row.url} onChange={(url) => upd({ url })} />
          </>
        )}
      />

      <Repeater
        title="Card / section photos" desc="Images for the feature cards and content sections across the site."
        rows={cards} setRows={setCards}
        blank={{ title: '', url: '' }}
        render={(row, upd) => (
          <>
            <div><label style={lbl}>Card title / label</label><input style={sel} value={row.title || ''} onChange={(e) => upd({ title: e.target.value })} /></div>
            <ImageField label="Card image" value={row.url} onChange={(url) => upd({ url })} />
          </>
        )}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button className="pm-btn primary" onClick={save} disabled={saving} style={{ background: 'var(--navy)', color: '#fff' }}><Save size={14} /> {saving ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}

function Repeater({ title, desc, rows, setRows, blank, render }) {
  const upd = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => setRows([...rows, { ...blank }]);
  const remove = (i) => setRows(rows.filter((_, idx) => idx !== i));
  return (
    <Section title={title} desc={desc}>
      {rows.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>None yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end', border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: 'var(--surface-2, #f8fafc)' }}>
            {render(row, (patch) => upd(i, patch))}
            <button className="pm-btn" onClick={() => remove(i)} title="Remove" style={{ padding: '6px 9px' }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button className="pm-btn" onClick={add} style={{ marginTop: 12, padding: '5px 11px', fontSize: 12.5 }}><Plus size={14} /> Add</button>
    </Section>
  );
}
