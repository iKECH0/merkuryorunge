import React, { useState, useEffect } from 'react';
import { getLeaderboard, getDailyLeaderboard } from '../api';
import { Trophy, Medal, Star, Calendar, Globe } from 'lucide-react';

const Leaderboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('Genel');

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = timeframe === 'daily' ? await getDailyLeaderboard() : await getLeaderboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center text-primary animate-pulse-glow" style={{ padding: '40px' }}>Veriler çekiliyor...</div>;

  return (
    <div className="glass-card slide-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Trophy size={32} color="var(--color-primary)" className="animate-pulse-glow" />
          <h2 className="title" style={{ margin: 0, fontSize: '24px' }}>Sıralama</h2>
        </div>
        
        {/* Toggle Switch */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '100px', padding: '4px' }}>
          <button 
            onClick={() => setTimeframe('all')}
            style={{ 
              padding: '8px 16px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.3s',
              background: timeframe === 'all' ? 'var(--color-primary)' : 'transparent',
              color: timeframe === 'all' ? '#fff' : 'var(--color-text-muted)'
            }}
          >
            <Globe size={16} /> Genel
          </button>
          <button 
            onClick={() => setTimeframe('daily')}
            style={{ 
              padding: '8px 16px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.3s',
              background: timeframe === 'daily' ? 'var(--color-primary)' : 'transparent',
              color: timeframe === 'daily' ? '#fff' : 'var(--color-text-muted)'
            }}
          >
            <Calendar size={16} /> Bugün
          </button>
        </div>
      </div>

      {/* School Level Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '8px' }}>
        {['Genel', 'İlkokul', 'Ortaokul (LGS)', 'Lise (YKS)'].map(level => (
          <button 
            key={level}
            onClick={() => setSelectedLevel(level)}
            style={{ 
              padding: '8px 16px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.3s',
              background: selectedLevel === level ? 'rgba(6, 182, 212, 0.15)' : 'rgba(0,0,0,0.2)',
              color: selectedLevel === level ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: selectedLevel === level ? '0 4px 12px rgba(6, 182, 212, 0.2)' : 'none'
            }}
          >
            {level}
          </button>
        ))}
      </div>

      {data.filter(s => selectedLevel === 'Genel' || s.school_level === selectedLevel).length === 0 ? (
        <p className="text-center text-muted">Henüz {timeframe === 'daily' ? 'bugün için' : ''} veri yok. İlk sırayı sen al!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.filter(s => selectedLevel === 'Genel' || s.school_level === selectedLevel).map((student, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;
            
            let rankColor = 'rgba(255,255,255,0.1)';
            let rankTextColor = 'var(--color-text-muted)';
            if (isFirst) { rankColor = 'linear-gradient(135deg, #f59e0b, #d97706)'; rankTextColor = '#fff'; }
            else if (isSecond) { rankColor = 'linear-gradient(135deg, #94a3b8, #64748b)'; rankTextColor = '#fff'; }
            else if (isThird) { rankColor = 'linear-gradient(135deg, #b45309, #78350f)'; rankTextColor = '#fff'; }

            return (
              <div 
                key={index} 
                className="fade-in"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: isFirst ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isFirst ? 'rgba(6, 182, 212, 0.3)' : 'var(--color-border)'}`,
                  borderRadius: '16px',
                  transition: 'all 0.3s ease',
                  animationDelay: `${index * 0.1}s`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isFirst && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)' }} />}
                
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '12px', 
                  background: rankColor, 
                  color: rankTextColor,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  marginRight: '20px',
                  boxShadow: isFirst ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                }}>
                  {isFirst ? <Trophy size={20} /> : isSecond ? <Medal size={20} /> : isThird ? <Star size={20} /> : index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '18px', color: isFirst ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                    {student.student_name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {student.total_duration} dk süre • {student.total_questions} soru çözüldü
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '22px', color: isFirst ? 'var(--color-primary-light)' : 'var(--color-primary)', fontFamily: 'var(--font-primary)' }}>
                    {student.total_points || (Number(student.total_duration) + Number(student.total_questions)*2)} <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-muted)' }}>Puan</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
