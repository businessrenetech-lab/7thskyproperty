import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Building2, Filter, Briefcase, ScrollText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PageHead, StatCard, Button } from '../ui/kit';

const safeCount = async (url) => {
  try { const { data } = await api.get(url); return data?.pagination?.total ?? (Array.isArray(data?.data) ? data.data.length : 0); }
  catch { return 0; }
};

export default function Dashboard() {
  const nav = useNavigate();
  const [s, setS] = useState({ contacts: '—', clients: '—', properties: '—', leads: '—', projects: '—', agreements: '—' });

  useEffect(() => {
    (async () => {
      const [contacts, clients, properties, leads, projects, agreements] = await Promise.all([
        safeCount('/contacts?limit=1'), safeCount('/clients?limit=1'), safeCount('/properties?limit=1'),
        safeCount('/leads?limit=1'), safeCount('/projects?limit=1'), safeCount('/agreements?limit=1'),
      ]);
      setS({ contacts, clients, properties, leads, projects, agreements });
    })();
  }, []);

  return (
    <>
      <PageHead title="Welcome back 👋" desc="Here's what's happening across Seventh Sky Property Care today." />
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={Users} label="Contacts" value={s.contacts} tone="blue" />
        <StatCard icon={UserCheck} label="Clients" value={s.clients} tone="green" />
        <StatCard icon={Building2} label="Properties" value={s.properties} tone="sky" />
        <StatCard icon={Filter} label="Active Leads" value={s.leads} tone="amber" />
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h3>Quick Actions</h3></div>
          <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
            <Button variant="ghost" icon={Users} onClick={() => nav('/contacts')}>Add a new contact</Button>
            <Button variant="ghost" icon={Building2} onClick={() => nav('/properties')}>List a property</Button>
            <Button variant="ghost" icon={ScrollText} onClick={() => nav('/agreements')}>Manage agreements</Button>
            <Button variant="ghost" icon={Briefcase} onClick={() => nav('/projects')}>Open a project</Button>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Pipeline Snapshot</h3></div>
          <div className="card-pad" style={{ display: 'grid', gap: 12 }}>
            <div className="between"><span>Leads in pipeline</span><b>{s.leads}</b></div>
            <div className="between"><span>Active projects</span><b>{s.projects}</b></div>
            <div className="between"><span>Agreements on file</span><b>{s.agreements}</b></div>
            <Button variant="primary" onClick={() => nav('/leads')}>Go to Leads <ArrowRight size={15} /></Button>
          </div>
        </div>
      </div>
    </>
  );
}
