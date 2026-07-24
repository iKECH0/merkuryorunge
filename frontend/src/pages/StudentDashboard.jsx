import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualLogForm from '../components/ManualLogForm';
import SessionTracker from '../components/SessionTracker';
import Leaderboard from '../components/Leaderboard';
import StudentProfile from '../components/StudentProfile';
import Onboarding from '../components/Onboarding';
import { Rocket, Clock, Trophy, Sparkles, Lock, User, LogOut } from 'lucide-react';

const StudentDashboard = ({ studentName }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  
  // Track studentUsername so we can key the onboarding to the user
  const studentUsername = localStorage.getItem('studentUsername');

  useEffect(() => {
    if (studentUsername) {
      const hasSeen = localStorage.getItem(`hasSeenOnboarding_${studentUsername}`);
      if (!hasSeen) {
        setShowOnboarding(true);
      }
    }
  }, [studentUsername]);

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
        <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)' }}>Merhaba, {studentName} 🚀</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', animationDelay: '0.2s', width: '100%' }} className="slide-up">
        <div style={{ width: '100%', maxWidth: '540px' }}>
          {activeTab === 'manual' && <ManualLogForm onLogSubmitted={() => setActiveTab('leaderboard')} studentName={studentName} />}
          {activeTab === 'tracker' && <SessionTracker onSessionEnded={() => setActiveTab('leaderboard')} studentName={studentName} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'profile' && <StudentProfile studentName={studentName} />}
        </div>
      </div>

      {/* Student Specific Bottom Nav */}
      <nav className="bottom-nav slide-up" style={{ animationDelay: '0.4s' }}>
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
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          style={{ background: activeTab === 'profile' ? 'var(--color-primary)' : 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <User size={20} />
          <span>Profilim</span>
        </button>
      </nav>
    </div>
  );
};

export default StudentDashboard;
