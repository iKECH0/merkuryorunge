import React, { useState, useEffect } from 'react';
import ManualLogForm from '../components/ManualLogForm';
import SessionTracker from '../components/SessionTracker';
import Leaderboard from '../components/Leaderboard';
import StudentProfile from '../components/StudentProfile';
import Onboarding from '../components/Onboarding';
import MerkurAIChat from '../components/MerkurAIChat';
import TopicTracker from '../components/TopicTracker';
import { Rocket, Clock, Trophy, User, LogOut, BotMessageSquare, BookOpen } from 'lucide-react';
import { getStudentInfo, getStudentLogs, getStudentGoal } from '../api';
import BrandLogo from '../components/BrandLogo';

const StudentDashboard = ({ studentName }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [studentClassName, setStudentClassName] = useState(null);
  const [studentData, setStudentData] = useState(null);
  
  // Track studentUsername so we can key the onboarding to the user
  const studentUsername = localStorage.getItem('studentUsername');

  useEffect(() => {
    getStudentInfo(studentName).then(info => {
      if (info && info.class_name) setStudentClassName(info.class_name);
    }).catch(() => {});
  }, [studentName]);

  useEffect(() => {
    if (studentUsername) {
      const hasSeen = localStorage.getItem(`hasSeenOnboarding_${studentUsername}`);
      if (!hasSeen) {
        setShowOnboarding(true);
      }
    }
  }, [studentUsername]);

  // Load student data for AI personalization
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const [logs, info, goal] = await Promise.allSettled([
          getStudentLogs(studentName),
          getStudentInfo(studentName),
          getStudentGoal(studentName)
        ]);

        const rawLogs = logs.status === 'fulfilled' ? (logs.value || []) : [];
        const infoData = info.status === 'fulfilled' ? info.value : null;
        const goalData = goal.status === 'fulfilled' ? goal.value : null;

        // Only consider last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentLogs = rawLogs.filter(log => new Date(log.created_at) >= sevenDaysAgo);

        const subjects = {};
        let totalMinutes = 0;
        let totalQuestions = 0;
        recentLogs.forEach(log => {
          const s = log.subject || 'Diğer';
          if (!subjects[s]) subjects[s] = { minutes: 0, questions: 0 };
          subjects[s].minutes += (log.duration_minutes || 0);
          subjects[s].questions += (log.questions_solved || 0);
          totalMinutes += (log.duration_minutes || 0);
          totalQuestions += (log.questions_solved || 0);
        });

        setStudentData({
          subjects,
          totalMinutes,
          totalQuestions,
          totalSessions: recentLogs.length,
          activeDaysCount: new Set(recentLogs.map(log => new Date(log.created_at).toISOString().split('T')[0])).size,
          schoolLevel: infoData?.school_level || null,
          className: infoData?.class_name || null,
          goal: goalData?.target_questions || null
        });
      } catch (e) {
        console.warn("Student data load failed:", e);
      }
    };
    loadStudentData();
  }, [studentName]);

  const handleOnboardingComplete = () => {
    if (studentUsername) {
      localStorage.setItem(`hasSeenOnboarding_${studentUsername}`, 'true');
    }
    setShowOnboarding(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('studentName');
    localStorage.removeItem('studentUsername');
    window.location.reload();
  };

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      
      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="fade-in"
        style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' }}
        title="Güvenli Çıkış"
      >
        <LogOut size={14} /> Çıkış Yap
      </button>

      <div className="text-center" style={{ marginBottom: '40px', marginTop: '20px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))', border: '1px solid rgba(6,182,212,0.3)', marginBottom: '16px' }}>
          <BrandLogo size={52} iconSize={32} />
        </div>
        <h1 className="title text-gradient" style={{ fontSize: '40px', marginBottom: '8px', lineHeight: 1.1 }}>Merkür Yörünge</h1>
        <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)', marginBottom: '12px' }}>Merhaba, {studentName} 🚀</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', animationDelay: '0.2s', width: '100%' }} className="slide-up">
        <div style={{ width: '100%', maxWidth: '540px' }}>
          {activeTab === 'profile' && <StudentProfile studentName={studentName} />}
          {activeTab === 'manual' && <ManualLogForm studentName={studentName} />}
          {activeTab === 'tracker' && <SessionTracker studentName={studentName} />}
          {activeTab === 'leaderboard' && <Leaderboard studentUsername={studentUsername} />}
          {activeTab === 'topics' && <TopicTracker studentName={studentName} studentClass={studentClassName} />}
          {activeTab === 'ai' && <MerkurAIChat studentName={studentName} studentData={studentData} />}
        </div>
      </div>

      {/* Student Specific Bottom Nav */}
      <nav className="bottom-nav slide-up" style={{ animationDelay: '0.4s' }}>
        <button 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          style={{ background: activeTab === 'profile' ? 'var(--color-primary)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <User size={20} />
          <span>Profilim</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
          style={{ background: activeTab === 'manual' ? 'var(--color-primary)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Rocket size={20} />
          <span>Hızlı Rapor</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracker')}
          style={{ background: activeTab === 'tracker' ? 'var(--color-primary)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Clock size={20} />
          <span>Canlı Seans</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
          style={{ background: activeTab === 'leaderboard' ? 'var(--color-primary)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Trophy size={20} />
          <span>Sıralama</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
          style={{ background: activeTab === 'topics' ? 'var(--color-primary)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <BookOpen size={20} />
          <span>Konular</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
          style={{ background: activeTab === 'ai' ? 'var(--color-primary)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <BotMessageSquare size={20} />
          <span>Merkür AI</span>
        </button>
      </nav>
    </div>
  );
};

export default StudentDashboard;
