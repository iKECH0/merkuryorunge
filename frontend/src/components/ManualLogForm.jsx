import React, { useState } from 'react';
import { submitLog } from '../api';
import { Send, User, BookOpen, Clock, PenTool } from 'lucide-react';
const SUBJECTS = ['Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Edebiyat', 'Tarih', 'İnkılap Tarihi', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'İngilizce'];

const ManualLogForm = ({ onLogSubmitted, studentName }) => {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [duration, setDuration] = useState('');
  const [questionsSolved, setQuestionsSolved] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentName || !duration) return;
    
    setLoading(true);
    try {
      await submitLog({
        studentName: studentName,
        subject: subject,
        duration: parseInt(duration),
        questionsSolved: parseInt(questionsSolved) || 0
      });
      setDuration('');
      setQuestionsSolved('');
      if (onLogSubmitted) onLogSubmitted();
    } catch (err) {
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card slide-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '8px', background: 'rgba(6,182,212,0.1)', borderRadius: '12px' }}>
          <PenTool size={24} color="var(--color-primary)" />
        </div>
        <h2 className="title" style={{ margin: 0, fontSize: '22px' }}>Hızlı Rapor Ekle</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Ders</label>
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

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Süre (Dk)</label>
            <div style={{ position: 'relative' }}>
              <Clock size={20} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="number" 
                className="input-field" 
                style={{ paddingLeft: '48px' }}
                placeholder="0"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Soru</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>#</span>
              <input 
                type="number" 
                className="input-field" 
                style={{ paddingLeft: '48px' }}
                placeholder="0"
                min="0"
                value={questionsSolved}
                onChange={(e) => setQuestionsSolved(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
          {loading ? 'Gönderiliyor...' : (
            <>
              Akademiye Raporla <Send size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ManualLogForm;
