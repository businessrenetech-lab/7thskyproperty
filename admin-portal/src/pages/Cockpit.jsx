import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, DollarSign, BookOpen, Loader2, Activity, CheckCircle2, 
  AlertCircle, GraduationCap, Briefcase, Target, MessageSquare, PlayCircle, 
  Wallet, Receipt, PieChart, BarChart3, LineChart as LineChartIcon, Mail
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
  <div className="glass-morphism pulse-card" style={{ padding: '1.5rem', flex: '1', minWidth: 0, position: 'relative', overflow: 'hidden', borderBottom: `4px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</p>
        <h2 style={{ fontSize: '2.2rem', margin: '0.4rem 0', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>{value}</h2>
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
      <div style={{ background: color, padding: '0.8rem', borderRadius: '12px', color: 'white', boxShadow: `0 4px 12px ${color}44` }}>{icon}</div>
    </div>
  </div>
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
        const res = await api.get(`/dashboard/stats?branchId=${branch}&role=${role}`);
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
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
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
  const renderSuperAdminView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <PulseCard title="Global Revenue" value={`৳${data?.revenue?.toLocaleString() || 0}`} icon={<DollarSign size={24} />} color="#00FF94" />
        <PulseCard title="Total Students" value={data?.totalStudents || 0} icon={<GraduationCap size={24} />} color="#00D4FF" />
        <PulseCard title="Active Leads" value={data?.totalLeads || 0} icon={<Activity size={24} />} color="#9B6DFF" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
        <div className="glass-morphism" style={{ padding: '1.5rem', height: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <BarChart3 size={48} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '1rem' }}>Enterprise Analytics Module</h3>
          <p style={{ color: 'var(--text-dim)' }}>Consolidated metric visualizations available shortly.</p>
        </div>
      </div>
    </div>
  );

  // ─── MAIN RENDER OUTLET ────────────────────────────────────────────────────
  
  // If HR, simply display the entire HR module dashboard
  if (isHR) return <HRMDashboard />;

  return (
    <div>
      <div style={{ ...(!isStudent ? { marginBottom: '2rem' } : {}) }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>
          Welcome back, <span style={{ color: 'var(--primary)' }}>{user.name}</span>
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          {isSuperAdmin ? 'Organization-wide enterprise insights' : `Accessing your ${role.replace('_', ' ')} workspace`}
        </p>
      </div>

      {!isStudent && <QuickCheckIn />}

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
