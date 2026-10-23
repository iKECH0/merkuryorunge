import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getStudentLogs, getStudentGoal, setStudentGoal, getStudentInfo } from '../api';
import { Target, Bot, Sparkles, TrendingUp, Palette, CalendarDays, Clock, BookOpen, Hash, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { getTrackingDocument } from '../data/trackingDocuments';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const StudentProfile = ({ studentName }) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [goal, setGoal] = useState(0);
  const [inputGoal, setInputGoal] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [className, setClassName] = useState('');
  const [trackingDocumentKey, setTrackingDocumentKey] = useState('');
  const [trackingDocumentUrl, setTrackingDocumentUrl] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [bgTheme, setBgTheme] = useState(localStorage.getItem('profileBackground') || 'bg-default');

  useEffect(() => {
    fetchData();
    // Apply background theme to body or a wrapper if needed
    document.body.className = bgTheme;
  }, [studentName, bgTheme]);

  const handleThemeChange = (theme) => {
    setBgTheme(theme);
    localStorage.setItem('profileBackground', theme);
  };

  const fetchData = async () => {
    try {
      const logsData = await getStudentLogs(studentName);
      setLogs(logsData);
      const goalData = await getStudentGoal(studentName);
      setGoal(goalData.target_questions || 0);
      const infoData = await getStudentInfo(studentName);
      if (infoData && infoData.school_level) {
        setSchoolLevel(infoData.school_level);
      }
      if (infoData && infoData.class_name) {
        setClassName(infoData.class_name);
      }
      setTrackingDocumentKey(infoData?.tracking_document_key || '');
      setTrackingDocumentUrl(infoData?.tracking_document_url || '');
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

  // Process data for charts
  const processDailyData = () => {
    const dailyMap = {};
    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      dailyMap[date] = (dailyMap[date] || 0) + (log.questions_solved || 0);
    });
    return Object.keys(dailyMap).map(date => ({ date, soru: dailyMap[date] })).slice(-7); // Son 7 gün
  };

  const processSubjectData = () => {
    const subjectMap = {};
    logs.forEach(log => {
      if (log.questions_solved) {
        subjectMap[log.subject] = (subjectMap[log.subject] || 0) + log.questions_solved;
      }
    });
    return Object.keys(subjectMap).map(subject => ({ subject, soru: subjectMap[subject] })).sort((a,b) => b.soru - a.soru);
  };

  // Process full daily report: each day with its subjects and totals
  const processDailyReport = () => {
    const dayMap = {};
    logs.forEach(log => {
      const dateObj = new Date(log.created_at);
      const dateKey = dateObj.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
      const dateSort = dateObj.toISOString().split('T')[0];
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { dateKey, dateSort, subjects: {}, totalMinutes: 0, totalQuestions: 0 };
      }
      const subj = log.subject || 'Diğer';
      if (!dayMap[dateKey].subjects[subj]) {
        dayMap[dateKey].subjects[subj] = { minutes: 0, questions: 0 };
      }
      dayMap[dateKey].subjects[subj].minutes += log.duration_minutes || 0;
      dayMap[dateKey].subjects[subj].questions += log.questions_solved || 0;
      dayMap[dateKey].totalMinutes += log.duration_minutes || 0;
      dayMap[dateKey].totalQuestions += log.questions_solved || 0;
    });
    return Object.values(dayMap).sort((a, b) => b.dateSort.localeCompare(a.dateSort));
  };

  const dailyData = processDailyData();
  const subjectData = processSubjectData();
  const dailyReport = processDailyReport();
  const trackingDocument = trackingDocumentUrl
    ? { label: 'Kişisel Takip Dokümanım', url: trackingDocumentUrl }
    : getTrackingDocument(className, trackingDocumentKey);

  const generateAIInsight = async () => {
    setIsAiLoading(true);
    
    if (logs.length === 0) {
      setAiMessage(`Merhaba ${studentName}! Henüz sisteme girdiğin bir çalışma verisi yok. Bir çalışma seansı başlatıp derslerini kaydettikten sonra buraya tıklayarak detaylı performans analizini görebilirsin! 🚀`);
      setIsAiLoading(false);
      return;
    }

    try {
      const subjectsMap = {};
      let totalMinutes = 0;
      let totalQuestions = 0;
      const uniqueDays = new Set();

      logs.forEach(log => {
        const subj = log.subject || 'Diğer';
        if (!subjectsMap[subj]) {
          subjectsMap[subj] = { minutes: 0, questions: 0, sessions: 0 };
        }
        subjectsMap[subj].minutes += log.duration_minutes || 0;
        subjectsMap[subj].questions += log.questions_solved || 0;
        subjectsMap[subj].sessions += 1;

        totalMinutes += log.duration_minutes || 0;
        totalQuestions += log.questions_solved || 0;

        if (log.created_at) {
          try {
            uniqueDays.add(new Date(log.created_at).toISOString().split('T')[0]);
          } catch (e) {}
        }
      });

      const sortedSubjects = Object.entries(subjectsMap).sort((a, b) => b[1].minutes - a[1].minutes);
      const strongest = sortedSubjects[0] ? sortedSubjects[0][0] : 'Belirsiz';
      const weakest = sortedSubjects.length > 1 ? sortedSubjects[sortedSubjects.length - 1][0] : sortedSubjects[0]?.[0] || 'Belirsiz';
      
      const payload = {
        studentName,
        schoolLevel,
        className,
        goal,
        totalMinutes,
        totalHours: (totalMinutes / 60).toFixed(1),
        totalQuestions,
        totalSessions: logs.length,
        activeDaysCount: uniqueDays.size || 1,
        subjects: sortedSubjects.map(([name, data]) => ({
          subject: name,
          minutes: data.minutes,
          hours: (data.minutes / 60).toFixed(1),
          questions: data.questions,
          percent: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
          pace: data.questions > 0 ? (data.minutes / data.questions).toFixed(1) : 0
        })),
        strongest,
        weakest
      };

      const apiBaseUrl = API_BASE_URL;
      const res = await fetch(`${apiBaseUrl}/api/ai?action=analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (data.message) {
        setAiMessage(data.message);
      } else {
        setAiMessage(`📊 **${studentName} - Çalışma Özeti**\n\n• Toplam Süre: ${totalMinutes} dakika (${(totalMinutes/60).toFixed(1)} saat)\n• Toplam Soru: ${totalQuestions} soru\n• En Çok Odaklanılan Ders: ${strongest}\n• En Az Odaklanılan Ders: ${weakest}\n\nHarika bir çalışma disiplini sergiliyorsun, dengeli şekilde devam et! 🚀`);
      }
    } catch (err) {
      console.error("AI Insight Error:", err);
      setAiMessage(`Selam ${studentName}! Bağlantı sırasında ufak bir aksaklık oldu. Lütfen birkaç saniye sonra tekrar deneyin! 🚀`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="glass-card slide-up" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#fff', boxShadow: '0 8px 16px rgba(6, 182, 212, 0.3)' }}>
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '28px', margin: '0 0 8px 0', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {studentName} 
              <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--color-primary)" /> Merkür Yörünge Öğrencisi
              </span>
              {schoolLevel && (
                <span style={{ fontSize: '14px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: '100px', display: 'flex', alignItems: 'center', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                  {schoolLevel}
                </span>
              )}
              {className && (
                <span style={{ fontSize: '14px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 12px', borderRadius: '100px', display: 'flex', alignItems: 'center', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  {className}. Sınıf
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--color-text-muted)', fontSize: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={16} /> Hedef: {goal} Soru</span>
              {trackingDocument && <a
                href={trackingDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  color: '#10b981', textDecoration: 'none', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  padding: '4px 12px', borderRadius: '100px', 
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                📊 {trackingDocument.label}
              </a>}
            </div>
          </div>
        </div>
      </div>

      {/* Background Theme Selector */}
      <div className="glass-card slide-up text-center" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
          <Palette size={20} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: '16px' }}>Tema Seçimi</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {['bg-default', 'bg-dark', 'bg-blue', 'bg-purple'].map((theme, i) => (
            <div 
              key={theme} 
              onClick={() => handleThemeChange(theme)}
              style={{ 
                width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
                border: bgTheme === theme ? '3px solid var(--color-primary)' : '2px solid transparent',
                background: theme === 'bg-default' ? '#0f172a' : theme === 'bg-dark' ? '#000000' : theme === 'bg-blue' ? '#1e3a8a' : '#4c1d95',
                boxShadow: bgTheme === theme ? '0 0 10px var(--color-primary)' : 'none'
              }}
            />
          ))}
        </div>
      </div>

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
                <circle cx="60" cy="60" r={circleRadius} fill="transparent" stroke="var(--color-border)" strokeWidth="8" />
                <circle cx="60" cy="60" r={circleRadius} fill="transparent" stroke={progress >= 100 ? '#10b981' : 'var(--color-primary)'} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 1s ease-in-out', strokeLinecap: 'round' }} />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: progress >= 100 ? '#10b981' : 'var(--color-text-main)' }}>%{progress}</span>
              </div>
            </div>
            <p style={{ marginTop: '16px', fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{totalQuestions} / {goal} Soru</p>
            <button onClick={async () => {
              try {
                await setStudentGoal(studentName, 0);
                setGoal(0);
              } catch (err) {
                console.error(err);
              }
            }} style={{ marginTop: '16px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '14px' }}>Hedefi Sıfırla</button>
          </div>
        )}
      </div>

      {dailyData.length > 0 && (
        <div className="glass-card slide-up" style={{ marginBottom: '24px' }}>
          <h2 className="title" style={{ fontSize: '18px', marginBottom: '16px' }}>Günlük Soru Çözümü (Son 7 Gün)</h2>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="soru" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {subjectData.length > 0 && (
        <div className="glass-card slide-up" style={{ marginBottom: '24px' }}>
          <h2 className="title" style={{ fontSize: '18px', marginBottom: '16px' }}>Branşlara Göre Soru Dağılımı</h2>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subjectData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="soru">
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            {subjectData.map((entry, index) => (
              <div key={entry.subject} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.subject}: {entry.soru}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Günlük Kişisel Rapor */}
      {dailyReport.length > 0 && (
        <div className="glass-card slide-up" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ padding: '10px', background: 'rgba(6,182,212,0.1)', borderRadius: '12px', color: 'var(--color-primary)' }}>
              <CalendarDays size={22} />
            </div>
            <h2 className="title" style={{ margin: 0, fontSize: '18px' }}>Günlük Çalışma Raporu</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dailyReport.map((day, idx) => (
              <div key={idx} style={{ background: 'var(--color-bg-deep)', borderRadius: '14px', padding: '16px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-primary)', textTransform: 'capitalize' }}>{day.dateKey}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />{day.totalMinutes} dk
                    </span>
                    <span style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Hash size={13} />{day.totalQuestions} soru
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(day.subjects).map(([subject, data], sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[sIdx % COLORS.length], flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <BookOpen size={12} color="var(--color-text-muted)" />{subject}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{data.minutes} dk</span>
                      {data.questions > 0 && (
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>+{data.questions} soru</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card slide-up" style={{ animationDelay: '0.2s', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '16px', color: '#a855f7' }}>
              <TrendingUp size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text-main)' }}>Merkür Analiz</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>Çalışma verilerin ve performans karnen</p>
            </div>
          </div>
          {aiMessage && (
            <button
              onClick={generateAIInsight}
              disabled={isAiLoading}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              {isAiLoading ? 'Analiz Ediliyor...' : 'Yeniden Analiz Et'}
            </button>
          )}
        </div>

        {aiMessage ? (
          <div className="fade-in" style={{ padding: '20px', background: 'var(--color-bg-deep)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', lineHeight: '1.7', fontSize: '14.5px' }}>
            <ReactMarkdown>{aiMessage}</ReactMarkdown>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px' }}
            onClick={generateAIInsight}
            disabled={isAiLoading}
          >
            {isAiLoading ? 'Veriler Analiz Ediliyor...' : <><TrendingUp size={18} /> Verilerimi Analiz Et</>}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', marginBottom: '16px' }}>
        <button 
          onClick={() => navigate('/hesap-silme')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', 
            color: '#ef4444', padding: '10px 20px', borderRadius: '8px',
            fontSize: '14px', fontWeight: '500', cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={16} /> Hesabımı Sil
        </button>
      </div>
    </div>
  );
};

export default StudentProfile;
