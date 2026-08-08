import React, { useState } from 'react';
import { submitLog } from '../api';
import { Send, User, BookOpen, Clock, PenTool, CheckCircle, X } from 'lucide-react';
const SUBJECTS = ['Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Edebiyat', 'Türk Dili ve Edebiyatı', 'Tarih', 'T.C. İnkılap Tarihi ve Atatürkçülük', 'İnkılap Tarihi', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Hayat Bilgisi', 'Beden Eğitimi ve Spor', 'Beden Eğitimi ve Oyun', 'Görsel Sanatlar', 'Müzik', 'Paragraf', 'Problemler', 'Kitap Okuma'];

const ManualLogForm = ({ onLogSubmitted, studentName }) => {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [duration, setDuration] = useState('');
  const [questionsSolved, setQuestionsSolved] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
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

        {showSuccess && (
          <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowSuccess(false)}>
            <div className="slide-up" style={{ background: 'var(--color-bg-deep)', border: '1px solid var(--color-success)', borderRadius: '24px', padding: '32px', maxWidth: '300px', width: '100%', textAlign: 'center', boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', color: '#22c55e', marginBottom: '20px' }}>
                <CheckCircle size={48} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#22c55e' }}>Başarılı!</h3>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-muted)' }}>
                Çalışmanız başarıyla kaydedildi.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ManualLogForm;
