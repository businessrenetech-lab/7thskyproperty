import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertCircle, Plus, Search, Filter, RefreshCw,
  Phone, Mail, Users, Home, FileText, TrendingUp, Scale, ArrowRight,
  CheckCircle2, Circle, MoreHorizontal, Edit, Trash2, Calendar,
  Building2, User, ChevronRight, ArrowUpRight, Check, X, ShieldAlert,
  Layers, LayoutGrid, List, AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Button, Spinner, Badge, StatusBadge, Drawer, Field, Input, Select, Textarea
} from '../../ui/kit';
import { propertyFilePath, settlementDeskPath } from './paths';

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });

const TASK_TYPE_CONFIG = {
  call: { label: 'Call', icon: Phone, color: '#0284c7', bg: '#e0f2fe' },
  meeting: { label: 'Meeting', icon: Users, color: '#7c3aed', bg: '#ede9fe' },
  viewing: { label: 'Viewing', icon: Home, color: '#059669', bg: '#d1fae5' },
  email: { label: 'Email', icon: Mail, color: '#0ea5e9', bg: '#f0f9ff' },
  document: { label: 'Document', icon: FileText, color: '#d97706', bg: '#fef3c7' },
  negotiation: { label: 'Negotiation', icon: TrendingUp, color: '#4f46e5', bg: '#e0e7ff' },
  settlement: { label: 'Settlement', icon: Scale, color: '#e11d48', bg: '#ffe4e6' },
  general: { label: 'To-Do', icon: CheckSquare, color: '#475569', bg: '#f1f5f9' },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  high: { label: 'High', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  medium: { label: 'Medium', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  low: { label: 'Low', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
};

const PIPELINE_KIND = {
  prepare: ['Prepare', 'prepare'],
  submit: ['Submit for review', 'review'],
  review: ['Review', 'review'],
  approve: ['Approve', 'review'],
  record_receipt: ['Record receipt', 'record'],
  match_bank: ['Match bank', 'match'],
  pay_out: ['Pay out', 'record'],
  lock: ['Lock & complete', 'complete'],
  offer_review: ['Offer review', null],
  sop_overdue: ['Overdue SOP', null],
};
const PIPELINE_ORDER = ['prepare', 'submit', 'review', 'approve', 'record_receipt', 'match_bank', 'pay_out', 'lock', 'offer_review', 'sop_overdue'];

export default function SalesWorkQueue({ dealScope }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const isManager = ['super_admin', 'branch_admin', 'property_manager'].includes(user?.role);

  // Top mode: 'tasks' vs 'pipeline'
  const [mainTab, setMainTab] = useState('tasks');
  const [layoutView, setLayoutView] = useState('list'); // 'list' | 'kanban'

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [taskCounters, setTaskCounters] = useState({});
  const [tasksLoading, setTasksLoading] = useState(true);

  // Pipeline items state
  const [pipelineItems, setPipelineItems] = useState([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);

  // Scope & filters
  const [scope, setScope] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open', 'today', 'overdue', 'high', 'completed', 'all'
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Auxiliary data for task drawer
  const [staffList, setStaffList] = useState([]);
  const [propertiesList, setPropertiesList] = useState([]);
  const [contactsList, setContactsList] = useState([]);

  // Drawer modal state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [savingTask, setSavingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    task_type: 'call',
    priority: 'medium',
    status: 'pending',
    due_date: new Date().toISOString().slice(0, 10),
    due_time: '11:00',
    property_id: '',
    contact_id: '',
    assigned_to: '',
  });

  // Load staff, properties, contacts for drawer
  useEffect(() => {
    api.get('/auth/staff').then((r) => setStaffList(r.data || [])).catch(() => {});
    api.get('/sales/dashboard?category=residential')
      .then((r) => {
        const body = r.data?.data ?? r.data ?? {};
        const pList = body.properties || body.listings || [];
        setPropertiesList(pList);
      })
      .catch(() => {});
    api.get('/contacts?limit=100').then((r) => setContactsList(r.data?.data || [])).catch(() => {});
  }, []);

  // Load tasks
  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const params = { scope };
      if (dealScope) params.deal_type = dealScope;
      if (statusFilter === 'today') params.due_window = 'today';
      else if (statusFilter === 'overdue') params.due_window = 'overdue';
      else if (statusFilter === 'high') params.priority = 'urgent,high';
      else if (statusFilter !== 'all') params.status = statusFilter;

      if (typeFilter !== 'all') params.task_type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get('/sales/tasks', { params });
      setTasks(data.data || []);
      setTaskCounters(data.counters || {});
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load CRM tasks');
    } finally {
      setTasksLoading(false);
    }
  }, [scope, dealScope, statusFilter, typeFilter, search, toast]);

  // Load pipeline work queue items
  const loadPipeline = useCallback(async () => {
    setPipelineLoading(true);
    try {
      const { data } = await api.get(`/sales/work-queue${scope === 'all' ? '?scope=all' : ''}`);
      setPipelineItems(data.data.items || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not load pipeline items');
    } finally {
      setPipelineLoading(false);
    }
  }, [scope, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  // Quick Complete / Toggle Task
  const toggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      // Optimistic update
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
      await api.patch(`/sales/tasks/${task.id}/status`, { status: nextStatus });
      toast.success(nextStatus === 'completed' ? 'Task marked complete! 🎉' : 'Task reopened');
      loadTasks();
    } catch (e) {
      toast.error('Failed to update task status');
      loadTasks();
    }
  };

  // Open Drawer for New Task
  const openNewTaskDrawer = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      task_type: 'call',
      priority: 'medium',
      status: 'pending',
      due_date: new Date().toISOString().slice(0, 10),
      due_time: '11:00',
      property_id: '',
      contact_id: '',
      assigned_to: user?.id || '',
    });
    setDrawerOpen(true);
  };

  // Open Drawer for Edit
  const openEditTaskDrawer = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      task_type: task.task_type || 'general',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      due_date: task.due_date || new Date().toISOString().slice(0, 10),
      due_time: task.due_time || '11:00',
      property_id: task.property_id ? String(task.property_id) : '',
      contact_id: task.contact_id ? String(task.contact_id) : '',
      assigned_to: task.assigned_to ? String(task.assigned_to) : '',
    });
    setDrawerOpen(true);
  };

  // Save Task Form
  const saveTask = async (e) => {
    e?.preventDefault();
    if (!taskForm.title.trim()) {
      return toast.error('Please enter a task title');
    }
    setSavingTask(true);
    try {
      const payload = {
        ...taskForm,
        property_id: taskForm.property_id ? Number(taskForm.property_id) : null,
        contact_id: taskForm.contact_id ? Number(taskForm.contact_id) : null,
        assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null,
      };

      if (editingTask) {
        await api.put(`/sales/tasks/${editingTask.id}`, payload);
        toast.success('Task updated successfully');
      } else {
        await api.post('/sales/tasks', payload);
        toast.success('Task created successfully');
      }
      setDrawerOpen(false);
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSavingTask(false);
    }
  };

  // Delete Task
  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/sales/tasks/${taskId}`);
      toast.success('Task deleted');
      setDrawerOpen(false);
      loadTasks();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // Navigation for pipeline items
  const goPipeline = (it) => {
    if (it.kind === 'offer_review') {
      return navigate(`${settlementDeskPath('residential', it.property_id).replace('/settlement', '')}?section=offers`);
    }
    if (it.kind === 'sop_overdue') {
      return navigate(`${settlementDeskPath('residential', it.property_id).replace('/settlement', '')}?section=workflow`);
    }
    const view = PIPELINE_KIND[it.kind]?.[1] || 'prepare';
    navigate(`${settlementDeskPath('residential', it.property_id)}?view=${view}`);
  };

  const pipelineGroups = useMemo(() => {
    return PIPELINE_ORDER.map((k) => [k, pipelineItems.filter((it) => it.kind === k)]).filter(([, rows]) => rows.length);
  }, [pipelineItems]);

  const pipelineTotal = pipelineItems.length;

  // Filter tasks client-side if needed for search
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.task_code && t.task_code.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.property?.title && t.property.title.toLowerCase().includes(q)) ||
        (t.property?.property_code && t.property.property_code.toLowerCase().includes(q)) ||
        (t.contact?.full_name && t.contact.full_name.toLowerCase().includes(q))
      );
    });
  }, [tasks, search]);

  // Group tasks for Kanban board
  const kanbanColumns = useMemo(() => {
    return {
      pending: filteredTasks.filter((t) => t.status === 'pending'),
      in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
      completed: filteredTasks.filter((t) => t.status === 'completed'),
    };
  }, [filteredTasks]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="pm-scope pm-col" style={{ gap: 14 }}>
      {/* Executive CRM Header Banner */}
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
            <div className="pm-eyebrow" style={{ letterSpacing: '0.12em' }}>RESIDENTIAL SALES · ACTION &amp; TASK CENTER</div>
            <h1 style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              My Work Queue &amp; Tasks
            </h1>
            <div className="pm-meta" style={{ fontSize: 12.5 }}>
              CRM task manager for client follow-ups, viewing schedules, document checks, and settlement checkpoints.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Scope Filter for Managers */}
            {isManager && (
              <div style={{
                display: 'inline-flex',
                background: 'var(--surface-3, #f1f5f9)',
                padding: 2,
                borderRadius: 8,
                border: '1px solid var(--line)'
              }}>
                <button
                  type="button"
                  onClick={() => setScope('mine')}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: scope === 'mine' ? 700 : 550,
                    border: 'none',
                    borderRadius: 6,
                    background: scope === 'mine' ? '#ffffff' : 'transparent',
                    color: scope === 'mine' ? 'var(--navy)' : 'var(--muted)',
                    cursor: 'pointer',
                    boxShadow: scope === 'mine' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: scope === 'all' ? 700 : 550,
                    border: 'none',
                    borderRadius: 6,
                    background: scope === 'all' ? '#ffffff' : 'transparent',
                    color: scope === 'all' ? 'var(--navy)' : 'var(--muted)',
                    cursor: 'pointer',
                    boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  All Team
                </button>
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              onClick={() => { loadTasks(); loadPipeline(); }}
              disabled={tasksLoading || pipelineLoading}
            >
              Refresh
            </Button>

            <Button
              size="sm"
              icon={Plus}
              className="btn-primary"
              onClick={openNewTaskDrawer}
            >
              + New Task
            </Button>
          </div>
        </div>
      </div>

      {/* CRM Executive Metric Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Open CRM Tasks
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
            {taskCounters.open ?? 0}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Pending &amp; In Progress</span>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Due Today
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0284c7' }}>
            {taskCounters.due_today ?? 0}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Scheduled for today</span>
        </div>

        <div style={{
          background: (taskCounters.overdue || 0) > 0 ? '#fef2f2' : 'var(--surface)',
          border: (taskCounters.overdue || 0) > 0 ? '1px solid #fca5a5' : '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: (taskCounters.overdue || 0) > 0 ? '#dc2626' : 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            Overdue Tasks
          </span>
          <span style={{
            fontSize: 20, fontWeight: 800,
            color: (taskCounters.overdue || 0) > 0 ? '#dc2626' : 'var(--ink)'
          }}>
            {taskCounters.overdue ?? 0}
          </span>
          <span style={{ fontSize: 11, color: (taskCounters.overdue || 0) > 0 ? '#b91c1c' : 'var(--muted)' }}>
            Past due deadline
          </span>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Urgent / High
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>
            {taskCounters.high_priority ?? 0}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>High attention needed</span>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--good, #16a34a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Completed Tasks
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--good, #16a34a)' }}>
            {taskCounters.completed ?? 0}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Resolved actions</span>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pipeline Checkpoints
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#4f46e5' }}>
            {pipelineTotal}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Settlement &amp; SOP actions</span>
        </div>
      </div>

      {/* Main Workspace Navigation & Filter Tabs */}
      <div className="card" style={{ padding: '14px 18px', borderRadius: 12 }}>
        {/* Top Tab Switcher: CRM Tasks vs Pipeline Action Desk */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line)',
          paddingBottom: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setMainTab('tasks')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: mainTab === 'tasks' ? 750 : 550,
                borderRadius: 8,
                border: mainTab === 'tasks' ? '1px solid var(--cyan, #0ea5e9)' : '1px solid var(--line)',
                background: mainTab === 'tasks' ? 'var(--cyan-weak, #f0f9ff)' : 'var(--surface)',
                color: mainTab === 'tasks' ? 'var(--navy)' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckSquare size={16} />
              <span>CRM Tasks &amp; Actions</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
                background: mainTab === 'tasks' ? 'rgba(14, 165, 233, 0.2)' : 'var(--surface-3)',
                color: mainTab === 'tasks' ? 'var(--navy)' : 'var(--muted)'
              }}>
                {taskCounters.open ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('pipeline')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: mainTab === 'pipeline' ? 750 : 550,
                borderRadius: 8,
                border: mainTab === 'pipeline' ? '1px solid #4f46e5' : '1px solid var(--line)',
                background: mainTab === 'pipeline' ? '#eef2ff' : 'var(--surface)',
                color: mainTab === 'pipeline' ? '#4338ca' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={16} />
              <span>Pipeline Action Desk</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
                background: mainTab === 'pipeline' ? 'rgba(79, 70, 229, 0.2)' : 'var(--surface-3)',
                color: mainTab === 'pipeline' ? '#4338ca' : 'var(--muted)'
              }}>
                {pipelineTotal}
              </span>
            </button>
          </div>

          {/* If on CRM Tasks: List View vs Kanban Switcher */}
          {mainTab === 'tasks' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                display: 'inline-flex',
                background: 'var(--surface-3, #f1f5f9)',
                padding: 2,
                borderRadius: 8,
                border: '1px solid var(--line)'
              }}>
                <button
                  type="button"
                  onClick={() => setLayoutView('list')}
                  title="List View"
                  style={{
                    padding: '5px 9px',
                    fontSize: 12,
                    fontWeight: layoutView === 'list' ? 700 : 500,
                    border: 'none',
                    borderRadius: 6,
                    background: layoutView === 'list' ? '#ffffff' : 'transparent',
                    color: layoutView === 'list' ? 'var(--navy)' : 'var(--muted)',
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
                  onClick={() => setLayoutView('kanban')}
                  title="Kanban Board View"
                  style={{
                    padding: '5px 9px',
                    fontSize: 12,
                    fontWeight: layoutView === 'kanban' ? 700 : 500,
                    border: 'none',
                    borderRadius: 6,
                    background: layoutView === 'kanban' ? '#ffffff' : 'transparent',
                    color: layoutView === 'kanban' ? 'var(--navy)' : 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <LayoutGrid size={14} /> Kanban
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── TAB 1: CRM TASKS ────────────────────────────────────────── */}
        {mainTab === 'tasks' && (
          <div>
            {/* Filter Pills & Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 14
            }}>
              {/* Status Tabs */}
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
                {[
                  { key: 'open', label: 'All Open' },
                  { key: 'today', label: 'Due Today' },
                  { key: 'overdue', label: 'Overdue' },
                  { key: 'high', label: 'Urgent / High' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'all', label: 'All Tasks' },
                ].map((s) => {
                  const active = statusFilter === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStatusFilter(s.key)}
                      style={{
                        padding: '5px 11px',
                        fontSize: 12,
                        fontWeight: active ? 700 : 550,
                        borderRadius: 20,
                        border: active ? '1px solid var(--cyan)' : '1px solid var(--line)',
                        background: active ? 'var(--cyan-weak, #f0f9ff)' : 'var(--surface)',
                        color: active ? 'var(--navy)' : 'var(--muted)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Type Filter & Search Bar */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    height: 32,
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    padding: '0 8px',
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Task Types</option>
                  <option value="call">Calls</option>
                  <option value="meeting">Meetings</option>
                  <option value="viewing">Viewings</option>
                  <option value="email">Emails</option>
                  <option value="document">Documents</option>
                  <option value="negotiation">Negotiations</option>
                  <option value="settlement">Settlements</option>
                  <option value="general">General To-Dos</option>
                </select>

                <div style={{ width: 220 }}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tasks, properties…"
                    style={{
                      width: '100%',
                      height: 32,
                      fontSize: 12,
                      borderRadius: 6,
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      padding: '0 10px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Task Loading */}
            {tasksLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : filteredTasks.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--surface-2, #f8fafc)',
                borderRadius: 10,
                border: '1px dashed var(--line)'
              }}>
                <CheckCircle2 size={36} color="var(--good, #16a34a)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  No tasks found in this view
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted)' }}>
                  {search ? 'Try clearing your search query or filter.' : 'All caught up! Add a new CRM task to keep track of follow-ups.'}
                </p>
                <Button size="sm" className="btn-primary" icon={Plus} onClick={openNewTaskDrawer}>
                  Create New Task
                </Button>
              </div>
            ) : layoutView === 'list' ? (
              /* ── LIST VIEW ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredTasks.map((t) => {
                  const typeCfg = TASK_TYPE_CONFIG[t.task_type] || TASK_TYPE_CONFIG.general;
                  const TypeIcon = typeCfg.icon;
                  const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                  const isCompleted = t.status === 'completed';
                  const isOverdue = !isCompleted && t.due_date && t.due_date < todayIso;
                  const isToday = !isCompleted && t.due_date && t.due_date === todayIso;

                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 14px',
                        background: isCompleted ? 'var(--surface-2, #f8fafc)' : '#ffffff',
                        border: isOverdue ? '1px solid #fca5a5' : '1px solid var(--line, #e2e8f0)',
                        borderLeft: `4px solid ${isCompleted ? '#94a3b8' : priorityCfg.color}`,
                        borderRadius: 10,
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Checkbox toggle & Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => toggleTaskStatus(t)}
                          title={isCompleted ? 'Mark pending' : 'Mark complete'}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: isCompleted ? 'var(--good, #16a34a)' : 'var(--muted)',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={20} color="var(--good, #16a34a)" />
                          ) : (
                            <Circle size={20} color="#94a3b8" />
                          )}
                        </button>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: typeCfg.color,
                              background: typeCfg.bg,
                              padding: '2px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <TypeIcon size={12} /> {typeCfg.label}
                            </span>

                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: priorityCfg.color,
                              background: priorityCfg.bg,
                              border: `1px solid ${priorityCfg.border}`,
                              padding: '1px 5px',
                              borderRadius: 4
                            }}>
                              {priorityCfg.label}
                            </span>

                            <span style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: isCompleted ? 'var(--muted)' : 'var(--ink)',
                              textDecoration: isCompleted ? 'line-through' : 'none'
                            }}>
                              {t.title}
                            </span>
                          </div>

                          {/* Secondary info: Property & Contact links */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 11.5,
                            marginTop: 4,
                            color: 'var(--muted)',
                            flexWrap: 'wrap'
                          }}>
                            {t.property && (
                              <button
                                type="button"
                                onClick={() => navigate(propertyFilePath('residential', t.property.id))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--navy, #0f172a)',
                                  fontWeight: 650,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}
                              >
                                <span className="code-chip" style={{ fontSize: 10 }}>{t.property.property_code}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                  {t.property.title}
                                </span>
                              </button>
                            )}

                            {t.contact && (
                              <span style={{ color: 'var(--muted)' }}>
                                Contact: <strong>{t.contact.full_name}</strong> {t.contact.primary_phone ? `(${t.contact.primary_phone})` : ''}
                              </span>
                            )}

                            {t.description && (
                              <span style={{
                                color: 'var(--muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 220
                              }}>
                                · {t.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Meta: Due Date & Assignee & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        {/* Due Date */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: isOverdue ? '#dc2626' : isToday ? '#0284c7' : 'var(--ink)',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {isToday ? 'Today' : t.due_date || 'No date'}
                            {t.due_time ? ` · ${t.due_time}` : ''}
                          </div>
                          {isOverdue && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>
                              Overdue
                            </span>
                          )}
                        </div>

                        {/* Assignee initials badge */}
                        {t.assignee && (
                          <div
                            title={`Assigned to ${t.assignee.name}`}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              color: '#334155',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 10.5,
                              fontWeight: 750
                            }}
                          >
                            {(t.assignee.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Edit}
                            onClick={() => openEditTaskDrawer(t)}
                            title="Edit Task"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            onClick={() => deleteTask(t.id)}
                            title="Delete Task"
                            style={{ color: '#ef4444' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── KANBAN BOARD VIEW ── */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {/* Column 1: Pending */}
                <div style={{ background: 'var(--surface-2, #f8fafc)', borderRadius: 10, padding: 12, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                      <strong style={{ fontSize: 13 }}>To Do / Pending</strong>
                    </div>
                    <Badge tone="amber">{kanbanColumns.pending.length}</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {kanbanColumns.pending.map((t) => (
                      <KanbanTaskCard
                        key={t.id}
                        task={t}
                        onEdit={() => openEditTaskDrawer(t)}
                        onAdvance={() => api.patch(`/sales/tasks/${t.id}/status`, { status: 'in_progress' }).then(loadTasks)}
                        advanceLabel="Start Task"
                      />
                    ))}
                    {kanbanColumns.pending.length === 0 && (
                      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>No pending tasks</div>
                    )}
                  </div>
                </div>

                {/* Column 2: In Progress */}
                <div style={{ background: 'var(--surface-2, #f8fafc)', borderRadius: 10, padding: 12, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
                      <strong style={{ fontSize: 13 }}>In Progress</strong>
                    </div>
                    <Badge tone="blue">{kanbanColumns.in_progress.length}</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {kanbanColumns.in_progress.map((t) => (
                      <KanbanTaskCard
                        key={t.id}
                        task={t}
                        onEdit={() => openEditTaskDrawer(t)}
                        onAdvance={() => api.patch(`/sales/tasks/${t.id}/status`, { status: 'completed' }).then(loadTasks)}
                        advanceLabel="Mark Done"
                      />
                    ))}
                    {kanbanColumns.in_progress.length === 0 && (
                      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>No tasks in progress</div>
                    )}
                  </div>
                </div>

                {/* Column 3: Completed */}
                <div style={{ background: 'var(--surface-2, #f8fafc)', borderRadius: 10, padding: 12, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                      <strong style={{ fontSize: 13 }}>Completed</strong>
                    </div>
                    <Badge tone="green">{kanbanColumns.completed.length}</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {kanbanColumns.completed.map((t) => (
                      <KanbanTaskCard
                        key={t.id}
                        task={t}
                        onEdit={() => openEditTaskDrawer(t)}
                        onAdvance={() => api.patch(`/sales/tasks/${t.id}/status`, { status: 'pending' }).then(loadTasks)}
                        advanceLabel="Reopen"
                      />
                    ))}
                    {kanbanColumns.completed.length === 0 && (
                      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>No completed tasks</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: PIPELINE ACTION DESK ─────────────────────────────────── */}
        {mainTab === 'pipeline' && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--muted)' }}>
              Server-derived operational action items across live transactions, settlements, and SOP deadlines:
            </div>

            {pipelineLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : pipelineGroups.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--surface-2, #f8fafc)',
                borderRadius: 10,
                border: '1px dashed var(--line)'
              }}>
                <CheckCircle2 size={36} color="var(--good, #16a34a)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  All Pipeline Actions Cleared! 🎉
                </h3>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                  There are no settlements or SOP stages currently requiring your attention.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pipelineGroups.map(([k, rows]) => (
                  <div key={k} style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '10px 16px',
                      background: 'var(--surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'var(--ink)' }}>
                        {PIPELINE_KIND[k]?.[0] || k}
                      </h4>
                      <Badge tone="amber">{rows.length}</Badge>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="tbl" style={{ width: '100%', fontSize: 12.5 }}>
                        <tbody>
                          {rows.map((it, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--line-soft, #f1f5f9)' }}>
                              <td style={{ padding: '10px 16px' }}>
                                <div style={{ fontWeight: 650, color: 'var(--ink)' }}>
                                  {it.label}
                                </div>
                                {it.property_code && (
                                  <span className="code-chip" style={{ fontSize: 10.5, marginTop: 2 }}>
                                    {it.property_code}
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                                {it.amount != null ? money(it.amount) : ''}
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: 16 }}>
                                <Button size="sm" variant="ghost" onClick={() => goPipeline(it)}>
                                  Resolve Action <ArrowRight size={12} style={{ marginLeft: 4 }} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Creation / Editing Drawer */}
      {drawerOpen && (
        <Drawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setEditingTask(null);
          }}
          title={editingTask ? `Edit Task · ${editingTask.task_code}` : 'Create CRM Sales Task'}
          width={480}
        >
        <form onSubmit={saveTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <Field label="Task Title *" hint="Action-oriented summary of the to-do">
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="e.g. Call buyer Mr. Rahim regarding revised offer"
              autoFocus
            />
          </Field>

          {/* Quick Suggestions */}
          {!editingTask && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: -6 }}>
              {[
                'Call buyer on offer terms',
                'Schedule inspection viewing',
                'Send draft sale agreement',
                'Follow up on deposit transfer',
                'Review settlement statement'
              ].map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => setTaskForm({ ...taskForm, title: sugg })}
                  style={{
                    border: '1px solid var(--line)',
                    background: 'var(--surface-3, #f1f5f9)',
                    borderRadius: 12,
                    fontSize: 10.5,
                    padding: '2px 8px',
                    color: 'var(--muted)',
                    cursor: 'pointer'
                  }}
                >
                  + {sugg}
                </button>
              ))}
            </div>
          )}

          {/* Type & Priority Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Task Type">
              <Select
                value={taskForm.task_type}
                onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}
              >
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="viewing">Viewing</option>
                <option value="email">Email</option>
                <option value="document">Document Review</option>
                <option value="negotiation">Negotiation</option>
                <option value="settlement">Settlement Action</option>
                <option value="general">General To-Do</option>
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

          {/* Due Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <Field label="Due Date">
              <Input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </Field>
            <Field label="Due Time">
              <Input
                type="time"
                value={taskForm.due_time}
                onChange={(e) => setTaskForm({ ...taskForm, due_time: e.target.value })}
              />
            </Field>
          </div>

          {/* Status (if editing) */}
          {editingTask && (
            <Field label="Status">
              <Select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
          )}

          {/* Associated Property */}
          <Field label="Associated Property (Optional)">
            <Select
              value={taskForm.property_id}
              onChange={(e) => setTaskForm({ ...taskForm, property_id: e.target.value })}
            >
              <option value="">No Property linked</option>
              {propertiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_code ? `${p.property_code} · ` : ''}{p.title}
                </option>
              ))}
            </Select>
          </Field>

          {/* Associated Contact */}
          <Field label="Associated Contact (Optional)">
            <Select
              value={taskForm.contact_id}
              onChange={(e) => setTaskForm({ ...taskForm, contact_id: e.target.value })}
            >
              <option value="">No Contact linked</option>
              {contactsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.primary_phone ? `(${c.primary_phone})` : ''}
                </option>
              ))}
            </Select>
          </Field>

          {/* Assignee */}
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

          {/* Notes / Description */}
          <Field label="Description &amp; Action Notes">
            <Textarea
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="Add key context, talking points, or follow-up criteria..."
            />
          </Field>

          {/* Drawer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
            {editingTask ? (
              <Button
                type="button"
                variant="ghost"
                style={{ color: '#ef4444' }}
                onClick={() => deleteTask(editingTask.id)}
              >
                Delete Task
              </Button>
            ) : <div />}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={savingTask}>
                {savingTask ? 'Saving…' : editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      </Drawer>
      )}
    </div>
  );
}

// Subcomponent: Kanban Card
function KanbanTaskCard({ task, onEdit, onAdvance, advanceLabel }) {
  const typeCfg = TASK_TYPE_CONFIG[task.task_type] || TASK_TYPE_CONFIG.general;
  const TypeIcon = typeCfg.icon;
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const todayIso = new Date().toISOString().slice(0, 10);
  const isOverdue = task.status !== 'completed' && task.due_date && task.due_date < todayIso;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 8,
      border: isOverdue ? '1px solid #fca5a5' : '1px solid var(--line, #e2e8f0)',
      borderLeft: `3px solid ${priorityCfg.color}`,
      padding: '10px 12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: typeCfg.color,
          background: typeCfg.bg,
          padding: '2px 5px',
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3
        }}>
          <TypeIcon size={11} /> {typeCfg.label}
        </span>

        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: priorityCfg.color,
          background: priorityCfg.bg,
          padding: '1px 5px',
          borderRadius: 4
        }}>
          {priorityCfg.label}
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
        {task.title}
      </div>

      {task.description && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </div>
      )}

      {task.property && (
        <div style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 650 }}>
          🏠 {task.property.property_code || ''} · {task.property.title}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingTop: 6,
        borderTop: '1px solid var(--line-soft, #f1f5f9)'
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: isOverdue ? '#dc2626' : 'var(--muted)'
        }}>
          {task.due_date || 'No date'} {task.due_time || ''}
        </span>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted)' }}
            title="Edit"
          >
            <Edit size={13} />
          </button>
          <button
            type="button"
            onClick={onAdvance}
            style={{
              border: 'none',
              background: 'var(--surface-3)',
              borderRadius: 4,
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--navy)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            {advanceLabel} <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
