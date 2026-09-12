import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, LayoutGrid,
  CalendarDays, Plus, Search, Filter, RefreshCw, CheckCircle2, Clock,
  Phone, Users, Home, FileText, TrendingUp, AlertTriangle, ArrowRight,
  Building2, User, ExternalLink, Check, Circle, Edit, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Button, Spinner, Badge, StatusBadge, Drawer, Field, Input, Select, Textarea
} from '../../ui/kit';
import { propertyFilePath, settlementDeskPath } from './paths';
import './sales-calendar.css';

const TYPE_CONFIG = {
  viewing: { label: 'Viewing', icon: Home, color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  meeting: { label: 'Meeting', icon: Users, color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
  task_meeting: { label: 'Meeting', icon: Users, color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
  call: { label: 'Call', icon: Phone, color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  task_call: { label: 'Call', icon: Phone, color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  task_email: { label: 'Email', icon: FileText, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
  task_document: { label: 'Document', icon: FileText, color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  task_viewing: { label: 'Viewing', icon: Home, color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  task_negotiation: { label: 'Negotiation', icon: TrendingUp, color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
  task: { label: 'Task', icon: CheckCircle2, color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
  task_general: { label: 'Task', icon: CheckCircle2, color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
  sop_deadline: { label: 'SOP Deadline', icon: FileText, color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
  offer_expiry: { label: 'Offer Expiry', icon: Clock, color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  follow_up: { label: 'Follow-up', icon: Clock, color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
};

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function SalesCalendar({ category = 'residential', scope }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Active view: 'month' | 'week' | 'list'
  const [viewMode, setViewMode] = useState('list');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => iso(new Date()));
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Drawer state for adding tasks on calendar
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [propertiesList, setPropertiesList] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [savingTask, setSavingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    task_type: 'viewing',
    priority: 'medium',
    due_date: iso(new Date()),
    due_time: '14:00',
    property_id: '',
    contact_id: '',
    assigned_to: user?.id || '',
  });

  // Load staff & properties for task creation drawer
  useEffect(() => {
    api.get('/auth/staff').then((r) => setStaffList(r.data || [])).catch(() => {});
    api.get('/sales/dashboard?category=residential')
      .then((r) => {
        const body = r.data?.data ?? r.data ?? {};
        setPropertiesList(body.properties || body.listings || []);
      })
      .catch(() => {});
    api.get('/contacts?limit=100').then((r) => setContactsList(r.data?.data || [])).catch(() => {});
  }, []);

  // 6-week (42-cell) grid bounds
  const cells = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  // Load calendar events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = iso(cells[0]);
      const to = iso(cells[41]);
      const { data } = await api.get(`/sales/calendar?from=${from}&to=${to}&category=${category}${scope ? `&scope=${scope}` : ''}`);
      setEvents(data.events || []);
    } catch {
      toast.error('Failed to load the calendar events');
    } finally {
      setLoading(false);
    }
  }, [cells, category, scope, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'viewings' && !(e.type === 'viewing' || e.type === 'task_viewing')) return false;
        if (typeFilter === 'meetings_calls' && !(e.type === 'meeting' || e.type === 'call' || e.type === 'task_call' || e.type === 'task_meeting')) return false;
        if (typeFilter === 'tasks' && !e.type.startsWith('task')) return false;
        if (typeFilter === 'sop' && e.type !== 'sop_deadline') return false;
        if (typeFilter === 'offers' && e.type !== 'offer_expiry') return false;
        if (typeFilter === 'follow_up' && e.type !== 'follow_up') return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          e.label,
          e.property_code,
          e.contact_name,
          e.assignee_name,
          e.description
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, typeFilter, search]);

  // Group events by day
  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of filteredEvents) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date).push(e);
    }
    return m;
  }, [filteredEvents]);

  // Chronological Grouping for List / Agenda View
  const listGroups = useMemo(() => {
    const today = iso(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = iso(tomorrowDate);

    const weekEndDate = new Date();
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const weekEnd = iso(weekEndDate);

    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: []
    };

    const sorted = [...filteredEvents].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '23:59').localeCompare(b.time || '23:59');
    });

    for (const e of sorted) {
      if (e.date < today && e.status !== 'completed') {
        groups.overdue.push(e);
      } else if (e.date === today) {
        groups.today.push(e);
      } else if (e.date === tomorrow) {
        groups.tomorrow.push(e);
      } else if (e.date > tomorrow && e.date <= weekEnd) {
        groups.thisWeek.push(e);
      } else {
        groups.later.push(e);
      }
    }

    return groups;
  }, [filteredEvents]);

  // Week View: 7 days around selected or active date
  const weekDays = useMemo(() => {
    const curr = new Date(selectedDate || new Date());
    const firstDay = new Date(curr);
    firstDay.setDate(curr.getDate() - curr.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const todayIso = iso(new Date());
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const shiftMonth = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  // Navigation click
  const goEvent = (e) => {
    if (e.property_id) {
      const section = e.type === 'sop_deadline' ? '?section=workflow'
        : e.type === 'offer_expiry' ? '?section=offers'
        : '?section=overview';
      navigate(`${propertyFilePath(category, e.property_id)}${section}`);
    } else {
      navigate('/residential/work-queue');
    }
  };

  // Open task creation drawer prefilled with date
  const openScheduleDrawer = (dateStr = selectedDate) => {
    setTaskForm({
      title: '',
      description: '',
      task_type: 'viewing',
      priority: 'medium',
      due_date: dateStr || todayIso,
      due_time: '14:00',
      property_id: '',
      contact_id: '',
      assigned_to: user?.id || '',
    });
    setDrawerOpen(true);
  };

  // Save task
  const saveTask = async (e) => {
    e?.preventDefault();
    if (!taskForm.title.trim()) return toast.error('Task title is required');
    setSavingTask(true);
    try {
      await api.post('/sales/tasks', {
        ...taskForm,
        property_id: taskForm.property_id ? Number(taskForm.property_id) : null,
        contact_id: taskForm.contact_id ? Number(taskForm.contact_id) : null,
        assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null,
      });
      toast.success('Task scheduled on calendar');
      setDrawerOpen(false);
      loadEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule task');
    } finally {
      setSavingTask(false);
    }
  };

  // Quick complete task
  const toggleTaskComplete = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await api.patch(`/sales/tasks/${taskId}/status`, { status: nextStatus });
      toast.success(nextStatus === 'completed' ? 'Task marked done! 🎉' : 'Task reopened');
      loadEvents();
    } catch {
      toast.error('Failed to update task');
    }
  };

  const selectedDayEvents = byDay.get(selectedDate) || [];

  return (
    <div className="pm-scope pm-col" style={{ gap: 14 }}>
      {/* Executive Calendar Cockpit Banner */}
      <div className="card" style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid var(--line)',
        borderLeft: '5px solid var(--cyan, #0ea5e9)',
        borderRadius: 14,
        boxShadow: '0 2px 8px rgba(13,27,47,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="pm-eyebrow" style={{ letterSpacing: '0.12em' }}>RESIDENTIAL SALES · SCHEDULE &amp; CALENDAR</div>
            <h1 style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              Sales Calendar &amp; Schedule
            </h1>
            <div className="pm-meta" style={{ fontSize: 12.5 }}>
              Master schedule tracking inspections, client meetings, tasks, SOP deadlines, and offer expiries.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View Switcher: List vs Month vs Week */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--surface-3, #f1f5f9)',
              padding: 2,
              borderRadius: 8,
              border: '1px solid var(--line)'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List / Agenda View"
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: viewMode === 'list' ? 750 : 500,
                  border: 'none',
                  borderRadius: 6,
                  background: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? 'var(--navy)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <List size={14} /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                title="Month Grid View"
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: viewMode === 'month' ? 750 : 500,
                  border: 'none',
                  borderRadius: 6,
                  background: viewMode === 'month' ? '#ffffff' : 'transparent',
                  color: viewMode === 'month' ? 'var(--navy)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <LayoutGrid size={14} /> Month
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                title="7-Day Week View"
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: viewMode === 'week' ? 750 : 500,
                  border: 'none',
                  borderRadius: 6,
                  background: viewMode === 'week' ? '#ffffff' : 'transparent',
                  color: viewMode === 'week' ? 'var(--navy)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <CalendarDays size={14} /> Week
              </button>
            </div>

            {/* Month Navigator */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => shiftMonth(-1)} />
              <strong style={{ minWidth: 140, textAlign: 'center', fontSize: 13.5, color: 'var(--ink)' }}>
                {monthLabel}
              </strong>
              <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => shiftMonth(1)} />
              <Button size="sm" variant="ghost" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                Today
              </Button>
            </div>

            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadEvents} disabled={loading} />

            <Button
              size="sm"
              icon={Plus}
              className="btn-primary"
              onClick={() => openScheduleDrawer(selectedDate)}
            >
              + Schedule Task
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="card" style={{ padding: '12px 16px', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Category Chips */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              { key: 'all', label: 'All Events' },
              { key: 'viewings', label: 'Viewings & Inspections', color: '#059669' },
              { key: 'meetings_calls', label: 'Meetings & Calls', color: '#7c3aed' },
              { key: 'tasks', label: 'CRM Tasks', color: '#4f46e5' },
              { key: 'sop', label: 'SOP Deadlines', color: '#2563eb' },
              { key: 'offers', label: 'Offer Expiries', color: '#d97706' },
            ].map((f) => {
              const active = typeFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTypeFilter(f.key)}
                  style={{
                    padding: '5px 11px',
                    fontSize: 12,
                    fontWeight: active ? 700 : 550,
                    borderRadius: 20,
                    border: active ? '1px solid var(--cyan)' : '1px solid var(--line)',
                    background: active ? 'var(--cyan-weak, #f0f9ff)' : 'var(--surface)',
                    color: active ? 'var(--navy)' : 'var(--muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {f.color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.color }} />}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ width: 220 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schedule…"
              style={{
                width: '100%',
                height: 30,
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                padding: '0 8px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Calendar Views */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
      ) : viewMode === 'list' ? (
        /* ══════════════════════════════════════════════════════════════════
           1. LIST / AGENDA VIEW (Primary User Request)
           ══════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredEvents.length === 0 ? (
            <div className="card" style={{
              padding: '40px 20px',
              textAlign: 'center',
              borderRadius: 12
            }}>
              <CalendarIcon size={36} color="var(--muted)" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                No schedule events found
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted)' }}>
                {search || typeFilter !== 'all'
                  ? 'Try clearing the search or category filters.'
                  : 'No viewings, deadlines, or tasks scheduled for this period.'}
              </p>
              <Button size="sm" className="btn-primary" icon={Plus} onClick={() => openScheduleDrawer()}>
                Schedule First Event
              </Button>
            </div>
          ) : (
            <>
              {/* Overdue Section */}
              {listGroups.overdue.length > 0 && (
                <div className="card" style={{ padding: '14px 18px', borderRadius: 12, borderLeft: '4px solid #dc2626' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
                      Overdue Actions ({listGroups.overdue.length})
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {listGroups.overdue.map((e, i) => (
                      <AgendaEventCard
                        key={i}
                        event={e}
                        onGo={() => goEvent(e)}
                        onToggleTask={toggleTaskComplete}
                        isOverdue
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Today Section */}
              <div className="card" style={{ padding: '14px 18px', borderRadius: 12, borderLeft: '4px solid #0ea5e9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CalendarIcon size={16} color="#0284c7" />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
                      Today &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                  </div>
                  <Badge tone="blue">{listGroups.today.length} events</Badge>
                </div>
                {listGroups.today.length === 0 ? (
                  <div style={{ padding: '12px 0', fontSize: 12.5, color: 'var(--muted)' }}>
                    Nothing scheduled for today.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {listGroups.today.map((e, i) => (
                      <AgendaEventCard
                        key={i}
                        event={e}
                        onGo={() => goEvent(e)}
                        onToggleTask={toggleTaskComplete}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Tomorrow Section */}
              {listGroups.tomorrow.length > 0 && (
                <div className="card" style={{ padding: '14px 18px', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'var(--ink)' }}>
                      Tomorrow &middot; {listGroups.tomorrow[0]?.date}
                    </h3>
                    <Badge tone="grey">{listGroups.tomorrow.length} events</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {listGroups.tomorrow.map((e, i) => (
                      <AgendaEventCard
                        key={i}
                        event={e}
                        onGo={() => goEvent(e)}
                        onToggleTask={toggleTaskComplete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* This Week Section */}
              {listGroups.thisWeek.length > 0 && (
                <div className="card" style={{ padding: '14px 18px', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'var(--ink)' }}>
                      Upcoming This Week
                    </h3>
                    <Badge tone="grey">{listGroups.thisWeek.length} events</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {listGroups.thisWeek.map((e, i) => (
                      <AgendaEventCard
                        key={i}
                        event={e}
                        onGo={() => goEvent(e)}
                        onToggleTask={toggleTaskComplete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Later This Month Section */}
              {listGroups.later.length > 0 && (
                <div className="card" style={{ padding: '14px 18px', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'var(--ink)' }}>
                      Later in Month
                    </h3>
                    <Badge tone="grey">{listGroups.later.length} events</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {listGroups.later.map((e, i) => (
                      <AgendaEventCard
                        key={i}
                        event={e}
                        onGo={() => goEvent(e)}
                        onToggleTask={toggleTaskComplete}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : viewMode === 'month' ? (
        /* ══════════════════════════════════════════════════════════════════
           2. MONTH GRID VIEW
           ══════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
          {/* 42-Cell Month Grid */}
          <div className="card" style={{ padding: 10, borderRadius: 12 }}>
            <div className="cal-grid cal-head">
              {WD.map((w) => (
                <div key={w} className="cal-wd">{w}</div>
              ))}
            </div>

            <div className="cal-grid">
              {cells.map((d) => {
                const key = iso(d);
                const inMonth = d.getMonth() === month.getMonth();
                const dayItems = byDay.get(key) || [];
                const isSelected = key === selectedDate;
                const isToday = key === todayIso;

                return (
                  <div
                    key={key}
                    className={`cal-cell${inMonth ? '' : ' cal-out'}${isToday ? ' cal-today' : ''}${isSelected ? ' cal-sel' : ''}`}
                    onClick={() => setSelectedDate(key)}
                    style={{ minHeight: 88 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="cal-day" style={{ fontWeight: isToday ? 800 : 600 }}>
                        {d.getDate()}
                      </span>
                      {dayItems.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Event mini pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                      {dayItems.slice(0, 3).map((e, idx) => {
                        const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.general;
                        return (
                          <div
                            key={idx}
                            title={`${e.time ? e.time + ' ' : ''}${e.label}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 650,
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                              borderRadius: 4,
                              padding: '1px 4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.3
                            }}
                          >
                            {e.time ? `${e.time} ` : ''}{e.label}
                          </div>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)' }}>
                          +{dayItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda Side-Panel */}
          <div className="card" style={{ padding: '16px 18px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                </h3>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                  {selectedDayEvents.length} scheduled event(s)
                </div>
              </div>

              <Button
                size="sm"
                icon={Plus}
                className="btn-primary"
                onClick={() => openScheduleDrawer(selectedDate)}
              >
                Add
              </Button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                Nothing scheduled for this day.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDayEvents.map((e, idx) => (
                  <AgendaEventCard
                    key={idx}
                    event={e}
                    onGo={() => goEvent(e)}
                    onToggleTask={toggleTaskComplete}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           3. WEEK VIEW (7-Day Column Breakdown)
           ══════════════════════════════════════════════════════════════════ */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          overflowX: 'auto'
        }}>
          {weekDays.map((d) => {
            const dayKey = iso(d);
            const dayItems = byDay.get(dayKey) || [];
            const isToday = dayKey === todayIso;

            return (
              <div
                key={dayKey}
                className="card"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  minWidth: 150,
                  background: isToday ? '#f0f9ff' : '#ffffff',
                  border: isToday ? '1px solid #0ea5e9' : '1px solid var(--line)'
                }}
              >
                <div style={{
                  textAlign: 'center',
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--line-soft)',
                  marginBottom: 8
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {WD[d.getDay()]}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? '#0284c7' : 'var(--ink)' }}>
                    {d.getDate()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dayItems.length === 0 ? (
                    <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
                      Free
                    </div>
                  ) : (
                    dayItems.map((e, idx) => (
                      <AgendaEventCard
                        key={idx}
                        event={e}
                        onGo={() => goEvent(e)}
                        onToggleTask={toggleTaskComplete}
                        compact
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Scheduling Drawer */}
      {drawerOpen && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Schedule CRM Event or Task"
          width={480}
        >
        <form onSubmit={saveTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Title / Action *" hint="Summary of the viewing, meeting, or task">
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="e.g. Property viewing with Mr. and Mrs. Karim"
              autoFocus
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Event / Task Type">
              <Select
                value={taskForm.task_type}
                onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}
              >
                <option value="viewing">Property Viewing</option>
                <option value="meeting">Client Meeting</option>
                <option value="call">Phone Call</option>
                <option value="document">Document Review</option>
                <option value="negotiation">Price Negotiation</option>
                <option value="settlement">Settlement Check</option>
                <option value="general">General Task</option>
              </Select>
            </Field>

            <Field label="Priority">
              <Select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <Field label="Date">
              <Input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </Field>
            <Field label="Time">
              <Input
                type="time"
                value={taskForm.due_time}
                onChange={(e) => setTaskForm({ ...taskForm, due_time: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Associated Property (Optional)">
            <Select
              value={taskForm.property_id}
              onChange={(e) => setTaskForm({ ...taskForm, property_id: e.target.value })}
            >
              <option value="">No property</option>
              {propertiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_code ? `${p.property_code} · ` : ''}{p.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Associated Contact (Optional)">
            <Select
              value={taskForm.contact_id}
              onChange={(e) => setTaskForm({ ...taskForm, contact_id: e.target.value })}
            >
              <option value="">No contact</option>
              {contactsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.primary_phone ? `(${c.primary_phone})` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Assign To">
            <Select
              value={taskForm.assigned_to}
              onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
            >
              <option value="">Assign to Me</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notes / Description">
            <Textarea
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="Meeting agenda, buyer requirements, inspection notes..."
            />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary" disabled={savingTask}>
              {savingTask ? 'Scheduling…' : 'Schedule Event'}
            </Button>
          </div>
        </form>
      </Drawer>
      )}
    </div>
  );
}

// Subcomponent: Agenda Event Card for List and Side-panel Views
function AgendaEventCard({ event, onGo, onToggleTask, compact = false, isOverdue = false }) {
  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.general;
  const TypeIcon = cfg.icon;
  const isTask = Boolean(event.task_id);
  const isCompleted = event.status === 'completed';

  return (
    <div
      onClick={onGo}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: compact ? '8px 10px' : '10px 14px',
        background: isCompleted ? 'var(--surface-2, #f8fafc)' : '#ffffff',
        border: isOverdue ? '1px solid #fca5a5' : '1px solid var(--line, #e2e8f0)',
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {/* If task, show checkbox toggle */}
        {isTask && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleTask(event.task_id, event.status);
            }}
            title={isCompleted ? 'Mark pending' : 'Mark complete'}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: isCompleted ? 'var(--good, #16a34a)' : '#94a3b8',
              flexShrink: 0
            }}
          >
            {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: cfg.color,
              background: cfg.bg,
              padding: '1px 6px',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3
            }}>
              <TypeIcon size={11} /> {cfg.label}
            </span>

            {event.time && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
                {event.time}
              </span>
            )}

            <span style={{
              fontSize: compact ? 12.5 : 13.5,
              fontWeight: 700,
              color: isCompleted ? 'var(--muted)' : 'var(--ink)',
              textDecoration: isCompleted ? 'line-through' : 'none'
            }}>
              {event.label}
            </span>
          </div>

          {/* Sub line: property and contact */}
          <div style={{
            fontSize: 11.5,
            color: 'var(--muted)',
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {event.property_code && (
              <span className="code-chip" style={{ fontSize: 10 }}>
                {event.property_code}
              </span>
            )}

            {event.contact_name && (
              <span>With: <strong>{event.contact_name}</strong></span>
            )}

            {event.assignee_name && (
              <span>Assigned: {event.assignee_name}</span>
            )}

            {event.date && !compact && (
              <span>&middot; {event.date}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <ArrowRight size={13} color="var(--muted)" />
      </div>
    </div>
  );
}
