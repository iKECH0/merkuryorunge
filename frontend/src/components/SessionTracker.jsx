import React, { useState, useEffect } from 'react';
import { submitLog } from '../api';
import { Play, Square, BookOpen } from 'lucide-react';
const SUBJECTS = ['Paragraf', 'Problemler', 'Kitap Okuma', 'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'Tarih', 'T.C. İnkılap Tarihi ve Atatürkçülük', 'İnkılap Tarihi', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Hayat Bilgisi', 'Beden Eğitimi ve Spor', 'Beden Eğitimi ve Oyun', 'Görsel Sanatlar', 'Müzik'];

const SessionTracker = ({ onSessionEnded, studentName }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [questionsSolved, setQuestionsSolved] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedTime((time) => time + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const handleStart = () => {
    if (!studentName) {
      alert("Lütfen önce giriş yapın.");
      return;
    }
    setIsTracking(true);
  };

  const handleStop = async () => {
    if (elapsedTime < 60) {
      const confirmShort = window.confirm("1 dakikadan az çalıştınız. Yine de kaydedilsin mi?");
      if (!confirmShort) {
        setElapsedTime(0);
        setIsTracking(false);
        return;
      }
    }
    
    setLoading(true);
    try {
      const durationMinutes = Math.max(1, Math.floor(elapsedTime / 60));
      await submitLog({
        studentName,
        subject,
        duration: durationMinutes,
        questionsSolved: parseInt(questionsSolved) || 0
      });
      setElapsedTime(0);
      setQuestionsSolved('');
      setIsTracking(false);
      if (onSessionEnded) onSessionEnded();
    } catch (err) {
      alert("Bir hata oluştu.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card slide-up text-center">
      <h2 className="title" style={{ fontSize: '22px', marginBottom: '8px' }}>Canlı Seans</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>Odaklan ve çalışmanı başlat</p>
      
      {!isTracking && elapsedTime === 0 && (
        <div style={{ textAlign: 'left', marginBottom: '32px' }} className="fade-in">
          <div className="input-group">
            <label className="input-label">Çalışılacak Ders</label>
            <div style={{ position: 'relative' }}>
              <BookOpen size={20} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <select 
                className="input-field"
                style={{ paddingLeft: '48px' }}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUBJECTS.map(subj => (
                  <option key={subj} value={subj} style={{ background: 'var(--color-bg-deep)', color: 'white' }}>{subj}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div style={{ margin: '40px 0' }}>
        <div 
          className={isTracking ? 'animate-pulse-glow text-gradient' : ''}
          style={{ 
            fontSize: '64px', 
            fontWeight: '800', 
            fontFamily: 'var(--font-primary)',
            letterSpacing: '-0.05em',
            color: isTracking ? 'transparent' : 'var(--color-text-main)',
            lineHeight: 1
          }}
        >
          {formatTime(elapsedTime)}
        </div>
      </div>

      {!isTracking && elapsedTime === 0 ? (
        <button className="btn btn-primary" onClick={handleStart} style={{ width: '100%', padding: '20px' }}>
          <Play size={24} fill="currentColor" /> Çalışmaya Başla
        </button>
      ) : isTracking ? (
        <button className="btn btn-danger" onClick={() => setIsTracking(false)} style={{ width: '100%', padding: '20px' }}>
          <Square size={24} fill="currentColor" /> Seansı Bitir
        </button>
      ) : (
        <div style={{ textAlign: 'left' }} className="fade-in">
          <div className="input-group">
            <label className="input-label">Çözülen Soru Sayısı (Opsiyonel)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0"
              value={questionsSolved}
              onChange={(e) => setQuestionsSolved(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleStop} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Kaydediliyor...' : 'Seansı Kaydet'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionTracker;
