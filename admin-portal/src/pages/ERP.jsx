import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Layers, 
  DoorOpen, 
  Users, 
  Clock, 
  Plus, 
  Loader2, 
  Calendar,
  AlertCircle,
  X,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import '../styles/GlobalStyles.css';
import { useToast } from '../context/ToastContext';

const RoomCard = ({ room, onSelect }) => {
  const toast = useToast();
  return (
    <div 
      className="glass-morphism transition-hover" 
      onClick={() => onSelect(room)}
      style={{ 
        padding: '1.2rem', 
        minWidth: '220px', 
        flex: '1',
        cursor: 'pointer',
        border: room.status === 'occupied' ? '1px solid var(--danger-glow)' : '1px solid var(--border)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontWeight: '700' }}>{room.name}</h4>
        <span style={{ 
          fontSize: '0.7rem', 
          background: room.status === 'free' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: room.status === 'free' ? 'var(--success)' : 'var(--danger)',
          padding: '2px 8px',
          borderRadius: '10px',
          textTransform: 'uppercase'
        }}>
          {room.status}
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={14} /> <span>{room.floor} Floor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={14} /> <span>Cap: {room.capacity}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DoorOpen size={14} /> <span>Facilities: {Object.keys(room.facilities || {}).join(', ') || 'Standard'}</span>
        </div>
      </div>
    </div>
  );
};

const ERPSpaces = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Forms State
  const [bookingData, setBookingData] = useState({
    room_id: '',
    batch_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '11:00'
  });

  const [roomData, setRoomData] = useState({
    name: '',
    floor: '',
    capacity: 30,
    facilities: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, batchesRes, bookingsRes] = await Promise.all([
        api.get('/erp/rooms'),
        api.get('/lms/batches'),
        api.get(`/erp/bookings?date=${selectedDate}`)
      ]);
      setRooms(roomsRes.data);
      setBatches(batchesRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      console.error('Failed to fetch ERP data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      await api.post('/erp/bookings', bookingData);
      setShowBookingModal(false);
      fetchData();
      toast.success('Room booked successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post('/erp/rooms', {
        ...roomData,
        facilities: roomData.facilities.split(',').reduce((acc, f) => ({...acc, [f.trim()]: true}), {})
      });
      setShowRoomModal(false);
      setRoomData({ name: '', floor: '', capacity: 30, facilities: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to create room');
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.delete(`/erp/bookings/${id}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to cancel booking');
    }
  };

  if (loading) return <div className="canvas"><Loader2 className="animate-spin" color="var(--primary)" size={48} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>ERP Spaces & Scheduling</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Real-time facility management and room occupancy</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="glass-morphism btn-secondary" onClick={() => setShowRoomModal(true)} style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add Room
          </button>
          <button className="btn-primary" onClick={() => setShowBookingModal(true)}>
            <Plus size={18} /> Book a Space
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 3fr', gap: '1.5rem' }}>
        {/* Floor Map Simulation */}
        <div className="glass-morphism" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Map size={18} /> Branch Floor Plan
          </h3>
          <div style={{ 
            height: '400px', 
            background: 'var(--glass)', 
            borderRadius: 'var(--radius)', 
            border: '2px dashed var(--border)',
            position: 'relative',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '1rem' }}>ACTIVE MAP (SYMMETRIC VIEW)</div>
            {/* Visual occupancy representation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', height: '80%' }}>
              {rooms.map(room => (
                <div 
                  key={room.id}
                  style={{
                    background: room.status === 'free' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${room.status === 'free' ? 'var(--success)' : 'var(--danger)'}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    padding: '5px'
                  }}
                >
                  {room.name}<br/>{room.status}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
             {rooms.map(room => (
               <RoomCard key={room.id} room={room} onSelect={(r) => {
                 setBookingData({...bookingData, room_id: r.id});
                 setShowBookingModal(true);
               }} />
             ))}
           </div>

           <div className="glass-morphism" style={{ padding: '1.5rem', flex: '1' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <Calendar size={18} /> Daily Schedule Registry
               </h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                 <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Filter by Date:</span>
                 <input 
                   type="date" 
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="glass-input"
                   style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                 />
               </div>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {bookings.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                   No bookings registered for {new Date(selectedDate).toLocaleDateString()}.
                 </div>
               ) : bookings.map((item) => (
                 <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', background: 'var(--glass)', borderRadius: 'var(--radius)' }}>
                   <div style={{ fontWeight: '700', color: 'var(--primary)', width: '80px', fontSize: '0.8rem' }}>
                     {item.start_time.slice(0,5)} - {item.end_time.slice(0,5)}
                   </div>
                   <div style={{ flex: '1' }}>
                     <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.Batch?.name}</p>
                     <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.Room?.name} | Capacity: {item.Room?.capacity}</p>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ 
                       padding: '0.4rem 1rem', 
                       fontSize: '0.7rem', 
                       background: 'rgba(56, 189, 248, 0.1)', 
                       borderRadius: '4px',
                       color: 'var(--primary)'
                     }}>
                       Confirmed
                     </div>
                     <button 
                       onClick={() => handleDeleteBooking(item.id)}
                       style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Modal 
        isOpen={showBookingModal} 
        onClose={() => setShowBookingModal(false)} 
        title="Book a Space"
      >
        <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Select Room</label>
            <select 
              className="glass-input"
              required
              value={bookingData.room_id}
              onChange={(e) => setBookingData({...bookingData, room_id: e.target.value})}
              style={{ width: '100%', appearance: 'auto' }}
            >
              <option value="">Select a room...</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Floor: {r.floor})</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Select Batch / Class</label>
            <select 
              className="glass-input"
              required
              value={bookingData.batch_id}
              onChange={(e) => setBookingData({...bookingData, batch_id: e.target.value})}
              style={{ width: '100%', appearance: 'auto' }}
            >
              <option value="">Select batch...</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Booking Date</label>
            <input 
              className="glass-input"
              type="date" 
              required
              value={bookingData.date}
              onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Start Time</label>
              <input 
                className="glass-input"
                type="time" 
                required
                value={bookingData.start_time}
                onChange={(e) => setBookingData({...bookingData, start_time: e.target.value})}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>End Time</label>
              <input 
                className="glass-input"
                type="time" 
                required
                value={bookingData.end_time}
                onChange={(e) => setBookingData({...bookingData, end_time: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>
            Confirm Booking
          </button>
        </form>
      </Modal>

      {/* Add Room Modal */}
      <Modal 
        isOpen={showRoomModal} 
        onClose={() => setShowRoomModal(false)} 
        title="Add New Room"
      >
        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Room Name</label>
            <input 
              className="glass-input"
              type="text" 
              required
              value={roomData.name}
              onChange={(e) => setRoomData({...roomData, name: e.target.value})}
              placeholder="e.g. Lab 101"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Floor</label>
              <input 
                className="glass-input"
                type="text" 
                required
                value={roomData.floor}
                onChange={(e) => setRoomData({...roomData, floor: e.target.value})}
                placeholder="e.g. 1st"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Capacity</label>
              <input 
                className="glass-input"
                type="number" 
                required
                value={roomData.capacity}
                onChange={(e) => setRoomData({...roomData, capacity: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.5rem' }}>Facilities (Comma separated)</label>
            <input 
              className="glass-input"
              type="text" 
              value={roomData.facilities}
              onChange={(e) => setRoomData({...roomData, facilities: e.target.value})}
              placeholder="e.g. AC, Projector, High-speed Wi-Fi"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>
            Initialize Room
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ERPSpaces;
