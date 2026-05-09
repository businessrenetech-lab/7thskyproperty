import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, Key, Mail, MessageSquare, Loader2,
  Facebook, Search, Globe, Palette, Phone, Share2, Link2, Shield,
  Eye, EyeOff, CheckCircle2, BarChart3, Tag, Map, Image, Megaphone,
  CreditCard, ExternalLink, MonitorSmartphone, Music2, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

/* ─── Brand-colored SVG icons for platforms ────────────────── */
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11V9a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 0010.86 4.47V13.1a8.16 8.16 0 005.58 2.19V11.9a4.85 4.85 0 01-3.6-1.61V6.69h3.6z"/></svg>
);
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);

/* ─── Category Config ──────────────────────────────────────── */
const CATEGORIES = [
  { id: 'facebook',     label: 'Facebook Pixel & CAPI',      icon: <FacebookIcon />,       color: '#1877F2', desc: 'Server-side tracking, pixel ID, and Conversions API credentials' },
  { id: 'tiktok',       label: 'TikTok Pixel & Events API',  icon: <TikTokIcon />,         color: '#00f2ea', desc: 'TikTok pixel and server-side Events API for conversion tracking' },
  { id: 'google',       label: 'Google Analytics & Tags',     icon: <GoogleIcon />,          color: '#4285F4', desc: 'GA4, GTM, Search Console, and Google Ads conversion settings' },
  { id: 'seo',          label: 'SEO & Meta Tags',             icon: <Search size={20} />,    color: '#34A853', desc: 'Default page titles, meta descriptions, OG images, and keywords' },
  { id: 'social',       label: 'Social Media Profiles',       icon: <Share2 size={20} />,    color: '#E1306C', desc: 'Links to all your social media profiles shown on the website' },
  { id: 'contact',      label: 'Contact Information',         icon: <Phone size={20} />,     color: '#00D4FF', desc: 'Phone numbers, emails, WhatsApp, and business address' },
  { id: 'branding',     label: 'Branding & Identity',         icon: <Palette size={20} />,   color: '#9B6DFF', desc: 'Logo, favicon, brand colors, tagline, and business name' },
  { id: 'email',        label: 'Email Configuration',         icon: <Mail size={20} />,      color: '#FFB347', desc: 'SMTP server credentials for transactional emails' },
  { id: 'sms',          label: 'SMS Gateway',                 icon: <MessageSquare size={20}/>, color: '#00FF94', desc: 'SMS API keys and sender configuration' },
  { id: 'integrations', label: 'Third-party Integrations',    icon: <Link2 size={20} />,     color: '#FF4D6D', desc: 'SSLCommerz, Tawk.to, and other platform integrations' },
  { id: 'payment',      label: 'Payment Settings',            icon: <CreditCard size={20} />, color: '#e2136e', desc: 'Merchant numbers and manual payment instructions' },
];

/* ─── Input Component ──────────────────────────────────────── */
const SettingInput = ({ setting, value, onChange }) => {
  const toast = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const isColor = setting.key.includes('COLOR');
  const isTextarea = setting.key.includes('ADDRESS') || setting.key.includes('META_DESCRIPTION') || setting.key.includes('ROBOTS_TXT') || setting.key.includes('MAP_EMBED');

  const inputStyles = {
    width: '100%',
    padding: isTextarea ? '0.8rem 1rem' : '0.7rem 1rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-main)',
    fontSize: '0.88rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: setting.is_secret || setting.key.includes('_ID') ? "'JetBrains Mono', monospace" : 'var(--font-ui)',
    resize: isTextarea ? 'vertical' : undefined,
    minHeight: isTextarea ? '80px' : undefined,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.2px',
      }}>
        <span>{setting.description}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {setting.is_secret && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '700',
              background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <Key size={9} /> ENCRYPTED
            </span>
          )}
        </div>
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {isColor && (
          <div style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            width: '24px', height: '24px', borderRadius: '6px', border: '2px solid var(--border)',
            background: value || '#7bc62e',
          }} />
        )}

        {isTextarea ? (
          <textarea
            value={value}
            onChange={e => onChange(setting.key, e.target.value)}
            style={inputStyles}
            className="glass-input"
            placeholder={setting.description}
            rows={3}
          />
        ) : (
          <input
            type={setting.is_secret && !showSecret ? 'password' : 'text'}
            value={value}
            onChange={e => onChange(setting.key, e.target.value)}
            style={{ ...inputStyles, paddingLeft: isColor ? '44px' : '1rem', paddingRight: setting.is_secret ? '40px' : '1rem' }}
            className="glass-input"
            placeholder={setting.is_secret ? '••••••••••••••••' : setting.description}
          />
        )}

        {setting.is_secret && !isTextarea && (
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-dim)', padding: '4px',
              cursor: 'pointer', display: 'flex',
            }}
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Category Section Component ───────────────────────────── */
const CategorySection = ({ category, settings, getValue, onChange, isActive, onToggle }) => {
  const catSettings = settings.filter(s => {
    // Match by category from API, or fallback match by key prefix
    if (s.category === category.id) return true;
    if (category.id === 'email' && s.key.startsWith('SMTP_')) return true;
    if (category.id === 'sms' && s.key.startsWith('SMS_')) return true;
    if (category.id === 'facebook' && s.key.startsWith('FB_')) return true;
    if (category.id === 'tiktok' && s.key.startsWith('TIKTOK_')) return true;
    if (category.id === 'google' && (s.key.startsWith('GA4_') || s.key.startsWith('GTM_') || s.key.startsWith('GOOGLE_'))) return true;
    if (category.id === 'seo' && (s.key.startsWith('SEO_') || s.key.startsWith('ROBOTS_'))) return true;
    if (category.id === 'social' && s.key.startsWith('SOCIAL_')) return true;
    if (category.id === 'contact' && s.key.startsWith('CONTACT_')) return true;
    if (category.id === 'branding' && s.key.startsWith('BRAND_')) return true;
    if (category.id === 'integrations' && (s.key.startsWith('TAWK_') || s.key.startsWith('SSLCOMMERZ_'))) return true;
    if (category.id === 'payment' && (s.key.startsWith('BKASH_') || s.key.startsWith('PAYMENT_'))) return true;
    return false;
  });

  if (catSettings.length === 0) return null;

  const configuredCount = catSettings.filter(s => getValue(s.key)?.trim()).length;

  return (
    <div
      className="sc"
      style={{
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        borderColor: isActive ? `${category.color}33` : undefined,
        boxShadow: isActive ? `0 8px 32px ${category.color}15` : undefined,
      }}
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)',
          borderBottom: isActive ? '1px solid var(--border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '42px', height: '42px', borderRadius: '12px',
            background: `${category.color}15`, color: category.color,
            transition: 'all 0.2s',
          }}>
            {category.icon}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>
              {category.label}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              {category.desc}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Config status badge */}
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '700',
            background: configuredCount === catSettings.length ? 'rgba(0,255,148,0.1)' : configuredCount > 0 ? 'rgba(255,179,71,0.1)' : 'rgba(255,255,255,0.04)',
            color: configuredCount === catSettings.length ? '#4DFFA8' : configuredCount > 0 ? '#FFCA7A' : 'var(--text-dim)',
            border: `1px solid ${configuredCount === catSettings.length ? 'rgba(0,255,148,0.2)' : configuredCount > 0 ? 'rgba(255,179,71,0.2)' : 'var(--border)'}`,
          }}>
            {configuredCount}/{catSettings.length} configured
          </span>

          {/* Chevron */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.3s', transform: isActive ? 'rotate(180deg)' : 'rotate(0)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isActive && (
        <div style={{
          padding: '22px', display: 'grid',
          gridTemplateColumns: catSettings.length <= 2 ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '18px',
        }}>
          {catSettings.map(s => (
            <SettingInput key={s.key} setting={s} value={getValue(s.key)} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main Settings Page ───────────────────────────────────── */
const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localMods, setLocalMods] = useState({});
  const [activeCategory, setActiveCategory] = useState('facebook');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        toast.warning('Access denied. Super Admin privileges required.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const updates = Object.keys(localMods).map(key => ({ key, value: localMods[key] }));
    if (updates.length === 0) return;

    setSaving(true);
    try {
      await api.put('/settings', updates);
      setSaved(true);
      setLocalMods({});
      fetchSettings();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, val) => {
    setLocalMods(prev => ({ ...prev, [key]: val }));
  };

  const getValue = (key) => {
    if (localMods[key] !== undefined) return localMods[key];
    const s = settings.find(st => st.key === key);
    return s ? s.value : '';
  };

  const modCount = Object.keys(localMods).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 className="animate-spin" color="var(--primary)" size={40} />
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Loading System Configurations...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* ── Page Header ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(155,109,255,0.15), rgba(0,212,255,0.15))',
          }}>
            <SettingsIcon size={26} color="#9B6DFF" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: '800', fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px', margin: 0 }}>
              System Settings
            </h2>
            <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              Configure tracking pixels, API credentials, social profiles, and branding.
            </p>
          </div>
        </div>

        {/* Encryption badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px', borderRadius: '12px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
        }}>
          <Shield size={16} color="#10b981" />
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', letterSpacing: '0.3px' }}>
            AES-256 ENCRYPTED VAULT
          </span>
        </div>
      </div>

      {/* ── Settings Form ───────────────────────────────── */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {CATEGORIES.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            settings={settings}
            getValue={getValue}
            onChange={handleChange}
            isActive={activeCategory === cat.id}
            onToggle={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
          />
        ))}

        {/* ── Sticky Save Bar ──────────────────────────── */}
        {modCount > 0 && (
          <div style={{
            position: 'sticky', bottom: '1rem', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 22px', borderRadius: '16px',
            background: 'rgba(15,23,42,0.95)', border: '1px solid var(--border)',
            backdropFilter: 'blur(16px)', boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} color="#FFB347" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                <strong style={{ color: '#FFB347' }}>{modCount}</strong> unsaved {modCount === 1 ? 'change' : 'changes'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setLocalMods({})}
                className="btn-ghost"
                style={{ padding: '8px 18px' }}
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-stitch"
                style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Encrypting & Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}

        {/* ── Success Toast ─────────────────────────────── */}
        {saved && (
          <div style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 22px', borderRadius: '14px',
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#4DFFA8', fontWeight: '700', fontSize: '0.88rem',
            animation: 'fadeInUp 0.4s ease',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <CheckCircle2 size={20} /> Settings saved & encrypted successfully
          </div>
        )}
      </form>

      {/* ── Footer Note ──────────────────────────────────── */}
      <div style={{
        marginTop: '2rem', textAlign: 'center', padding: '1.5rem',
        fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.6',
        borderTop: '1px solid var(--border)',
      }}>
        <p>
          All secret values (API tokens, passwords) are encrypted with <strong>AES-256-CBC</strong> before being stored in the database.
          <br />Changes take effect immediately — no server restart required for tracking pixels and social links.
        </p>
      </div>
    </div>
  );
};

export default Settings;
