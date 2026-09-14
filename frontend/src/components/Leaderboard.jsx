import React, { useEffect, useState } from 'react';
import { getDailyLeaderboard, getLeaderboard } from '../api';
import { Calendar, Globe, Medal, Star } from 'lucide-react';

const Leaderboard = ({ studentUsername: propUsername }) => {
  // Fallback to localStorage if prop is missing (e.g. old sessions)
  const studentUsername = propUsername || localStorage.getItem('studentUsername') || '';
  const [result, setResult] = useState({ rank: null, total_points: 0 });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      try {
        const data = timeframe === 'daily'
          ? await getDailyLeaderboard(studentUsername)
          : await getLeaderboard(studentUsername);
        setResult(data || { rank: null, total_points: 0 });
      } catch (error) {
        console.error(error);
        setResult({ rank: null, total_points: 0 });
      } finally {
        setLoading(false);
      }
    };

    // Only call if we have a valid, non-empty username
    const validUsername = studentUsername && studentUsername.trim() && studentUsername !== 'null' && studentUsername !== 'undefined';
    if (validUsername) fetchResult();
    else setLoading(false);
  }, [studentUsername, timeframe]);

  return (
    <div className="glass-card slide-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Medal size={32} color="var(--color-primary)" />
          <div>
            <h2 className="title" style={{ margin: 0, fontSize: '24px' }}>Başarı Durumum</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>Yalnızca kendi sonuçlarını görüyorsun.</p>
          </div>
        </div>

        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '100px', padding: '4px' }}>
          {[
            { value: 'all', label: 'Genel', icon: Globe },
            { value: 'daily', label: 'Bugün', icon: Calendar }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTimeframe(value)}
              style={{
                padding: '8px 16px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                background: timeframe === value ? 'var(--color-primary)' : 'transparent',
                color: timeframe === value ? '#fff' : 'var(--color-text-muted)'
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-primary animate-pulse-glow" style={{ padding: '40px' }}>Sonucun hazırlanıyor...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <div style={{ padding: '24px 16px', textAlign: 'center', borderRadius: '18px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <Medal size={26} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '6px' }}>Sıralaman</div>
            <div style={{ fontSize: '34px', lineHeight: 1, fontWeight: '800', color: 'var(--color-primary-light)' }}>
              {result.rank ? `${result.rank}.` : '—'}
            </div>
          </div>
          <div style={{ padding: '24px 16px', textAlign: 'center', borderRadius: '18px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <Star size={26} color="#a78bfa" style={{ marginBottom: '8px' }} />
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '6px' }}>Puanın</div>
            <div style={{ fontSize: '34px', lineHeight: 1, fontWeight: '800', color: '#c4b5fd' }}>
              {Number(result.total_points || 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
