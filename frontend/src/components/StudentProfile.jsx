import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentLogs, getStudentGoal, setStudentGoal, getStudentInfo } from '../api';
import { Target, Bot, Sparkles, TrendingUp, Palette, CalendarDays, Clock, BookOpen, Hash, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const StudentProfile = ({ studentName }) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [goal, setGoal] = useState(0);
  const [inputGoal, setInputGoal] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [className, setClassName] = useState('');
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
            <div style={{ display: 'flex', gap: '16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={16} /> Hedef: {goal} Soru</span>
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
