import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Check, X, Plus, ChevronLeft, ChevronRight, ClipboardList, Building2, ShieldAlert,
  Droplets, Wrench, Camera, PenLine, Save, Loader2, AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, WtHead, DatePicker, Loading, EmptyState, bdt, toast, errText, parseJson, svcEquip, svcAssess } from './common';
import WtPhotoGrid from './PhotoUpload';

/*
 * Site Assessment — full-page, step by step (SSPC-WTCM-SOP-02 Sec. 8 Step 8).
 * Seven steps in the order an assessor actually walks a job. Each step saves
 * to the same record, so a half-finished assessment is never lost: the assessor
 * can stop after the safety walk and come back for the water test.
 */

const buildSteps = (as) => [
  { key: 'visit', label: 'Visit details', hint: 'Who, when, conditions', icon: ClipboardList },
  { key: 'tank', label: as.profile_label, hint: as.profile_hint, icon: Building2 },
  { key: 'safety', label: 'Safety checklist', hint: 'Verify before entry', icon: ShieldAlert },
  { key: 'quality', label: as.quality_label, hint: as.quality_hint, icon: Droplets },
  { key: 'risks', label: 'Risks & scope', hint: 'Findings and variations', icon: Wrench },
  { key: 'photos', label: 'Photo evidence', hint: 'Before and after', icon: Camera },
  { key: 'signoff', label: 'Sign-off', hint: 'Confirm and close', icon: PenLine },
];

const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const slug = (s) => `custom_${String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)}`;

export default function AssessmentForm() {
  const { code } = useParams();
  const nav = useSvcNav();
  const eq = svcEquip();
  const STEPS = buildSteps(svcAssess());
  const isNew = !code;

  const [ref, setRef] = useState(null);
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [dirty, setDirty] = useState(false);
  const [newCheck, setNewCheck] = useState('');

  const [f, setF] = useState({
    client_name: '', project_id: '', provider: '', assessor: '',
    assessed_date: new Date().toISOString().slice(0, 10), status: 'Scheduled',
    attendees: '', weather: '', duration_minutes: '',
    tank_type: '', tank_capacity: '', tank_material: '', tank_location: '',
    last_cleaned: '', water_source: '',
    template_key: 'standard', checklist: {}, custom_checks: [], equipment: [],
    access_notes: '', structural_notes: '',
    contamination: '', leakage: '',
    water_test: { ph: '', tds: '', turbidity: '', chlorine: '', bacteria: '' },
    risks: [], variations: [], recommended_services: [], findings: '',
    scope_confirmed: false,
    photos: [], photos_after: [],
    client_present: false, signed_off_by: '', signed_off_date: '',
  });
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setDirty(true); };

  useEffect(() => { api.get('/wt-ops/assessment-reference').then((r) => setRef(r.data)).catch(() => setRef(null)); }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api.get(`/wt-ops/site-assessments/${code}`)
      .then(({ data }) => {
        setRec(data);
        setF({
          client_name: data.client_name || '', project_id: data.project_id || '',
          provider: data.provider || '', assessor: data.assessor || '',
          assessed_date: data.assessed_date || '', status: data.status || 'Scheduled',
          attendees: data.attendees || '', weather: data.weather || '',
          duration_minutes: data.duration_minutes || '',
          tank_type: data.tank_type || '', tank_capacity: data.tank_capacity || '',
          tank_material: data.tank_material || '', tank_location: data.tank_location || '',
          last_cleaned: data.last_cleaned || '', water_source: data.water_source || '',
          template_key: data.template_key || 'standard',
          checklist: parseJson(data.checklist, {}) || {},
          custom_checks: parseJson(data.custom_checks, []) || [],
          equipment: parseJson(data.equipment, []) || [],
          access_notes: data.access_notes || '', structural_notes: data.structural_notes || '',
          contamination: data.contamination || '', leakage: data.leakage || '',
          water_test: parseJson(data.water_test, {}) || { ph: '', tds: '', turbidity: '', chlorine: '', bacteria: '' },
          risks: parseJson(data.risks, []) || [], variations: parseJson(data.variations, []) || [],
          recommended_services: parseJson(data.recommended_services, []) || [],
          findings: data.findings || '', scope_confirmed: !!data.scope_confirmed,
          photos: parseJson(data.photos, []) || [], photos_after: parseJson(data.photos_after, []) || [],
          client_present: !!data.client_present,
          signed_off_by: data.signed_off_by || '', signed_off_date: data.signed_off_date || '',
        });
      })
      .catch((e) => setErr(errText(e, 'Could not load this assessment')))
      .finally(() => setLoading(false));
  }, [code, isNew]);

  // the active checklist = standard items + this template's extras + assessor's own
  const template = (ref?.templates || []).find((t) => t.key === f.template_key);
  const activeChecks = [
    ...(ref?.standard_checks || []),
    ...((template?.extra) || []),
    ...f.custom_checks,
  ];
  const grouped = activeChecks.reduce((acc, c) => {
    const g = c.group || 'Other';
    (acc[g] = acc[g] || []).push(c);
    return acc;
  }, {});
  const ticked = activeChecks.filter((c) => f.checklist[c.key] === true).length;
  const flagged = activeChecks.filter((c) => f.checklist[c.key] === 'na').length;

  const toggleCheck = (key) => {
    const cur = f.checklist[key];
    set('checklist', { ...f.checklist, [key]: cur === true ? false : true });
  };
  const markNa = (key) => {
    const cur = f.checklist[key];
    set('checklist', { ...f.checklist, [key]: cur === 'na' ? false : 'na' });
  };
  const addCustomCheck = () => {
    const label = newCheck.trim();
    if (!label) return;
    const key = slug(label);
    if (activeChecks.some((c) => c.key === key)) { toast.err('That check is already on the list.'); return; }
    set('custom_checks', [...f.custom_checks, { key, label, group: 'Assessor added', custom: true }]);
    setNewCheck('');
  };
  const removeCustomCheck = (key) => {
    set('custom_checks', f.custom_checks.filter((c) => c.key !== key));
    const next = { ...f.checklist }; delete next[key];
    set('checklist', next);
  };

  const toggleIn = (field, v) => set(field, f[field].includes(v) ? f[field].filter((x) => x !== v) : [...f[field], v]);
  const setWater = (k, v) => set('water_test', { ...f.water_test, [k]: v });

  const addRisk = () => set('risks', [...f.risks, { risk: '', level: 'Medium', control: '' }]);
  const setRisk = (i, k, v) => set('risks', f.risks.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const delRisk = (i) => set('risks', f.risks.filter((_, j) => j !== i));

  const addVariation = () => set('variations', [...f.variations, { item: '', reason: '', estimate: '' }]);
  const setVariation = (i, k, v) => set('variations', f.variations.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const delVariation = (i) => set('variations', f.variations.filter((_, j) => j !== i));

  const payload = () => ({
    ...f,
    duration_minutes: Number(f.duration_minutes) || 0,
    photos_count: f.photos.length + f.photos_after.length,
    access_safe: f.checklist.tank_access_safe === true,
    assessed_date: f.assessed_date || null,
    signed_off_date: f.signed_off_date || null,
  });

  const save = useCallback(async ({ silent, then } = {}) => {
    if (!f.client_name.trim()) { setErr('Client name is required.'); setStep(0); return null; }
    setSaving(true); setErr('');
    try {
      let saved;
      if (isNew && !rec) {
        ({ data: saved } = await api.post('/wt-ops/site-assessments', payload()));
        setRec(saved);
        window.history.replaceState({}, '', `/admin/water-tank/site-assessments/${saved.code}/edit`);
      } else {
        ({ data: saved } = await api.patch(`/wt-ops/site-assessments/${(rec || {}).id}`, payload()));
        setRec(saved);
      }
      setDirty(false);
      if (!silent) toast.ok(`${saved.code} saved`);
      if (then) then(saved);
      return saved;
    } catch (e) { setErr(errText(e, 'Could not save the assessment')); return null; }
    finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, rec, isNew]);

  const next = async () => {
    if (step < STEPS.length - 1) { await save({ silent: true }); setStep(step + 1); }
    else await save({ then: (s) => nav(`/water-tank/site-assessments/${s.code}`) });
  };

  if (loading) return <Loading />;
  if (err && !rec && !isNew) return (
    <>
      <WtHead title="Assessment not found"
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/site-assessments')}>Site Assessments</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title={`No assessment with code ${code}`} hint={err}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/site-assessments')}>Back to the register</button>} /></div>
    </>
  );

  const variationTotal = f.variations.reduce((s, v) => s + Number(v.estimate || 0), 0);
  const uncontrolled = f.risks.filter((r) => r.risk && !r.control).length;

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/site-assessments')}>Site Assessments</span>
          {rec && <>{' › '}<span className="lnk" onClick={() => nav(`/water-tank/site-assessments/${rec.code}`)}>{rec.code}</span></>}
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>{isNew && !rec ? 'New' : 'Edit'}</span>
        </div>}
        title={isNew && !rec ? 'New Site Assessment' : `Edit ${rec?.code}`}
        subtitle="Sec. 8 Step 8 — inspect site, confirm scope, identify risks and variations"
      >
        {dirty && <span style={{ fontSize: 11.5, color: 'var(--wt-amber)', fontWeight: 600 }}>Unsaved changes</span>}
        <button className="wt-btn" disabled={saving} onClick={() => save()}>
          {saving ? <Loader2 size={14} className="wt-spin" /> : <Save size={14} />} Save
        </button>
        <button className="wt-btn" onClick={() => nav(rec ? `/water-tank/site-assessments/${rec.code}` : '/water-tank/site-assessments')}>
          <X size={14} /> Close
        </button>
      </WtHead>

      <div className="wt-wizard">
        <aside className="wt-wizrail">
          <div className="wt-wizrail-h">Assessment steps</div>
          {STEPS.map((s, i) => (
            <button key={s.key} className={`wt-wizrail-item${i === step ? ' on' : ''}${i < step ? ' done' : ''}`}
              onClick={() => setStep(i)}>
              <span className="n">{i < step ? <Check size={12} /> : i + 1}</span>
              <span><span className="l">{s.label}</span><span className="s">{s.hint}</span></span>
            </button>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)', display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, color: 'var(--wt-muted)' }}>
            <span>{ticked} of {activeChecks.length} checks verified</span>
            <span>{f.risks.length} risk{f.risks.length === 1 ? '' : 's'} · {f.variations.length} variation{f.variations.length === 1 ? '' : 's'}</span>
            <span>{f.photos.length + f.photos_after.length} photo{f.photos.length + f.photos_after.length === 1 ? '' : 's'}</span>
          </div>
        </aside>

        <div className="wt-wizpane">
          {err && <div className="wt-formerr">{err}</div>}

          {/* ── 1 VISIT ── */}
          {step === 0 && (
            <>
              <div className="wt-wizpane-h"><h2>Visit details</h2>
                <p>Who attended, when, and under what conditions. This is the header of the assessment report.</p></div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Client *</label>
                  <input className="wt-input" autoFocus value={f.client_name} onChange={(e) => set('client_name', e.target.value)} /></div>
                <div className="wt-field"><label>Project ID</label>
                  <input className="wt-input" value={f.project_id} onChange={(e) => set('project_id', e.target.value)} /></div>
              </div>
              <div className="wt-grid3">
                <div className="wt-field"><label>Provider</label>
                  <input className="wt-input" value={f.provider} onChange={(e) => set('provider', e.target.value)} /></div>
                <div className="wt-field"><label>Assessor</label>
                  <input className="wt-input" value={f.assessor} onChange={(e) => set('assessor', e.target.value)} /></div>
                <div className="wt-field"><label>Assessment date</label>
                  <DatePicker value={f.assessed_date} onChange={(v) => set('assessed_date', v)} /></div>
              </div>
              <div className="wt-grid3">
                <div className="wt-field"><label>Status</label>
                  <select className="wt-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select></div>
                <div className="wt-field"><label>Weather / conditions</label>
                  <input className="wt-input" value={f.weather} onChange={(e) => set('weather', e.target.value)} placeholder="Dry, 32°C…" /></div>
                <div className="wt-field"><label>Time on site (minutes)</label>
                  <input className="wt-input" type="number" value={f.duration_minutes} onChange={(e) => set('duration_minutes', e.target.value)} /></div>
              </div>
              <div className="wt-field"><label>Attendees</label>
                <input className="wt-input" value={f.attendees} onChange={(e) => set('attendees', e.target.value)}
                  placeholder="Names of everyone present — assessor, provider crew, client rep" /></div>
              <label className="wt-toggle" style={{ padding: '10px 12px', border: '1px solid var(--wt-line)', borderRadius: 8 }}>
                <input type="checkbox" checked={f.client_present} onChange={(e) => set('client_present', e.target.checked)} />
                <span>Client representative present during the assessment</span>
              </label>
            </>
          )}

          {/* ── 2 TANK ── */}
          {step === 1 && (
            <>
              <div className="wt-wizpane-h"><h2>{svcAssess().profile_label}</h2>
                <p>What is actually on site. This drives the checklist template and the services you can recommend.</p></div>
              <div className="wt-grid3">
                <div className="wt-field"><label>{eq.type_label}</label>
                  <select className="wt-select" value={f.tank_type} onChange={(e) => set('tank_type', e.target.value)}>
                    <option value="">Select…</option>{(ref?.tank_types || eq.type_options).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>Material / Make</label>
                  <select className="wt-select" value={f.tank_material} onChange={(e) => set('tank_material', e.target.value)}>
                    <option value="">Select…</option>{(ref?.materials || []).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>{eq.capacity_label}</label>
                  <input className="wt-input" value={f.tank_capacity} onChange={(e) => set('tank_capacity', e.target.value)} placeholder={eq.capacity_placeholder} /></div>
              </div>
              <div className="wt-grid3">
                <div className="wt-field"><label>Location on site</label>
                  <input className="wt-input" value={f.tank_location} onChange={(e) => set('tank_location', e.target.value)} placeholder="Rooftop, north wing…" /></div>
                <div className="wt-field"><label>{eq.source_label}</label>
                  <select className="wt-select" value={f.water_source} onChange={(e) => set('water_source', e.target.value)}>
                    <option value="">Select…</option>{(ref?.water_sources || eq.source_options).map((t) => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="wt-field"><label>Last cleaned</label>
                  <input className="wt-input" value={f.last_cleaned} onChange={(e) => set('last_cleaned', e.target.value)} placeholder="e.g. 14 months ago" /></div>
              </div>
              <div className="wt-field"><label>Equipment used on the visit</label>
                <div className="wt-checkgrid">
                  {(ref?.equipment_options || []).map((eq) => (
                    <button key={eq} type="button" className={`wt-checkitem${f.equipment.includes(eq) ? ' on' : ''}`} onClick={() => toggleIn('equipment', eq)}>
                      <span className="box">{f.equipment.includes(eq) ? <Check size={12} /> : null}</span>{eq}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 3 SAFETY CHECKLIST ── */}
          {step === 2 && (
            <>
              <div className="wt-wizpane-h"><h2>Safety verification checklist</h2>
                <p>Pick the template that matches the site, work through the list, and add any check this site needs that the standard list does not cover.</p></div>
              <div className="wt-field"><label>Checklist template</label>
                <select className="wt-select" value={f.template_key} onChange={(e) => set('template_key', e.target.value)}>
                  {(ref?.templates || []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <span className="hint">Switching template adds its extra checks; anything you have already ticked is kept.</span>
              </div>

              <div className="wt-note">
                <strong>{ticked} verified</strong> · {activeChecks.length - ticked - flagged} outstanding{flagged ? ` · ${flagged} marked N/A` : ''}
              </div>

              {Object.entries(grouped).map(([group, items]) => (
                <div className="wt-checkgroup" key={group}>
                  <div className="wt-checkgroup-h">{group}</div>
                  {items.map((c) => {
                    const state = f.checklist[c.key];
                    return (
                      <div className={`wt-checkrow${state === true ? ' on' : ''}`} key={c.key}>
                        <span className="tick" role="button" tabIndex={0} onClick={() => toggleCheck(c.key)}
                          onKeyDown={(e) => { if (e.key === 'Enter') toggleCheck(c.key); }}>
                          {state === true ? <Check size={12} /> : null}
                        </span>
                        <span className="lbl" role="button" tabIndex={0} onClick={() => toggleCheck(c.key)}
                          onKeyDown={(e) => { if (e.key === 'Enter') toggleCheck(c.key); }}>{c.label}</span>
                        {c.custom && <span className="own">Added</span>}
                        <button type="button" className={`na${state === 'na' ? ' on' : ''}`} onClick={() => markNa(c.key)}>N/A</button>
                        {c.custom && <button type="button" className="wt-iconbtn" onClick={() => removeCustomCheck(c.key)}><X size={13} /></button>}
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="wt-field">
                <label>Add a check for this site</label>
                <div className="wt-addcheck">
                  <input className="wt-input" value={newCheck} onChange={(e) => setNewCheck(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCheck(); } }}
                    placeholder="e.g. Roof hatch hinge replaced before entry" />
                  <button type="button" className="wt-btn primary" onClick={addCustomCheck}><Plus size={14} /> Add</button>
                </div>
                <span className="hint">Added checks are saved with this assessment and appear on its report.</span>
              </div>

              <div className="wt-grid2">
                <div className="wt-field"><label>Access notes</label>
                  <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.access_notes} onChange={(e) => set('access_notes', e.target.value)} /></div>
                <div className="wt-field"><label>Structural notes</label>
                  <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.structural_notes} onChange={(e) => set('structural_notes', e.target.value)} /></div>
              </div>
            </>
          )}

          {/* ── 4 WATER QUALITY ── */}
          {step === 3 && (
            <>
              <div className="wt-wizpane-h"><h2>{svcAssess().quality_label}</h2>
                <p>What you can see, and what the on-site checks say. Readings here feed the assessment report.</p></div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Contamination observed</label>
                  <input className="wt-input" value={f.contamination} onChange={(e) => set('contamination', e.target.value)}
                    placeholder="Algae bloom, sediment, biofilm…" /></div>
                <div className="wt-field"><label>Leakage observed</label>
                  <input className="wt-input" value={f.leakage} onChange={(e) => set('leakage', e.target.value)}
                    placeholder="Hairline crack at base joint…" /></div>
              </div>
              <div className="wt-field"><label>On-site water test readings</label>
                <div className="wt-grid3">
                  <input className="wt-input" value={f.water_test.ph || ''} onChange={(e) => setWater('ph', e.target.value)} placeholder="pH" />
                  <input className="wt-input" value={f.water_test.tds || ''} onChange={(e) => setWater('tds', e.target.value)} placeholder="TDS (ppm)" />
                  <input className="wt-input" value={f.water_test.turbidity || ''} onChange={(e) => setWater('turbidity', e.target.value)} placeholder="Turbidity (NTU)" />
                </div>
                <div className="wt-grid2" style={{ marginTop: 8 }}>
                  <input className="wt-input" value={f.water_test.chlorine || ''} onChange={(e) => setWater('chlorine', e.target.value)} placeholder="Residual chlorine (mg/L)" />
                  <input className="wt-input" value={f.water_test.bacteria || ''} onChange={(e) => setWater('bacteria', e.target.value)} placeholder="Bacteria / coliform result" />
                </div>
              </div>
            </>
          )}

          {/* ── 5 RISKS & SCOPE ── */}
          {step === 4 && (
            <>
              <div className="wt-wizpane-h"><h2>Risks, scope &amp; variations</h2>
                <p>Every risk needs a control measure. Variations are extra work found on site — they carry into the quotation.</p></div>

              {uncontrolled > 0 && (
                <div className="wt-note" style={{ background: 'var(--wt-amber-bg)', borderColor: '#fde68a', color: 'var(--wt-amber)' }}>
                  <AlertTriangle size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                  {uncontrolled} risk{uncontrolled === 1 ? '' : 's'} without a control measure.
                </div>
              )}

              <div className="wt-field"><label>Risks identified</label>
                {f.risks.map((r, i) => (
                  <div className="wt-riskrow" key={i} style={{ marginBottom: 8 }}>
                    <input className="wt-input" value={r.risk} onChange={(e) => setRisk(i, 'risk', e.target.value)}
                      placeholder="Risk (e.g. confined space entry without forced ventilation)" />
                    <select className="wt-select" value={r.level} onChange={(e) => setRisk(i, 'level', e.target.value)}>
                      {(ref?.risk_levels || ['Low', 'Medium', 'High', 'Critical']).map((l) => <option key={l}>{l}</option>)}
                    </select>
                    <button className="wt-iconbtn" onClick={() => delRisk(i)}><X size={14} /></button>
                    <input className="wt-input" style={{ gridColumn: '1 / -1' }} value={r.control}
                      onChange={(e) => setRisk(i, 'control', e.target.value)} placeholder="Control measure" />
                  </div>
                ))}
                <button className="wt-btn" style={{ alignSelf: 'flex-start' }} onClick={addRisk}><Plus size={14} /> Add risk</button>
              </div>

              <div className="wt-field"><label>Recommended services</label>
                <div className="wt-checkgrid">
                  {(ref?.recommended_services || []).map((sv) => (
                    <button key={sv} type="button" className={`wt-checkitem${f.recommended_services.includes(sv) ? ' on' : ''}`}
                      onClick={() => toggleIn('recommended_services', sv)}>
                      <span className="box">{f.recommended_services.includes(sv) ? <Check size={12} /> : null}</span>{sv}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wt-field"><label>Variations to the original scope</label>
                {f.variations.map((v, i) => (
                  <div className="wt-riskrow" key={i} style={{ marginBottom: 8 }}>
                    <input className="wt-input" value={v.item} onChange={(e) => setVariation(i, 'item', e.target.value)} placeholder="Additional work required" />
                    <input className="wt-input" type="number" value={v.estimate} onChange={(e) => setVariation(i, 'estimate', e.target.value)} placeholder="Est. ৳" />
                    <button className="wt-iconbtn" onClick={() => delVariation(i)}><X size={14} /></button>
                    <input className="wt-input" style={{ gridColumn: '1 / -1' }} value={v.reason}
                      onChange={(e) => setVariation(i, 'reason', e.target.value)} placeholder="Why it is needed" />
                  </div>
                ))}
                <button className="wt-btn" style={{ alignSelf: 'flex-start' }} onClick={addVariation}><Plus size={14} /> Add variation</button>
                {variationTotal > 0 && <span className="hint">Variation estimate total: <strong>{bdt(variationTotal)}</strong></span>}
              </div>

              <div className="wt-field"><label>Findings &amp; scope recommendations</label>
                <textarea className="wt-input" rows={5} style={{ resize: 'vertical' }} value={f.findings}
                  onChange={(e) => set('findings', e.target.value)}
                  placeholder="What you found, what you recommend, and anything the client should know." /></div>

              <label className="wt-toggle" style={{ padding: '10px 12px', border: '1px solid var(--wt-line)', borderRadius: 8 }}>
                <input type="checkbox" checked={f.scope_confirmed} onChange={(e) => set('scope_confirmed', e.target.checked)} />
                <span>Scope confirmed with the client</span>
              </label>
            </>
          )}

          {/* ── 6 PHOTOS ── */}
          {step === 5 && (
            <>
              <div className="wt-wizpane-h"><h2>Photographic evidence</h2>
                <p>Sec. 8 Step 10 requires before &amp; after photos. Drag several in at once — each one takes a caption.</p></div>
              <WtPhotoGrid label="Before / condition photos" value={f.photos} onChange={(v) => set('photos', v)}
                hint="Tank interior, sediment, cracks, access route, existing damage" />
              <WtPhotoGrid label="After / completion photos" value={f.photos_after} onChange={(v) => set('photos_after', v)}
                hint="Cleaned tank, repairs made, restored access" />
            </>
          )}

          {/* ── 7 SIGN-OFF ── */}
          {step === 6 && (
            <>
              <div className="wt-wizpane-h"><h2>Sign-off</h2>
                <p>Confirm the assessment is complete. Once signed off it can be turned into a quotation.</p></div>

              <div className="wt-gates">
                {[
                  ['Client and visit details recorded', !!f.client_name && !!f.assessed_date],
                  ['Tank profile captured', !!f.tank_type && !!f.tank_capacity],
                  [`Safety checklist worked through (${ticked}/${activeChecks.length})`, ticked > 0],
                  ['Findings written up', !!f.findings.trim()],
                  ['Photo evidence attached', f.photos.length + f.photos_after.length > 0],
                  ['Every risk has a control measure', uncontrolled === 0],
                  ['Scope confirmed with the client', f.scope_confirmed],
                ].map(([label, ok]) => (
                  <div className={`wt-gate${ok ? ' ok' : ''}`} key={label}>
                    <span className="ic">{ok ? <Check size={13} /> : <X size={13} />}</span>
                    <div className="tx"><span className="l">{label}</span></div>
                  </div>
                ))}
              </div>

              <div className="wt-grid2">
                <div className="wt-field"><label>Signed off by</label>
                  <input className="wt-input" value={f.signed_off_by} onChange={(e) => set('signed_off_by', e.target.value)} /></div>
                <div className="wt-field"><label>Sign-off date</label>
                  <DatePicker value={f.signed_off_date} onChange={(v) => set('signed_off_date', v)} /></div>
              </div>

              <div className="wt-field"><label>Mark the assessment</label>
                <select className="wt-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <span className="hint">Set to Completed once the visit is done and the report is written up.</span>
              </div>
            </>
          )}

          <div className="wt-wizfoot">
            {step > 0 && <button className="wt-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button>}
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--wt-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            <button className="wt-btn primary" disabled={saving} onClick={next}>
              {step < STEPS.length - 1
                ? <>Save &amp; continue <ChevronRight size={14} /></>
                : saving ? 'Saving…' : <><Check size={14} /> Finish assessment</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
