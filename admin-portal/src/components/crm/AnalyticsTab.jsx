import React from 'react';
import { stageColors, stageLabels, stageIcons } from './CRMComponents';
import { TrendingUp, DollarSign, XCircle, Radar, BarChart2, GraduationCap } from 'lucide-react';

const AnalyticsTab = ({ analytics }) => {
  const { funnel, source, forecast, successResults, destinationCountries } = analytics;
  const maxCount = funnel?.funnel ? Math.max(...funnel.funnel.map(f => f.count), 1) : 1;
  const totalSuccessResults = successResults?.reduce((sum, item) => sum + Number(item.dataValues?.count || item.count || 0), 0) || 0;
  const totalDestinationCountries = destinationCountries?.reduce((sum, item) => sum + Number(item.dataValues?.count || item.count || 0), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* KPIs */}
      <div className="pulse-grid pg-6" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'CONVERSION RATE', value: `${funnel?.overallConversion || 0}%`, sub: 'Lead → Successful', c: 'c-mint', icon: <TrendingUp size={32} /> },
          { label: 'REAL REVENUE', value: `৳${(funnel?.successfulRevenue || 0).toLocaleString()}`, sub: 'Fees collected only', c: 'c-cyan', icon: <DollarSign size={32} /> },
          { label: 'PAYMENT REJECTED', value: `${funnel?.paymentRejectedCount || 0}`, sub: `৳${(funnel?.rejectedRevenue || 0).toLocaleString()} lost at POS`, c: 'c-rose', icon: <XCircle size={32} /> },
          { label: 'FORECAST', value: `৳${(forecast?.weightedForecast || 0).toLocaleString()}`, sub: 'Pipeline × Probability', c: 'c-violet', icon: <Radar size={32} /> },
          { label: 'PIPELINE', value: `৳${(forecast?.totalPipelineValue || 0).toLocaleString()}`, sub: 'Open opportunities', c: 'c-amber', icon: <BarChart2 size={32} /> },
          { label: 'SUCCESS RECORDS', value: `${totalSuccessResults}`, sub: `${totalDestinationCountries} dest. updates`, c: 'c-cyan', icon: <GraduationCap size={32} /> },
        ].map(k => (
          <div key={k.label} className={`pulse-card ${k.c}`} style={{ padding: '24px 20px' }}>
            <div className="pc-icon" style={{ top: '24px', right: '20px', opacity: 0.15 }}>{k.icon}</div>
            <p className="pc-label">{k.label}</p>
            <h3 className="pc-value" style={{ fontSize: '1.6rem' }}>{k.value}</h3>
            <p className="pc-meta" style={{ marginTop: '6px' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.2rem' }}>
        {/* Funnel */}
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.2rem', fontSize: '1rem', fontWeight: '700' }}>Conversion Funnel</h3>
          {funnel?.funnel?.map((f) => (
            <div key={f.stage} style={{ marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: '600', color: stageColors[f.stage], display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>{stageIcons[f.stage]}</span> {stageLabels[f.stage] || f.stage}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>{f.count} · {f.conversionRate}%</span>
              </div>
              <div style={{ height: '10px', background: 'var(--glass)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ width: `${Math.max((f.count / maxCount) * 100, 2)}%`, height: '100%', background: `linear-gradient(90deg, ${stageColors[f.stage]}, ${stageColors[f.stage]}80)`, borderRadius: '5px', transition: 'width 0.6s ease', boxShadow: `0 0 10px ${stageColors[f.stage]}80` }} />
              </div>
            </div>
          ))}
          {(!funnel?.funnel || funnel.funnel.length === 0) && <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No data yet</p>}
        </div>

        {/* Source ROI */}
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.2rem', fontSize: '1rem', fontWeight: '700' }}>Lead Source Performance</h3>
          {source && source.length > 0 ? source.map((s, i) => {
            const total = parseInt(s.dataValues?.total || s.total || 0);
            const converted = parseInt(s.dataValues?.converted || s.converted || 0);
            const revenue = parseFloat(s.dataValues?.revenue || s.revenue || 0);
            const rejected = parseInt(s.dataValues?.payment_rejected || s.payment_rejected || 0);
            const convRate = total > 0 ? ((converted / total) * 100).toFixed(0) : 0;
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors[i % colors.length] }} />
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{s.source || 'Unknown'}</span>
                     {(revenue > 0 || rejected > 0) && <p style={{ fontSize: '0.65rem', color: revenue > 0 ? '#10b981' : '#ef4444' }}>{[revenue > 0 ? `৳${revenue.toLocaleString()} revenue` : null, rejected > 0 ? `${rejected} rejected at payment` : null].filter(Boolean).join(' · ')}</p>}
                   </div>
                 </div>
                 <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', alignItems: 'center' }}>
                   <span style={{ color: 'var(--text-dim)' }}>{total} leads</span>
                   {rejected > 0 && <span style={{ color: '#ef4444', fontWeight: '700' }}>{rejected} rejected</span>}
                   <span style={{ color: convRate > 20 ? '#10b981' : '#f59e0b', fontWeight: '700', fontSize: '0.75rem', padding: '2px 6px', background: convRate > 20 ? '#10b98110' : '#f59e0b10', borderRadius: '6px' }}>{convRate}%</span>
                 </div>
              </div>
            );
          }) : <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No source data yet</p>}
        </div>
      </div>

      {/* Revenue Forecast by Stage */}
      {forecast?.byStage && forecast.byStage.some(s => s.count > 0) && (
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '700' }}>Pipeline by Deal Stage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {forecast.byStage.map(s => (
              <div key={s.stage} style={{ padding: '1rem', background: 'var(--glass)', borderRadius: '10px', borderLeft: `3px solid ${stageColors[s.stage]}`, textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', color: stageColors[s.stage], fontWeight: '700', textTransform: 'uppercase' }}>{s.stage}</p>
                <h4 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0.3rem 0' }}>৳{s.value.toLocaleString()}</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{s.count} deals</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.2rem' }}>
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '700' }}>Successful Students by Final Result</h3>
          {successResults && successResults.length > 0 ? successResults.map((item, index) => {
            const label = item.final_course_result || item.dataValues?.final_course_result || 'Unknown';
            const count = Number(item.count || item.dataValues?.count || 0);
            const width = totalSuccessResults > 0 ? Math.max((count / totalSuccessResults) * 100, 8) : 8;
            return (
              <div key={`${label}-${index}`} style={{ marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: '600' }}>{label}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{count}</span>
                </div>
                <div style={{ height: '10px', background: 'var(--glass)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ width: `${width}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: '6px', transition: 'width 0.6s ease', boxShadow: '0 0 10px #8b5cf680' }} />
                </div>
              </div>
            );
          }) : <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No success result records yet</p>}
        </div>

        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '700' }}>Successful Destination Countries</h3>
          {destinationCountries && destinationCountries.length > 0 ? destinationCountries.map((item, index) => {
            const label = item.success_destination_country || item.dataValues?.success_destination_country || 'Unknown';
            const count = Number(item.count || item.dataValues?.count || 0);
            const width = totalDestinationCountries > 0 ? Math.max((count / totalDestinationCountries) * 100, 8) : 8;
            return (
              <div key={`${label}-${index}`} style={{ marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: '600' }}>{label}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{count}</span>
                </div>
                <div style={{ height: '10px', background: 'var(--glass)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ width: `${width}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '6px', transition: 'width 0.6s ease', boxShadow: '0 0 10px #10b98180' }} />
                </div>
              </div>
            );
          }) : <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No destination-country records yet</p>}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
