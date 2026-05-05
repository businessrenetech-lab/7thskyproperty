import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, Briefcase, FileText, Award, ArrowUpRight, Loader2, UserCheck, UserX, AlertCircle, Cake, Star } from 'lucide-react';
import api from '../services/api';
import QuickCheckIn from '../components/QuickCheckIn';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const HRMDashboard = () => {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, bdayRes, annivRes, leavesRes] = await Promise.all([
          api.get('/hrm/dashboard/stats'),
          api.get('/hrm/dashboard/birthdays'),
          api.get('/hrm/dashboard/anniversaries'),
          api.get('/hrm/leaves?status=pending'),
        ]);
        setStats(statsRes.data);
        setBirthdays(bdayRes.data);
        setAnniversaries(annivRes.data);
        setPendingLeaves(leavesRes.data.slice(0, 5));
      } catch (err) {
        console.error('HRM Dashboard fetch error:', err);
        setStats({ totalStaff: 0, presentToday: 0, onLeaveToday: 0, absentToday: 0, pendingLeaves: 0, openPositions: 0, totalApplicants: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={48} className="animate-spin" color="var(--primary)" /></div>;

  const cards = [
    { label: 'Total Staff', value: stats?.totalStaff || 0, icon: <Users size={24} />, color: '#00D4FF', sub: 'Active employees' },
    { label: 'Present Today', value: stats?.presentToday || 0, icon: <UserCheck size={24} />, color: '#00FF94', sub: 'Checked in' },
    { label: 'On Leave', value: stats?.onLeaveToday || 0, icon: <Calendar size={24} />, color: '#FFB347', sub: 'Today' },
    { label: 'Absent', value: stats?.absentToday || 0, icon: <UserX size={24} />, color: '#FF4D6D', sub: 'Unaccounted' },
    { label: 'Pending Leaves', value: stats?.pendingLeaves || 0, icon: <AlertCircle size={24} />, color: '#9B6DFF', sub: 'Awaiting approval' },
    { label: 'Open Positions', value: stats?.openPositions || 0, icon: <Briefcase size={24} />, color: '#38E8FF', sub: `${stats?.totalApplicants || 0} applicants` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} /> HR Management Dashboard
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>People operations at a glance</p>
      </div>

      {/* Stat Cards & Quick Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        
        <QuickCheckIn />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {cards.map((card, i) => (
            <div key={i} className="glass-morphism" style={{ padding: '1.2rem', borderTop: `3px solid ${card.color}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.1, color: card.color }}>{card.icon}</div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{card.label}</p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: card.color, margin: '0.3rem 0' }}>{card.value}</h2>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Pending Leave Requests */}
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="#9B6DFF" /> Pending Leave Requests
          </h3>
          {pendingLeaves.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>No pending requests</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {pendingLeaves.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{req.Employee?.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{req.LeaveType?.name} · {req.total_days} day(s) · {req.start_date} to {req.end_date}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                      onClick={async () => { try { await api.patch(`/hrm/leaves/${req.id}/approve`); window.location.reload(); } catch(e) { toast.error('Failed'); } }}>
                      Approve
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                      onClick={async () => { try { await api.patch(`/hrm/leaves/${req.id}/reject`); window.location.reload(); } catch(e) { toast.error('Failed'); } }}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Birthdays & Anniversaries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-morphism" style={{ padding: '1.2rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cake size={16} color="#FFB347" /> Birthdays This Month
            </h4>
            {birthdays.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None this month</p>
            ) : (
              birthdays.slice(0, 5).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #FFB347, #FF4D6D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#fff', fontWeight: '700' }}>
                    {p.User?.name?.[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>{p.User?.name}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{p.date_of_birth}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="glass-morphism" style={{ padding: '1.2rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={16} color="#00D4FF" /> Work Anniversaries
            </h4>
            {anniversaries.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None this month</p>
            ) : (
              anniversaries.slice(0, 5).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #00D4FF, #9B6DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#fff', fontWeight: '700' }}>
                    {p.User?.name?.[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>{p.User?.name}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Joined: {p.joining_date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRMDashboard;
