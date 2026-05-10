import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const QuickCheckIn = () => {
  const toast = useToast();
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));

  const handlePunch = async (type) => {
    try {
      const userObj = JSON.parse(localStorage.getItem('user'));
      if(!userObj) { toast.error("User not found in session!"); return; }

      let latitude = null;
      let longitude = null;

      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 0 });
        });
        latitude = pos.coords.latitude.toString();
        longitude = pos.coords.longitude.toString();
      } catch (locErr) {
        console.warn("Location access denied or failed:", locErr);
      }

      const payload = {
        action: type,
        latitude,
        longitude,
      };

      await api.post('/hrm/attendance/self-checkin', payload);
      toast.success(`Successfully punched ${type === 'in' ? 'in' : 'out'} at ${time}`);
    } catch(e) {
      toast.error(e.response?.data?.error || `Failed to punch ${type}!`);
    }
  };

  return (
    <div className="glass-morphism" style={{ 
      padding: '1.2rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      background: 'rgba(56, 232, 255, 0.05)', 
      border: '1px solid var(--primary)',
      marginBottom: '1.5rem',
      borderRadius: '8px'
    }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
          <Clock size={18} color="var(--primary)" /> My Daily Check-In
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>Log your own daily entry and exit times</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input 
          type="time" 
          className="glass-input" 
          value={time}
          onChange={e => setTime(e.target.value)}
          style={{ width: '110px' }} 
        />
        <button className="btn-primary" onClick={() => handlePunch('in')}>Punch In</button>
        <button className="btn-secondary" onClick={() => handlePunch('out')}>Punch Out</button>
      </div>
    </div>
  );
};

export default QuickCheckIn;
