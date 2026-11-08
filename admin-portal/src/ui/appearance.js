import { useEffect } from 'react';
import api from '../services/api';
import '../styles/buttons.css';

/*
 * appearance.js — the admin-wide primary button colour (Settings → Appearance).
 *
 *   'navy'    one navy for every primary button (default)
 *   'accent'  each console keeps its own colour
 *   '#rrggbb' a chosen colour
 *
 * A fixed colour sets html.ss-btn-fixed and --ss-primary; styles/buttons.css
 * does the rest. The last value is cached so pages do not flash the old colour.
 */
export const NAVY = '#0D1638';
const CACHE = 'ss.buttonColor';
const valid = (v) => v === 'navy' || v === 'accent' || /^#[0-9a-f]{6}$/i.test(v || '');

// A darker step of the colour for hover.
function darker(hex, by = 0.18) {
  const x = parseInt(hex.slice(1), 16);
  const c = [x >> 16, (x >> 8) & 255, x & 255].map((v) => Math.round(v * (1 - by)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
// White or ink text, whichever reads on the colour.
function inkOn(hex) {
  const x = parseInt(hex.slice(1), 16);
  const [r, g, b] = [x >> 16, (x >> 8) & 255, x & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#0F172A' : '#FFFFFF';
}

export function applyButtonColor(value) {
  const v = valid(value) ? value : 'navy';
  const root = document.documentElement;
  if (v === 'accent') {
    root.classList.remove('ss-btn-fixed');
  } else {
    const hex = v === 'navy' ? NAVY : v;
    root.classList.add('ss-btn-fixed');
    root.style.setProperty('--ss-primary', hex);
    root.style.setProperty('--ss-primary-strong', v === 'navy' ? '#1A2656' : darker(hex));
    root.style.setProperty('--ss-primary-ink', inkOn(hex));
  }
  try { localStorage.setItem(CACHE, v); } catch { /* cache only */ }
  return v;
}

export const cachedButtonColor = () => { try { return localStorage.getItem(CACHE) || 'navy'; } catch { return 'navy'; } };

/** Applies the saved colour while the admin shell is on screen. */
export function useButtonColor() {
  useEffect(() => {
    applyButtonColor(cachedButtonColor());
    let live = true;
    api.get('/appearance').then((r) => { if (live) applyButtonColor(r.data?.button_color); }).catch(() => {});
    const onChange = (e) => applyButtonColor(e.detail);
    window.addEventListener('ss:button-color', onChange);
    return () => {
      live = false;
      window.removeEventListener('ss:button-color', onChange);
      document.documentElement.classList.remove('ss-btn-fixed');
    };
  }, []);
}

export async function saveButtonColor(value) {
  const r = await api.put('/appearance', { button_color: value });
  window.dispatchEvent(new CustomEvent('ss:button-color', { detail: r.data.button_color }));
  return r.data.button_color;
}
