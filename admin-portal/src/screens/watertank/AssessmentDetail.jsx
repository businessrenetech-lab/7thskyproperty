import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Check, X, Image, ArrowRight, Pencil, Trash2, AlertTriangle, ShieldAlert, RefreshCw,
  Droplets, PenLine, Camera, Wrench, MessageSquare,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav,
  WtHead, Pill, Loading, EmptyState, dateFmt, bdt,
  toast, errText, parseJson, svcEquip,
} from './common';
import RecordComments from './RecordComments';
import { fileSrc } from '../../ui/FileUpload';

/*
 * One site assessment — its own route, reading as the assessment report an
 * engineer would hand over: tank profile, safety verification, water quality,
 * risks, scope & variations, photographic evidence and sign-off.
 * SSPC-WTCM-SOP-02 Sec. 8 Steps 8–10.
 */

const RISK_TONE = { critical: 'red', high: 'red', medium: 'amber', low: 'slate' };
const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];


const Section = ({ icon: Icon, title, sop, right, children }) => (
  <div className="wt-asec">
    <div className="wt-asec-h">
      <Icon size={15} style={{ color: 'var(--wt-accent-ink)' }} />
      <h3>{title}</h3>
      {right}
      {sop && <span className="sop">{sop}</span>}
    </div>
    <div className="wt-asec-b">{children}</div>
  </div>
);

export default function AssessmentDetail() {
  const { code } = useParams();
  const nav = useSvcNav();
  const eq = svcEquip();
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ref, setRef] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-ops/site-assessments/${code}`)
      .then((r) => setRec(r.data))
      .catch((e) => { setRec(null); setError(errText(e, 'Could not load this assessment')); })
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);
  useEffect(() => { api.get('/wt-ops/assessment-reference').then((r) => setRef(r.data)).catch(() => setRef(null)); }, []);

  if (loading) return <Loading />;
  if (error || !rec) return (
    <>
      <WtHead title="Assessment not found"
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/site-assessments')}>Site Assessments</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title={`No assessment with code ${code}`} hint={error}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/site-assessments')}>Back to the register</button>} /></div>
    </>
  );

  const checklist = parseJson(rec.checklist, {}) || {};
  const customChecks = parseJson(rec.custom_checks, []) || [];
  const equipment = parseJson(rec.equipment, []) || [];
  const template = (ref?.templates || []).find((t) => t.key === (rec.template_key || 'standard'));
  const activeChecks = [...(ref?.standard_checks || []), ...((template?.extra) || []), ...customChecks];
  const risks = parseJson(rec.risks, []) || [];
  const variations = parseJson(rec.variations, []) || [];
  const recommended = parseJson(rec.recommended_services, []) || [];
  const waterTest = parseJson(rec.water_test, {}) || {};
  const photosBefore = parseJson(rec.photos, []) || [];
  const photosAfter = parseJson(rec.photos_after, []) || [];

  const verified = activeChecks.filter((c) => checklist[c.key] === true).length;
  const notApplicable = activeChecks.filter((c) => checklist[c.key] === 'na').length;
  const variationTotal = variations.reduce((s, v) => s + Number(v.estimate || 0), 0);
  const topRisk = risks.find((r) => ['critical', 'high'].includes(String(r.level || '').toLowerCase()));
  const uncontrolled = risks.filter((r) => !r.control).length;

  const setStatus = async (status) => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/wt-ops/site-assessments/${rec.id}`, { status });
      setRec(data);
      toast.ok(`${rec.code} → ${status}`);
    } catch (e) { toast.err(errText(e, 'Could not update the status')); }
    finally { setBusy(false); }
  };


  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/wt-ops/site-assessments/${rec.id}`);
      toast.ok(`${rec.code} deleted`);
      nav('/water-tank/site-assessments');
    } catch (e) { toast.err(errText(e, 'Could not delete')); setBusy(false); }
  };

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/site-assessments')}>Site Assessments</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>{rec.code}</span>
        </div>}
        title={rec.client_name}
        subtitle={[rec.tank_type, rec.tank_capacity, rec.tank_location].filter(Boolean).join(' · ') || `${eq.section_label.replace(' Details', '')} profile not yet captured`}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={() => nav(`/water-tank/site-assessments/${rec.code}/edit`)}><Pencil size={14} /> Edit assessment</button>
        <button className="wt-btn primary" onClick={() => nav(`/water-tank/site-assessments/${rec.code}/quotation`)}>Build Quotation <ArrowRight size={14} /></button>
      </WtHead>

      {/* ── status strip ── */}
      <div className="wt-statusstrip">
        <Pill value={rec.status} />
        <span className="wt-pill cyan">{verified}/{activeChecks.length} safety checks</span>
        {risks.length > 0 && <span className={`wt-pill ${topRisk ? 'red' : 'amber'}`}>{risks.length} risk{risks.length === 1 ? '' : 's'}</span>}
        {rec.scope_confirmed
          ? <span className="wt-pill green"><Check size={11} /> Scope confirmed</span>
          : <span className="wt-pill amber"><X size={11} /> Scope not confirmed</span>}
        {variationTotal > 0 && <span className="wt-pill blue">{bdt(variationTotal)} variations</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {STATUSES.filter((s) => s !== rec.status).map((s) => (
            <button key={s} className="wt-btn sm" disabled={busy} onClick={() => setStatus(s)}>Mark {s}</button>
          ))}
        </div>
      </div>

      {topRisk && (
        <div className="wt-note" style={{ background: 'var(--wt-red-bg)', borderColor: '#fecdd3', color: 'var(--wt-red)' }}>
          <AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          <strong>{topRisk.level} risk identified:</strong> {topRisk.risk}
          {topRisk.control ? ` — control: ${topRisk.control}` : ' — no control measure recorded'}
          {uncontrolled > 0 && ` · ${uncontrolled} risk${uncontrolled === 1 ? '' : 's'} without a control measure`}
        </div>
      )}

      <div className="wt-detail-grid" style={{ gridTemplateColumns: '340px 1fr' }}>
        {/* ── left: profile ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start' }}>
          <div className="wt-card wt-detailcard">
            <div className="eyebrow">Assessment</div>
            <div className="wt-profile">
              {[['Assessment ID', rec.code], ['Client', rec.client_name], ['Project', rec.project_id],
                ['Provider', rec.provider], ['Assessor', rec.assessor], ['Date', dateFmt(rec.assessed_date)],
                ['Signed off', rec.signed_off_by ? `${rec.signed_off_by} · ${dateFmt(rec.signed_off_date)}` : null]]
                .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
            </div>
          </div>

          <div className="wt-card wt-detailcard">
            <div className="eyebrow">{eq.section_label}</div>
            <div className="wt-profile">
              {[['Type', rec.tank_type], ['Material / Make', rec.tank_material], [eq.capacity_label, rec.tank_capacity],
                ['Location', rec.tank_location], [eq.source_label, rec.water_source], ['Last serviced', rec.last_cleaned]]
                .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
            </div>
          </div>

          {(rec.attendees || rec.weather || rec.duration_minutes > 0 || equipment.length > 0) && (
            <div className="wt-card wt-detailcard">
              <div className="eyebrow">Visit Context</div>
              <div className="wt-profile">
                {[['Attendees', rec.attendees], ['Client present', rec.client_present ? 'Yes' : 'No'],
                  ['Conditions', rec.weather],
                  ['Time on site', rec.duration_minutes > 0 ? `${rec.duration_minutes} min` : null]]
                  .filter(([, v]) => v).map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>)}
              </div>
              {equipment.length > 0 && (
                <>
                  <div className="wt-sec-title">Equipment used</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {equipment.map((e) => <span key={e} className="wt-pill sm slate">{e}</span>)}
                  </div>
                </>
              )}
            </div>
          )}

          {Object.values(waterTest).some(Boolean) && (
            <div className="wt-card wt-detailcard">
              <div className="eyebrow">Water Test Readings</div>
              <div className="wt-profile">
                {[['pH', waterTest.ph], ['TDS', waterTest.tds && `${waterTest.tds} ppm`],
                  ['Turbidity', waterTest.turbidity && `${waterTest.turbidity} NTU`],
                  ['Residual chlorine', waterTest.chlorine && `${waterTest.chlorine} mg/L`],
                  ['Bacteria / coliform', waterTest.bacteria]]
                  .filter(([, v]) => v)
                  .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>)}
              </div>
            </div>
          )}

          <button className="wt-btn danger-ghost" style={{ marginRight: 0, justifyContent: 'center' }} disabled={busy} onClick={remove}>
            <Trash2 size={14} /> Delete assessment
          </button>
        </div>

        {/* ── right: the report ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section icon={ShieldAlert} title="Safety Verification"
            sop={`${verified}/${activeChecks.length} verified${notApplicable ? ` \u00b7 ${notApplicable} N/A` : ''}`}>
            {template && template.key !== 'standard' && (
              <span className="wt-pill sm cyan" style={{ alignSelf: 'flex-start' }}>{template.label} template</span>
            )}
            <div className="wt-checklist">
              {activeChecks.map((c) => {
                const state = checklist[c.key];
                return (
                  <div key={c.key} className={`wt-check${state === true ? ' on' : ''}`} style={state === 'na' ? { opacity: 0.55 } : undefined}>
                    <span className="box">{state === true ? <Check size={13} /> : null}</span>
                    {c.label}
                    {state === 'na' && <span className="wt-pill sm slate" style={{ marginLeft: 6 }}>N/A</span>}
                    {c.custom && <span className="wt-pill sm cyan" style={{ marginLeft: 6 }}>Added</span>}
                  </div>
                );
              })}
              {!activeChecks.length && <span className="muted" style={{ fontSize: 12.5 }}>Checklist not started.</span>}
            </div>
            {(rec.access_notes || rec.structural_notes) && (
              <div className="wt-grid2">
                {rec.access_notes && <div><div className="wt-sec-title" style={{ marginBottom: 4 }}>Access notes</div>
                  <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0 }}>{rec.access_notes}</p></div>}
                {rec.structural_notes && <div><div className="wt-sec-title" style={{ marginBottom: 4 }}>Structural notes</div>
                  <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0 }}>{rec.structural_notes}</p></div>}
              </div>
            )}
          </Section>

          {(rec.contamination || rec.leakage) && (
            <Section icon={Droplets} title="Contamination & Leakage" sop="Inspect site">
              <div className="wt-grid2">
                <div>
                  <div className="wt-sec-title" style={{ marginBottom: 4 }}>Contamination observed</div>
                  <p style={{ fontSize: 12.5, color: rec.contamination ? 'var(--wt-red)' : 'var(--wt-muted)', fontWeight: rec.contamination ? 600 : 400, margin: 0 }}>{rec.contamination || 'None recorded'}</p>
                </div>
                <div>
                  <div className="wt-sec-title" style={{ marginBottom: 4 }}>Leakage observed</div>
                  <p style={{ fontSize: 12.5, color: rec.leakage ? 'var(--wt-red)' : 'var(--wt-muted)', fontWeight: rec.leakage ? 600 : 400, margin: 0 }}>{rec.leakage || 'None recorded'}</p>
                </div>
              </div>
            </Section>
          )}

          <Section icon={AlertTriangle} title="Risks Identified" sop="Sec. 8 Step 8">
            {risks.length ? (
              <table className="wt-tbl">
                <thead><tr><th>Risk</th><th style={{ width: 104 }}>Level</th><th style={{ width: '42%' }}>Control measure</th></tr></thead>
                <tbody>{risks.map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.risk}</strong></td>
                    <td><span className={`wt-pill sm ${RISK_TONE[String(r.level || '').toLowerCase()] || 'slate'}`}>{r.level}</span></td>
                    <td className="muted">{r.control || <span style={{ color: 'var(--wt-red)', fontWeight: 600 }}>Not recorded</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <span className="muted" style={{ fontSize: 12.5 }}>No risks recorded.</span>}
          </Section>

          <Section icon={Wrench} title="Scope & Variations" sop={rec.scope_confirmed ? 'Scope confirmed' : 'Scope not confirmed'}>
            <div>
              <div className="wt-sec-title" style={{ marginBottom: 6 }}>Recommended services</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {recommended.length
                  ? recommended.map((r) => <span key={r} className="wt-pill sm cyan">{r}</span>)
                  : <span className="muted" style={{ fontSize: 12.5 }}>None recorded.</span>}
              </div>
            </div>
            {variations.length > 0 && (
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 6 }}>Variations — {bdt(variationTotal)} estimated</div>
                <table className="wt-tbl">
                  <thead><tr><th>Additional work</th><th style={{ width: '40%' }}>Reason</th><th style={{ width: 116, textAlign: 'right' }}>Estimate</th></tr></thead>
                  <tbody>{variations.map((v, i) => (
                    <tr key={i}>
                      <td><strong>{v.item}</strong></td>
                      <td className="muted">{v.reason || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(v.estimate)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div>
              <div className="wt-sec-title" style={{ marginBottom: 6 }}>Findings &amp; recommendations</div>
              <div style={{ background: '#f8fafc', border: '1px solid var(--wt-line)', borderRadius: 8, padding: 12, fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {rec.findings || 'No findings recorded.'}
              </div>
            </div>
          </Section>

          <Section icon={Camera} title="Photographic Evidence" sop="Sec. 8 Step 10">
            {[['Before / condition', photosBefore], ['After / completion', photosAfter]].map(([label, list]) => (
              <div key={label}>
                <div className="wt-sec-title" style={{ marginBottom: 6 }}>{label} ({list.length})</div>
                <div className="wt-photogrid">
                  {list.map((p, i) => (
                    <div key={i} className="wt-photocard">
                      <a className="thumb" href={p.url ? fileSrc(p.url) : undefined} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        {p.url ? <img src={fileSrc(p.url)} alt={p.caption || `Photo ${i + 1}`} loading="lazy" /> : <Image size={22} />}
                      </a>
                      <div style={{ padding: '7px 9px', fontSize: 11.5, color: 'var(--wt-ink-2)', borderTop: '1px solid var(--wt-line)' }}>
                        {p.caption || `Photo ${i + 1}`}
                      </div>
                    </div>
                  ))}
                  {!list.length && <span className="muted" style={{ fontSize: 12.5 }}>None.</span>}
                </div>
              </div>
            ))}
          </Section>

          <Section icon={MessageSquare} title="Comments & Observations" sop="Running notes">
            <RecordComments entityType="site-assessments" entityId={rec.id} categories={ref?.comment_categories} />
          </Section>

          <Section icon={PenLine} title="Sign-Off" sop="Sec. 9 Step 11">
            {rec.signed_off_by ? (
              <div className="wt-note" style={{ background: 'var(--wt-green-bg)', borderColor: '#a7f3d0', color: 'var(--wt-green)' }}>
                Signed off by <strong>{rec.signed_off_by}</strong> on {dateFmt(rec.signed_off_date)}.
              </div>
            ) : (
              <div className="wt-note">
                Not yet signed off. Completion review (Sec. 9 Step 11) confirms the work is done, reports are in and the client is satisfied.
                <button className="wt-btn sm" style={{ marginLeft: 10 }} onClick={() => nav(`/water-tank/site-assessments/${rec.code}/edit`)}>Record sign-off</button>
              </div>
            )}
          </Section>
        </div>
      </div>

    </>
  );
}
