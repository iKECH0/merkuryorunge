import React, { useState, useEffect } from 'react';
import { getStudentLogs, getStudentGoal, setStudentGoal } from '../api';
import { Target, Bot, Sparkles, TrendingUp } from 'lucide-react';

const StudentProfile = ({ studentName }) => {
  const [logs, setLogs] = useState([]);
  const [goal, setGoal] = useState(0);
  const [inputGoal, setInputGoal] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentName]);

  const fetchData = async () => {
    try {
      const logsData = await getStudentLogs(studentName);
      setLogs(logsData);
      const goalData = await getStudentGoal(studentName);
      setGoal(goalData.target_questions || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetGoal = async (e) => {
    e.preventDefault();
    if (inputGoal) {
      try {
        await setStudentGoal(studentName, parseInt(inputGoal));
        setGoal(parseInt(inputGoal));
        setInputGoal('');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const calculateProgress = () => {
    if (goal === 0) return 0;
    const totalQuestions = logs.reduce((sum, log) => sum + (log.questions_solved || 0), 0);
    return Math.min(100, Math.round((totalQuestions / goal) * 100));
  };

  const totalQuestions = logs.reduce((sum, log) => sum + (log.questions_solved || 0), 0);
  const progress = calculateProgress();
  const circleRadius = 45;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const generateAIInsight = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      if (logs.length === 0) {
        setAiMessage(`Merhaba ${studentName}! Henüz sisteme girdiğin bir çalışma verisi yok. Hemen bir seans başlatıp ilk adımını atabilirsin!`);
        setIsAiLoading(false);
        return;
      }

      const subjectCounts = {};
      logs.forEach(log => {
        subjectCounts[log.subject] = (subjectCounts[log.subject] || 0) + log.duration_minutes;
      });

      const sortedSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]);
      const strongest = sortedSubjects[0][0];
      const weakest = sortedSubjects[sortedSubjects.length - 1][0];

      if (sortedSubjects.length === 1) {
        setAiMessage(`Selam ${studentName}! Sadece ${strongest} çalışmışsın. Sınav maratonunda denge çok önemlidir, bugün biraz da farklı bir derse odaklanmaya ne dersin?`);
      } else {
        setAiMessage(`Merhaba ${studentName}! Verilerini analiz ettim. Son zamanlarda ${strongest} dersine harika bir şekilde odaklanmışsın ama ${weakest} dersini biraz ihmal etmiş gibisin. Bugün ${weakest} branşından 30 soru çözerek bu açığı kapatabilirsin. Güç seninle olsun! 🚀`);
      }
      setIsAiLoading(false);
    }, 1500);
  };

  return (
    <div className="fade-in">
      <div className="glass-card slide-up text-center" style={{ marginBottom: '24px' }}>
        <h2 className="title" style={{ fontSize: '22px', marginBottom: '8px' }}>Haftalık Hedef</h2>
        
        {goal === 0 ? (
          <form onSubmit={handleSetGoal} style={{ marginTop: '20px' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>Haftalık soru hedefini belirle ve ilerlemeni takip et.</p>
            <div className="input-group text-left" style={{ marginBottom: '16px' }}>
              <input 
                type="number" 
                className="input-field" 
                placeholder="Örn: 500" 
                value={inputGoal}
                onChange={(e) => setInputGoal(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Target size={18} /> Hedefi Belirle
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '24px' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                <circle 
                  cx="60" cy="60" r={circleRadius} 
                  fill="transparent" 
                  stroke="var(--color-border)" 
                  strokeWidth="8" 
                />
                <circle 
                  cx="60" cy="60" r={circleRadius} 
                  fill="transparent" 
                  stroke={progress >= 100 ? '#10b981' : 'var(--color-primary)'} 
                  strokeWidth="8" 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out', strokeLinecap: 'round' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: progress >= 100 ? '#10b981' : 'var(--color-text-main)' }}>%{progress}</span>
              </div>
            </div>
            <p style={{ marginTop: '16px', fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
              {totalQuestions} / {goal} Soru
            </p>
            {progress >= 100 && (
              <p style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                <Sparkles size={16} /> Hedefe Ulaşıldı!
              </p>
            )}
            <button 
              onClick={() => setGoal(0)}
              style={{ marginTop: '16px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '14px' }}
            >
              Hedefi Sıfırla
            </button>
          </div>
        )}
      </div>

      <div className="glass-card slide-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', color: '#a855f7' }}>
            <Bot size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text-main)' }}>Merkür AI</h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>Kişisel yapay zeka koçun</p>
          </div>
        </div>

        {aiMessage ? (
          <div className="fade-in" style={{ padding: '16px', background: 'var(--color-bg-deep)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', lineHeight: '1.6' }}>
            {aiMessage}
          </div>
        ) : (
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onClick={generateAIInsight}
            disabled={isAiLoading}
          >
            {isAiLoading ? 'Analiz Ediliyor...' : <><TrendingUp size={18} /> Gelişim Analizi İste</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
