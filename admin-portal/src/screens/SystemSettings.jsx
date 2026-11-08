import React, { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { PageHead, Button } from '../ui/kit';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NAVY, cachedButtonColor, saveButtonColor } from '../ui/appearance';

/*
 * SystemSettings — /settings. Holds the Appearance choice: the colour of
 * primary buttons across every console. Only a super admin can change it;
 * everyone else sees what is set.
 */
const CHOICES = [
  { key: 'navy', title: 'Navy', desc: 'One colour everywhere. Recommended.', swatch: NAVY },
  { key: 'accent', title: 'Console colour', desc: 'Each console uses its own colour.', swatch: 'conic-gradient(#12B6F3 0 25%, #9333EA 0 50%, #10B981 0 75%, #F59E0B 0)' },
  { key: 'custom', title: 'Custom', desc: 'Pick any colour.', swatch: null },
];

export default function SystemSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === 'super_admin';
  const saved0 = cachedButtonColor();
  const [saved, setSaved] = useState(saved0);
  const [choice, setChoice] = useState(saved0.startsWith('#') ? 'custom' : saved0);
  const [hex, setHex] = useState(saved0.startsWith('#') ? saved0 : '#2A78D6');
  const [busy, setBusy] = useState(false);

  // The cache can be stale on a new device; the shell refreshes it on load.
  useEffect(() => {
    const t = setTimeout(() => {
      const v = cachedButtonColor();
      setSaved(v); setChoice(v.startsWith('#') ? 'custom' : v); if (v.startsWith('#')) setHex(v);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const hexOk = /^#[0-9a-f]{6}$/i.test(hex);
  const value = choice === 'custom' ? hex : choice;
  const dirty = value.toLowerCase() !== saved.toLowerCase();
  const preview = choice === 'navy' ? NAVY : choice === 'custom' && hexOk ? hex : null;

  const save = async () => {
    setBusy(true);
    try {
      const v = await saveButtonColor(value);
      setSaved(v);
      toast?.success?.('Button colour saved.');
    } catch (e) {
      toast?.error?.(e?.response?.data?.error || 'The button colour could not be saved.');
    } finally { setBusy(false); }
  };

  return (
    <div className="ap">
      <PageHead title="Settings" desc="How the admin looks for everyone in the business." />
      <section className="ap-card" aria-labelledby="ap-title">
        <div className="ap-card-head">
          <div>
            <h2 id="ap-title">Button colour</h2>
            <p>The main action on every page, such as Save or New booking.</p>
          </div>
          {!canEdit && <span className="ap-note">Only a super admin can change this.</span>}
        </div>
        <div className="ap-choices" role="radiogroup" aria-label="Button colour">
          {CHOICES.map((c) => (
            <label key={c.key} className={`ap-choice ${choice === c.key ? 'is-on' : ''} ${canEdit ? '' : 'is-locked'}`}>
              <input type="radio" name="btn-colour" value={c.key} checked={choice === c.key} disabled={!canEdit} onChange={() => setChoice(c.key)} />
              <span className="ap-swatch" style={{ background: c.key === 'custom' ? (hexOk ? hex : '#E2E8F0') : c.swatch }} aria-hidden="true" />
              <span className="ap-choice-text"><strong>{c.title}</strong><small>{c.desc}</small></span>
              {choice === c.key && <Check size={16} className="ap-tick" aria-hidden="true" />}
            </label>
          ))}
        </div>
        {choice === 'custom' && (
          <div className="ap-custom">
            <input type="color" value={hexOk ? hex : '#2A78D6'} onChange={(e) => setHex(e.target.value.toUpperCase())} disabled={!canEdit} aria-label="Pick a colour" />
            <input className="input" value={hex} onChange={(e) => setHex(e.target.value.trim())} disabled={!canEdit} maxLength={7} aria-label="Colour code" aria-invalid={!hexOk} />
            {!hexOk && <span className="ap-err">Use a colour code like #2A78D6.</span>}
          </div>
        )}
        <div className="ap-preview" aria-label="Preview">
          <span className="ap-preview-label">Preview</span>
          <button type="button" className="ap-demo" tabIndex={-1} style={preview ? { background: preview } : undefined}><Plus size={15} /> New booking</button>
          <button type="button" className="ap-demo is-ghost" tabIndex={-1}>Cancel</button>
          {choice === 'accent' && <span className="ap-note">Shown in each console's own colour.</span>}
        </div>
        {canEdit && (
          <div className="ap-actions">
            <Button onClick={save} disabled={!dirty || busy || (choice === 'custom' && !hexOk)}>{busy ? 'Saving…' : 'Save button colour'}</Button>
          </div>
        )}
      </section>
    </div>
  );
}
