import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import ManualLogForm from '../components/ManualLogForm';
import SessionTracker from '../components/SessionTracker';
import Leaderboard from '../components/Leaderboard';
import StudentProfile from '../components/StudentProfile';
import Onboarding from '../components/Onboarding';
import MerkurAIChat from '../components/MerkurAIChat';
import TopicTracker from '../components/TopicTracker';
import { Rocket, Clock, Trophy, Sparkles, Lock, User, LogOut, BotMessageSquare, BookOpen } from 'lucide-react';
import { getStudentInfo, getStudentLogs, getStudentGoal } from '../api';

const StudentDashboard = ({ studentName }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [studentClassName, setStudentClassName] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const navigate = useNavigate();
  
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

  // 10:30 & 22:30 Local Notifications
  useEffect(() => {
    const setupNotifications = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          let permStatus = await LocalNotifications.checkPermissions();
          if (permStatus.display !== 'granted') {
            permStatus = await LocalNotifications.requestPermissions();
          }
          
          if (permStatus.display === 'granted') {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
              await LocalNotifications.cancel(pending);
            }
            
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: "Merkür Yörünge Hatırlatması",
                  body: "Saat 10:30! Günün planını ve ilk raporlarını girmeyi unutma!",
                  id: 1,
                  schedule: { on: { hour: 10, minute: 30 }, allowWhileIdle: true },
                },
                {
                  title: "Merkür Yörünge Hatırlatması",
                  body: "Saat 22:30! Günün raporunu girdin mi? Hadi hemen kaydet!",
                  id: 2,
                  schedule: { on: { hour: 22, minute: 30 }, allowWhileIdle: true },
                }
              ]
            });
          }
        } catch (e) {
          console.error("Bildirim hatası:", e);
        }
      } else {
        // Web için basit bildirim
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
      }
    };

    setupNotifications();
  }, []);

  const sendTestNotification = async () => {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Test Bildirimi",
            body: "Bu bir test bildirimidir. Bildirim sistemi sorunsuz çalışıyor!",
            id: 99,
            schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
          }
        ]
      });
      alert("Test bildirimi 5 saniye sonra çalacak. Lütfen uygulamayı arka plana alın veya ekranı kilitleyin.");
    } else {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Test Bildirimi", { body: "Bu bir web test bildirimidir." });
      } else {
        alert("Web bildirimleri aktif değil veya cihaz desteklemiyor.");
      }
    }
  };

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
          <Sparkles size={32} color="var(--color-primary)" />
        </div>
        <h1 className="title text-gradient" style={{ fontSize: '40px', marginBottom: '8px', lineHeight: 1.1 }}>Merkür Yörünge</h1>
        <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)', marginBottom: '12px' }}>Merhaba, {studentName} 🚀</p>
        
        {studentUsername?.toUpperCase() === 'TESTER' && (
          <button 
            onClick={sendTestNotification}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', margin: '0 auto', display: 'flex' }}
          >
            Test Bildirimi Gönder (5sn)
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', animationDelay: '0.2s', width: '100%' }} className="slide-up">
        <div style={{ width: '100%', maxWidth: '540px' }}>
          {activeTab === 'profile' && <StudentProfile studentName={studentName} />}
          {activeTab === 'manual' && <ManualLogForm studentName={studentName} />}
          {activeTab === 'tracker' && <SessionTracker studentName={studentName} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
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
