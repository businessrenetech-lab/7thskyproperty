import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  MessageSquare, 
  Bell, 
  Mail, 
  Phone,
  Info,
  Loader2,
  Edit3
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const emptyForm = { name: '', trigger_type: 'new_lead', action_type: 'create_notification', template: '' };

const Automation = () => {
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [runningBirthdayCheck, setRunningBirthdayCheck] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  const birthdayTemplate = 'Dear {Name}, Wish You Wonderful Year Ahead. Happy Birthday. From Language Academy Bangladesh.';

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await api.get('/automation');
      setRules(res.data);
    } catch (err) {
      console.error('Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setFormData({ ...emptyForm });
    setShowModal(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || '',
      trigger_type: rule.trigger_type || 'new_lead',
      action_type: rule.action_type || 'create_notification',
      template: rule.template || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setFormData({ ...emptyForm });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await api.put(`/automation/${editingRule.id}`, formData);
        toast.success('Automation rule updated');
      } else {
        await api.post('/automation', formData);
        toast.success('Automation rule created');
      }
      closeModal();
      fetchRules();
    } catch (err) {
      toast.error(editingRule ? 'Failed to update rule' : 'Failed to create rule');
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/automation/${id}/toggle`);
      setRules(rules.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
    } catch (err) {
      toast.error('Toggle failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automation rule?')) return;
    try {
      await api.delete(`/automation/${id}`);
      fetchRules();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleRunBirthdayCheck = async () => {
    setRunningBirthdayCheck(true);
    try {
      const res = await api.post('/automation/run-birthday-check');
      toast.success(`Birthday check complete. Processed: ${res.data.processed || 0}, Sent: ${res.data.sent || 0}`);
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Birthday check failed');
    } finally {
      setRunningBirthdayCheck(false);
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'send_sms': return <Phone size={16} />;
      case 'send_whatsapp': return <MessageSquare size={16} />;
      case 'create_notification': return <Bell size={16} />;
      case 'send_email': return <Mail size={16} />;
      default: return <Zap size={16} />;
    }
  };

  const getTriggerLabel = (type) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Automation Rules Engine</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Configure automated responses and notifications for system events</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={handleRunBirthdayCheck} style={{ opacity: runningBirthdayCheck ? 0.7 : 1 }}>
            {runningBirthdayCheck ? 'Running Birthday Check...' : 'Run Birthday Check'}
          </Button>
          <Button icon={<Plus size={18} />} onClick={openCreateModal}>Create Workflow</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" size={32} /></div>
        ) : rules.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '5rem', opacity: 0.6 }}>
             <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
             <p>No automation rules defined yet.</p>
          </Card>
        ) : rules.map(rule => (
          <Card key={rule.id} hover={false} style={{ borderLeft: `4px solid ${rule.is_active ? 'var(--primary)' : 'var(--text-dim)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <div 
                  onClick={() => handleToggle(rule.id)}
                  style={{ cursor: 'pointer', color: rule.is_active ? 'var(--success)' : 'var(--text-dim)' }}
                >
                  {rule.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>{rule.name}</h4>
                    <Badge variant={rule.is_active ? 'primary' : 'ghost'}>{getTriggerLabel(rule.trigger_type)}</Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    {getActionIcon(rule.action_type)}
                    <span>Action: {rule.action_type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ maxWidth: '300px', fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px', fontStyle: 'italic' }}>
                   "{rule.template}"
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => openEditModal(rule)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                    title="Edit rule"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(rule.id)} style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.8)'}
                    onMouseOut={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.4)'}
                    title="Delete rule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="glass-morphism" style={{ padding: '1.5rem', background: 'rgba(56, 189, 248, 0.05)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <Info color="var(--primary)" size={20} style={{ marginTop: '2px' }} />
        <div>
           <h5 style={{ color: 'var(--primary)', marginBottom: '0.4rem' }}>Placeholder Guide</h5>
           <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
             Use these tags in your templates: <code style={{ color: 'white' }}>{'{Name}'}</code>, <code style={{ color: 'white' }}>{'{student_name}'}</code>, <code style={{ color: 'white' }}>{'{amount}'}</code>, <code style={{ color: 'white' }}>{'{date}'}</code>, <code style={{ color: 'white' }}>{'{batch_name}'}</code>. Tags are automatically swapped with live data when triggered.
            </p>
         </div>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingRule ? 'Edit Automation Rule' : 'New Automation Rule'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <Input 
            label="Rule Name" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g. Welcome Message for New Leads"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>When this happens (Trigger)</label>
              <select className="glass-input" style={{ width: '100%', padding: '0.8rem' }} value={formData.trigger_type} onChange={e => setFormData(prev => ({
                ...prev,
                trigger_type: e.target.value,
                action_type: e.target.value === 'birthday_reminder' ? 'send_sms' : prev.action_type,
                template: e.target.value === 'birthday_reminder' && !prev.template ? birthdayTemplate : prev.template
              }))}>
                <option value="new_lead">New Lead Created</option>
                <option value="student_absent">Student Marked Absent</option>
                <option value="fee_overdue">Fee Becomes Overdue</option>
                <option value="batch_full">Batch Reaches Capacity</option>
                <option value="enrollment_confirmed">Enrollment Confirmed</option>
                <option value="birthday_reminder">Birthday Reminder</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>Do this (Action)</label>
              <select className="glass-input" style={{ width: '100%', padding: '0.8rem' }} value={formData.action_type} onChange={e => setFormData({...formData, action_type: e.target.value})}>
                <option value="create_notification">In-App Notification</option>
                <option value="send_sms">Send SMS Notification</option>
                <option value="send_whatsapp">Send WhatsApp Message</option>
                <option value="send_email">Send Email Alert</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>Message Template</label>
            <textarea 
              className="glass-input"
              required
              value={formData.template}
              onChange={e => setFormData({...formData, template: e.target.value})}
              placeholder="Hi {student_name}, welcome to Language Academy! We've received your interest in {batch_name}."
              style={{ width: '100%', height: '120px', padding: '1rem', resize: 'none' }}
            />
          </div>
          <Button type="submit" style={{ marginTop: '1rem', padding: '1rem' }}>
            {editingRule ? 'Update Automation Rule' : 'Synchronize Automation'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default Automation;
