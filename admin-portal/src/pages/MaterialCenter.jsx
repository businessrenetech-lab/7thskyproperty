import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Video, 
  Link as LinkIcon, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Send,
  Loader2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const MaterialCenter = () => {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [commsModal, setCommsModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    type: 'document'
  });

  const [commsData, setCommsData] = useState({
    message: '',
    channel: 'whatsapp'
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) fetchMaterials();
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/lms/batches');
      setBatches(res.data);
      if (res.data.length > 0) setSelectedBatch(res.data[0].id);
    } catch (err) {
      console.error('Failed to fetch batches');
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/materials/batch/${selectedBatch}`);
      setMaterials(res.data);
    } catch (err) {
      console.error('Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    try {
      await api.post('/materials', { ...formData, batch_id: selectedBatch });
      setShowModal(false);
      setFormData({ title: '', description: '', url: '', type: 'document' });
      fetchMaterials();
    } catch (err) {
      toast.error('Failed to share material');
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await api.delete(`/materials/${id}`);
      fetchMaterials();
    } catch (err) {
      toast.error('Failed to delete material');
    }
  };

  const handleComms = async (e) => {
    e.preventDefault();
    try {
      await api.post('/materials/share', { ...commsData, batch_id: selectedBatch });
      setCommsModal(false);
      setCommsData({ message: '', channel: 'whatsapp' });
      toast.info('Message dispatched to batch members');
    } catch (err) {
      toast.error('Communication failed');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'document': return <FileText size={18} />;
      case 'video': return <Video size={18} />;
      case 'link': return <LinkIcon size={18} />;
      case 'meeting': return <LinkIcon size={18} color="var(--primary)" />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Academic Material Center</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Share resources and broadcast updates to your batches</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={selectedBatch} 
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="glass-input"
            style={{ padding: '0.7rem 1.2rem', width: '200px' }}
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="glass-morphism btn-secondary" onClick={() => setCommsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} /> Broadcast
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Share Material
          </button>
        </div>
      </div>

      <div className="glass-morphism" style={{ padding: '2rem', minHeight: '400px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <Loader2 className="animate-spin" color="var(--primary)" size={32} />
          </div>
        ) : materials.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-dim)' }}>
            <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No materials shared with this batch yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {materials.map(item => (
              <div key={item.id} className="glass-morphism transition-hover" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--glass)', padding: '0.5rem', borderRadius: '8px' }}>
                    {getIcon(item.type)}
                  </div>
                  <button onClick={() => handleDeleteMaterial(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{item.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1.5rem', height: '40px', overflow: 'hidden' }}>{item.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{item.type}</span>
                  <a href={item.url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    View <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Material Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Share Batch Material">
        <form onSubmit={handleCreateMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Title</label>
            <input 
              className="glass-input"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. PTE Speaking Templates"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Type</label>
            <select 
              className="glass-input"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="document">Document (PDF/Doc)</option>
              <option value="video">Video Lesson</option>
              <option value="link">Resource Link</option>
              <option value="meeting">Class Link (Zoom/GMeet)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Material URL / Meeting Link</label>
            <input 
              className="glass-input"
              required
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              placeholder="https://..."
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Description</label>
            <textarea 
              className="glass-input"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              style={{ height: '80px', resize: 'none' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>
            Post to Batch
          </button>
        </form>
      </Modal>

      {/* Broadcast Modal */}
      <Modal isOpen={commsModal} onClose={() => setCommsModal(false)} title="Broadcast to Batch Members">
        <form onSubmit={handleComms} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Broadcast Channel</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setCommsData({...commsData, channel: 'whatsapp'})}
                className={commsData.channel === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1 }}
              >
                WhatsApp
              </button>
              <button 
                type="button" 
                onClick={() => setCommsData({...commsData, channel: 'sms'})}
                className={commsData.channel === 'sms' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1 }}
              >
                SMS Gateway
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Your Message</label>
            <textarea 
              className="glass-input"
              required
              value={commsData.message}
              onChange={(e) => setCommsData({...commsData, message: e.target.value})}
              placeholder="Share updates, links, or schedule changes..."
              style={{ height: '120px', resize: 'none' }}
            />
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            <AlertCircle size={12} inline /> Members will receive this message based on their registered contact info.
          </p>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={18} /> Send Broadcast
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default MaterialCenter;
