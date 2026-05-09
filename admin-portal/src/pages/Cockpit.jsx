import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, DollarSign, BookOpen, Loader2, Activity, CheckCircle2, 
  AlertCircle, GraduationCap, Briefcase, Target, MessageSquare, PlayCircle, 
  Wallet, Receipt, PieChart, BarChart3, LineChart as LineChartIcon, Mail, Flame
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import QuickCheckIn from '../components/QuickCheckIn';
import HRMDashboard from './HRMDashboard';
import '../styles/GlobalStyles.css';

const PulseCard = ({ title, value, trend, icon, color }) => (
  <div className="glass-morphism pulse-card" style={{ padding: '1.25rem', flex: '1', minWidth: 0, position: 'relative', overflow: 'hidden', borderBottom: `4px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
        <h2 style={{ fontSize: '1.7rem', margin: '0.35rem 0', fontWeight: '800', fontFamily: 'var(--font-heading)', lineHeight: 1.05 }}>{value}</h2>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ padding: '2px 6px', borderRadius: '4px', background: trend.startsWith('+') ? 'rgba(0, 255, 148, 0.1)' : (trend.startsWith('-') ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255,255,255,0.1)'), display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} color={trend.startsWith('+') ? '#00FF94' : (trend.startsWith('-') ? '#FF4D6D' : 'var(--text-dim)')} />
              <span style={{ fontSize: '0.7rem', color: trend.startsWith('+') ? '#00FF94' : (trend.startsWith('-') ? '#FF4D6D' : 'var(--text-dim)'), fontWeight: '700' }}>
                {trend}
              </span>
            </div>
          </div>
        )}
      </div>
      <div style={{ background: color, padding: '0.65rem', borderRadius: '12px', color: 'white', boxShadow: `0 4px 12px ${color}44` }}>{icon}</div>
    </div>
  </div>
);

const CHART_COLORS = ['#00D4FF', '#00FF94', '#FFB347', '#9B6DFF', '#FF4D6D', '#38E8FF'];
const PIPELINE_ORDER = ['new', 'contacted', 'interested', 'trial', 'fees_pending', 'payment_rejected', 'enrolled', 'successful', 'lost'];

const formatCurrency = (value) => `৳${Number(value || 0).toLocaleString()}`;
const formatNumber = (value) => Number(value || 0).toLocaleString();
const safePercent = (value) => Math.max(0, Math.min(100, Number(value || 0)));

const COCKPIT_TEXT = '#0f172a';
const COCKPIT_MUTED = '#475569';
const COCKPIT_CARD_BG = '#ffffff';
const COCKPIT_SOFT_BG = '#f8fafc';
const COCKPIT_BORDER = '#d8e0ea';
const COCKPIT_TRACK = '#e2e8f0';
const COCKPIT_MINT = '#059669';
const COCKPIT_CYAN = '#0369a1';
const COCKPIT_AMBER = '#b45309';
const COCKPIT_ROSE = '#be123c';
const COCKPIT_VIOLET = '#6d28d9';

const titleCase = (value) => String(value || 'Unknown')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const pillStyle = (tone) => {
  const tones = {
    mint: ['#d1fae5', COCKPIT_MINT],
    rose: ['#ffe4e6', COCKPIT_ROSE],
    amber: ['#fef3c7', COCKPIT_AMBER],
    cyan: ['#e0f2fe', COCKPIT_CYAN],
    violet: ['#ede9fe', COCKPIT_VIOLET],
    slate: ['#f1f5f9', COCKPIT_MUTED],
  };
  const [background, color] = tones[tone] || tones.slate;
  return { background, color, border: `1px solid ${color}33` };
};

const statusTone = (status) => ({
  new: 'cyan',
  contacted: 'violet',
  interested: 'mint',
  trial: 'amber',
  enrolled: 'mint',
  successful: 'mint',
  fees_pending: 'amber',
  payment_rejected: 'rose',
  lost: 'rose',
  active: 'mint',
  enrolling: 'cyan',
  starting_soon: 'amber',
  completed: 'slate',
}[status] || 'slate');

const priorityTone = (priority) => ({
  hot: 'rose',
  high: 'amber',
  medium: 'cyan',
  low: 'slate',
}[priority] || 'slate');

const MiniPill = ({ children, tone = 'slate' }) => (
  <span style={{ ...pillStyle(tone), padding: '0.25rem 0.55rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
    {children}
  </span>
);

const Cockpit = () => {
  const { branch, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Normalize role matching to avoid bugs with alias roles
  const role = user?.role || 'unassigned';
  const isTeacher = ['teacher', 'trainer'].includes(role);
  const isAccounting = ['accounting', 'accounts'].includes(role);
  const isHR = ['hrm', 'hr'].includes(role);
  const isCRM = ['crm', 'counselor'].includes(role);
  const isBrandManager = role === 'brandmanager';
  const isSuperAdmin = ['super_admin', 'branch_admin'].includes(role);
  const isStudent = role === 'student';

  useEffect(() => {
    fetchDashboardContent();
  }, [branch, role]);

  const fetchDashboardContent = async () => {
    setLoading(true);
    try {
      if (isStudent) {
        const res = await api.get('/pte/performance');
        setData(res.data);
      } else if (isHR) {
        // HRMDashboard fetches its own data internally
        setData({});
      } else {
        const params = new URLSearchParams({ role });
        if (branch && branch !== 'all') params.set('branchId', branch);
        const res = await api.get(`/dashboard/stats?${params.toString()}`);
        setData(res.data);
      }
    } catch (err) {
      console.error('Dashboard fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="canvas"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  // ─── TEACHER VIEW ──────────────────────────────────────────────────────────
  const renderTeacherView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <PulseCard title="My Active Batches" value={data?.totalBatches || 0} icon={<BookOpen size={24} />} color="#00D4FF" />
        <PulseCard title="Student PTE Avg" value="68.5" trend="+2.4" icon={<Activity size={24} />} color="#00FF94" />
        <PulseCard title="Avg Attendance" value="84%" trend="-2%" icon={<CheckCircle2 size={24} />} color="#FFB347" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '1.5rem', '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Upcoming Classes & Material Links</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {data?.teacherBatches?.map(b => (
               <div key={b.id} className="glass-morphism" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <p style={{ fontWeight: '600' }}>{b.name}</p>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Begins: {b.start_date}</p>
                 </div>
                 <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>Dashboard</button>
               </div>
             )) || <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No recent batches found.</p>}
          </div>
        </div>
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Student Performance Alerts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
             <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,77,109,0.1)', color: '#FF4D6D', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
               <AlertCircle size={16} /> 3 Students failing Speaking
             </div>
             <div style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,179,71,0.1)', color: '#FFB347', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
               <AlertCircle size={16} /> Batch B attendance below 70%
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── ACCOUNTING VIEW ───────────────────────────────────────────────────────
  const renderAccountingView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="dashboard-kpi-strip" style={{ display: 'flex', gap: '1rem' }}>
        <PulseCard title="Total Revenue" value={`৳${data?.revenue?.toLocaleString() || 0}`} icon={<DollarSign size={24} />} color="#00FF94" />
        <PulseCard title="Net Profit" value={`৳${data?.netProfit?.toLocaleString() || 0}`} icon={<TrendingUp size={24} />} color="#00D4FF" />
        <PulseCard title="Unpaid Invoices" value={`৳${data?.unpaidInvoices?.toLocaleString() || 0}`} icon={<AlertCircle size={24} />} color="#FF4D6D" />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
        {/* Revenue Trend Chart */}
        <div className="glass-morphism" style={{ padding: '1.5rem', height: '350px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Revenue vs Expenses (6 Months)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={data?.financialTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF94" stopOpacity={0.8}/><stop offset="95%" stopColor="#00FF94" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF4D6D" stopOpacity={0.8}/><stop offset="95%" stopColor="#FF4D6D" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${val/1000}k`} />
              <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="revenue" stroke="#00FF94" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
              <Area type="monotone" dataKey="expense" stroke="#FF4D6D" fillOpacity={1} fill="url(#colorExp)" name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Liquid Accounts Overview */}
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={20} color="#00D4FF" /> Bank & Cash Watch
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
             {data?.liquidAccounts?.map(acc => (
               <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                   <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(0, 212, 255, 0.1)', color: '#00D4FF' }}>
                     {acc.sub_type === 'bank' ? <Briefcase size={16} /> : <Wallet size={16} />}
                   </div>
                   <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{acc.name}</p>
                 </div>
                 <p style={{ fontWeight: '700', fontSize: '1rem', color: '#00FF94' }}>৳{acc.balance?.toLocaleString()}</p>
               </div>
             ))}
             {(!data?.liquidAccounts || data.liquidAccounts.length === 0) && <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No liquid accounts found.</p>}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── CRM VIEW ──────────────────────────────────────────────────────────────
  const renderCRMView = () => {
    const COLORS = ['#00D4FF', '#FFB347', '#9B6DFF', '#00FF94', '#FF4D6D'];
    const leadsPipeline = data?.leadsByStatus?.map(l => ({ name: l.status.toUpperCase(), value: parseInt(l.count) })) || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <PulseCard title="Total Leads" value={data?.totalLeads || 0} icon={<Users size={24} />} color="#00D4FF" />
          <PulseCard title="New Leads (Today)" value={data?.newLeadsToday || 0} icon={<Target size={24} />} color="#FFB347" />
          <PulseCard title="Enrolled Students" value={data?.totalStudents || 0} icon={<GraduationCap size={24} />} color="#00FF94" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
          {/* Pipeline Funnel / Pie */}
          <div className="glass-morphism" style={{ padding: '1.5rem', height: '350px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Lead Pipeline Status</h3>
            {leadsPipeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <RechartsPieChart>
                  <Pie data={leadsPipeline} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {leadsPipeline.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>No pipeline data</div>}
          </div>

          {/* Recent Leads */}
          <div className="glass-morphism" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#00D4FF" /> Recent Lead Influx
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               {data?.recentLeads?.map(lead => (
                 <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                   <div>
                     <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{lead.name}</p>
                     <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{lead.phone || lead.email}</p>
                   </div>
                   <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', background: 'rgba(255,255,255,0.1)' }}>
                     {lead.status}
                   </span>
                 </div>
               ))}
               {(!data?.recentLeads || data.recentLeads.length === 0) && <p style={{ color: 'var(--text-dim)' }}>No recent leads</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── BRAND MANAGER VIEW ────────────────────────────────────────────────────
  const renderBrandManagerView = () => {
    const SRC_COLORS = ['#385898', '#E1306C', '#00FF94', '#FFB347']; // FB, Insta, Organic, Ref
    const sources = data?.leadsBySource || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <PulseCard title="Marketing Spend" value={`৳${data?.marketingSpend?.toLocaleString() || 0}`} icon={<Wallet size={24} />} color="#9B6DFF" />
          <PulseCard title="Total Leads Gen." value={data?.totalLeads || 0} icon={<Users size={24} />} color="#00D4FF" />
          <PulseCard title="Est. Cost Per Lead" value={`৳${data?.costPerLead || 0}`} trend="-12%" icon={<TrendingUp size={24} />} color="#00FF94" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
          {/* Source Breakdown */}
          <div className="glass-morphism" style={{ padding: '1.5rem', height: '350px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Lead Source Acquisition</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={sources} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#00D4FF" radius={[4, 4, 0, 0]}>
                  {sources.map((entry, index) => <Cell key={`cell-${index}`} fill={SRC_COLORS[index % SRC_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Email / SMS Campaign Stubs */}
          <div className="glass-morphism" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} color="#FFB347" /> Active Outbound Campaigns
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #FFB347' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>April Batch Promotion (Email)</p>
                   <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Active</span>
                 </div>
                 <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                   <span>Delivered: 1,240</span>
                   <span>Open Rate: 42%</span>
                   <span>Click Rate: 12%</span>
                 </div>
               </div>
               
               <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #00D4FF' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>Weekend Offer (SMS)</p>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Scheduled</span>
                 </div>
                 <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                   <span>Targeting: 850 Leads</span>
                   <span>Gateway: RouteMobile</span>
                 </div>
               </div>
            </div>
            <p style={{ fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-dim)', marginTop: '1rem' }}>SMS & SMTP Integration Dashboard Coming Soon</p>
          </div>
        </div>
      </div>
    );
  };

  // ─── SUPER ADMIN VIEW ──────────────────────────────────────────────────────
  const renderSuperAdminView = () => {
    const financialTrend = data?.financialTrend || [];
    const leadSources = data?.leadsBySource || [];
    const activeBatches = data?.activeBatches || [];
    const recentLeads = data?.recentLeads || [];
    const hotLeadCount = data?.hotLeadCount ?? data?.hotLeads?.length ?? 0;

    const statusCounts = new Map((data?.leadsByStatus || []).map((item) => [item.status, Number(item.count || 0)]));
    const pipeline = PIPELINE_ORDER
      .map((status) => ({ status, count: statusCounts.get(status) || 0 }))
      .filter((item) => item.count > 0);
    const maxPipeline = Math.max(...pipeline.map((item) => item.count), 1);

    const totalSourceLeads = leadSources.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const branchLabel = branch && branch !== 'all' ? `Branch ${branch}` : 'All selected branches';

    const sectionTitle = (icon, title, subtitle) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem', color: COCKPIT_TEXT }}>{icon}{title}</h3>
          {subtitle && <p style={{ color: COCKPIT_MUTED, fontSize: '0.82rem', fontWeight: 500, margin: 0 }}>{subtitle}</p>}
        </div>
      </div>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="dashboard-kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
          <PulseCard title="Revenue" value={formatCurrency(data?.revenue)} icon={<DollarSign size={24} />} color="#00FF94" />
          <PulseCard title="Expenses" value={formatCurrency(data?.expenses)} icon={<Receipt size={24} />} color="#FF4D6D" />
          <PulseCard title="Net Profit" value={formatCurrency(data?.netProfit)} icon={<TrendingUp size={24} />} color="#00D4FF" />
          <PulseCard title="Students" value={formatNumber(data?.totalStudents)} icon={<GraduationCap size={24} />} color="#9B6DFF" />
          <PulseCard title="Active Batches" value={formatNumber(data?.totalBatches)} icon={<BookOpen size={24} />} color="#FFB347" />
          <PulseCard title="Hot Leads" value={formatNumber(hotLeadCount)} icon={<Flame size={24} />} color="#FF4D6D" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.5rem' }}>
          <div className="glass-morphism" style={{ padding: '1.5rem', height: '380px', color: COCKPIT_TEXT }}>
            {sectionTitle(<LineChartIcon size={20} color="#00D4FF" />, 'Revenue vs Expenses', `6-month trend for ${branchLabel}`)}
            {financialTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="82%">
                <AreaChart data={financialTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="superRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF94" stopOpacity={0.7}/><stop offset="95%" stopColor="#00FF94" stopOpacity={0}/></linearGradient>
                    <linearGradient id="superExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF4D6D" stopOpacity={0.7}/><stop offset="95%" stopColor="#FF4D6D" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke={COCKPIT_MUTED} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={COCKPIT_MUTED} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${Math.round(val / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: 'rgba(3,7,18,0.95)', border: '1px solid var(--border)', borderRadius: '10px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#00FF94" fill="url(#superRev)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#FF4D6D" fill="url(#superExp)" strokeWidth={2} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ height: '82%', display: 'grid', placeItems: 'center', color: COCKPIT_MUTED }}>No finance trend data yet.</div>}
          </div>

          <div className="glass-morphism" style={{ padding: '1.5rem', height: '380px', color: COCKPIT_TEXT }}>
            {sectionTitle(<PieChart size={20} color="#9B6DFF" />, 'Lead Source Mix', `${formatNumber(totalSourceLeads)} leads captured by source`)}
            {leadSources.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', height: '82%', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={leadSources} cx="50%" cy="50%" innerRadius={58} outerRadius={96} paddingAngle={4} dataKey="value">
                      {leadSources.map((entry, index) => <Cell key={`source-${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ background: 'rgba(3,7,18,0.95)', border: '1px solid var(--border)', borderRadius: '10px' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {leadSources.map((source, index) => (
                    <div key={source.name || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.78rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: COCKPIT_MUTED, fontWeight: 600 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: CHART_COLORS[index % CHART_COLORS.length] }} />{titleCase(source.name)}</span>
                      <strong>{formatNumber(source.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div style={{ height: '82%', display: 'grid', placeItems: 'center', color: COCKPIT_MUTED }}>No lead source data yet.</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.5rem' }}>
          <div className="glass-morphism" style={{ padding: '1.5rem', color: COCKPIT_TEXT }}>
            {sectionTitle(<BookOpen size={20} color="#FFB347" />, 'Batch Occupancy', 'Active and enrolling batches with seat fill rate')}
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {activeBatches.map((batch) => {
                const fillRate = safePercent(batch.fillRate || (batch.capacity ? (batch.enrolled / batch.capacity) * 100 : 0));
                return (
                  <div key={batch.id} style={{ padding: '1rem', borderRadius: '14px', border: `1px solid ${COCKPIT_BORDER}`, background: COCKPIT_CARD_BG, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
                      <div>
                        <p style={{ color: COCKPIT_TEXT, fontWeight: 900, fontSize: '0.98rem', marginBottom: '0.25rem' }}>{batch.name || batch.code}</p>
                        <p style={{ color: COCKPIT_MUTED, fontSize: '0.78rem', fontWeight: 500, margin: 0 }}>{batch.courseTitle} • Starts {batch.start_date || 'TBA'}</p>
                      </div>
                      <MiniPill tone={statusTone(batch.status)}>{titleCase(batch.status)}</MiniPill>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: COCKPIT_MUTED, fontWeight: 600, marginTop: '0.9rem' }}>
                      <span>{formatNumber(batch.enrolled)} / {formatNumber(batch.capacity)} seats</span>
                      <strong style={{ color: fillRate >= 85 ? COCKPIT_AMBER : COCKPIT_MINT }}>{Math.round(fillRate)}%</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: COCKPIT_TRACK, overflow: 'hidden', marginTop: '0.45rem' }}>
                      <div style={{ width: `${fillRate}%`, height: '100%', borderRadius: 99, background: fillRate >= 85 ? '#f59e0b' : '#10b981' }} />
                    </div>
                  </div>
                );
              })}
              {activeBatches.length === 0 && <p style={{ color: COCKPIT_MUTED, margin: 0 }}>No active batches for the selected branch.</p>}
            </div>
          </div>

          <div className="glass-morphism" style={{ padding: '1.5rem', color: COCKPIT_TEXT }}>
            {sectionTitle(<Target size={20} color="#00D4FF" />, 'Lead Pipeline', `${formatCurrency(data?.pipelineValue)} active opportunity value`)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {pipeline.map((item) => {
                const width = Math.max((item.count / maxPipeline) * 100, 8);
                return (
                  <div key={item.status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                      <span style={{ color: COCKPIT_MUTED, fontWeight: 700 }}>{titleCase(item.status)}</span>
                      <strong>{formatNumber(item.count)}</strong>
                    </div>
                    <div style={{ height: 12, borderRadius: 999, background: COCKPIT_TRACK, overflow: 'hidden' }}>
                      <div style={{ width: `${width}%`, height: '100%', borderRadius: 999, background: CHART_COLORS[PIPELINE_ORDER.indexOf(item.status) % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              {pipeline.length === 0 && <p style={{ color: COCKPIT_MUTED, margin: 0 }}>No active lead pipeline data yet.</p>}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.5rem' }}>
          <div className="glass-morphism" style={{ padding: '1.5rem', color: COCKPIT_TEXT }}>
            {sectionTitle(<Activity size={20} color="#00FF94" />, 'Recent Lead Activity', `${formatNumber(data?.newLeadsToday)} new leads today`)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {recentLeads.map((lead) => (
                <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.95rem', borderRadius: '14px', border: `1px solid ${COCKPIT_BORDER}`, background: COCKPIT_CARD_BG, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
                  <div>
                    <p style={{ color: COCKPIT_TEXT, fontWeight: 900, fontSize: '0.92rem', marginBottom: '0.2rem' }}>{lead.name}</p>
                    <p style={{ color: COCKPIT_MUTED, fontSize: '0.76rem', fontWeight: 500, margin: 0 }}>{lead.phone || lead.email || 'No contact'} • {titleCase(lead.source || 'Direct')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'start', flexWrap: 'wrap', justifyContent: 'end' }}>
                    <MiniPill tone={statusTone(lead.status)}>{titleCase(lead.status)}</MiniPill>
                    <MiniPill tone={priorityTone(lead.priority)}>{titleCase(lead.priority)}</MiniPill>
                  </div>
                </div>
              ))}
              {recentLeads.length === 0 && <p style={{ color: COCKPIT_MUTED, margin: 0 }}>No recent leads for this branch.</p>}
            </div>
          </div>

          <div className="glass-morphism" style={{ padding: '1.5rem', color: COCKPIT_TEXT }}>
            {sectionTitle(<Wallet size={20} color="#9B6DFF" />, 'LMS & Finance Snapshot', 'Branch health without HR noise')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
              <div style={{ padding: '1rem', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe' }}><p style={{ color: COCKPIT_CYAN, fontSize: '0.72rem', fontWeight: 800 }}>Total Leads</p><strong style={{ color: COCKPIT_TEXT, fontSize: '1.35rem' }}>{formatNumber(data?.totalLeads)}</strong></div>
              <div style={{ padding: '1rem', borderRadius: '14px', background: '#f5f3ff', border: '1px solid #ddd6fe' }}><p style={{ color: COCKPIT_VIOLET, fontSize: '0.72rem', fontWeight: 800 }}>Students</p><strong style={{ color: COCKPIT_TEXT, fontSize: '1.35rem' }}>{formatNumber(data?.totalStudents)}</strong></div>
              <div style={{ padding: '1rem', borderRadius: '14px', background: '#fffbeb', border: '1px solid #fde68a' }}><p style={{ color: COCKPIT_AMBER, fontSize: '0.72rem', fontWeight: 800 }}>Unpaid Invoices</p><strong style={{ color: COCKPIT_TEXT, fontSize: '1.1rem' }}>{formatCurrency(data?.unpaidInvoices)}</strong></div>
              <div style={{ padding: '1rem', borderRadius: '14px', background: '#fff1f2', border: '1px solid #fecdd3' }}><p style={{ color: COCKPIT_ROSE, fontSize: '0.72rem', fontWeight: 800 }}>Overdue Count</p><strong style={{ color: COCKPIT_TEXT, fontSize: '1.35rem' }}>{formatNumber(data?.overdueInvoiceCount)}</strong></div>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Bank & Cash Accounts</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {(data?.liquidAccounts || []).map((account) => (
                  <div key={account.id} style={{ display: 'flex', justifyContent: 'space-between', color: COCKPIT_MUTED, fontSize: '0.8rem', fontWeight: 600 }}>
                    <span>{account.name}</span>
                    <MiniPill tone={account.sub_type === 'cash' ? 'amber' : 'cyan'}>{titleCase(account.sub_type)}</MiniPill>
                  </div>
                ))}
                {(!data?.liquidAccounts || data.liquidAccounts.length === 0) && <p style={{ color: COCKPIT_MUTED, fontSize: '0.8rem', margin: 0 }}>No bank or cash accounts configured.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── MAIN RENDER OUTLET ────────────────────────────────────────────────────
  
  // If HR, simply display the entire HR module dashboard
  if (isHR) return <HRMDashboard />;

  return (
    <div>
      <div style={{ ...(!isStudent ? { marginBottom: '2rem' } : {}) }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: '800' }}>
          Welcome back, <span style={{ color: 'var(--primary)' }}>{user.name}</span>
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
          {isSuperAdmin ? 'Branch command center for students, batches, leads, and finance' : `Accessing your ${role.replace('_', ' ')} workspace`}
        </p>
      </div>

      {!isStudent && !isSuperAdmin && <QuickCheckIn />}

      {isSuperAdmin && renderSuperAdminView()}
      {isTeacher && renderTeacherView()}
      {isAccounting && renderAccountingView()}
      {isCRM && renderCRMView()}
      {isBrandManager && renderBrandManagerView()}
      {isStudent && <div className="glass-morphism" style={{ padding: '2rem', textAlign: 'center' }}><p>Student Dashboard Data Goes Here</p></div>}
    </div>
  );
};

export default Cockpit;
