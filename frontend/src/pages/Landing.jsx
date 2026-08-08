import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Presentation, Sparkles, ChevronRight } from 'lucide-react';

const TYPEWRITER_TEXTS = [
  "Yapay Zeka Destekli Akıllı Asistan",
  "Kişiselleştirilmiş Gelişim Takibi",
  "Yeni Nesil Eğitim Deneyimi",
  "Sınavlara Hazırlıkta Fark Yaratın"
];

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [textIndex, setTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // If user comes with an invite link, route them directly to student login
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      navigate(`/ogrenci?invite=${inviteCode}`);
      return;
    }

    // Auto-redirect if already logged in
    if (localStorage.getItem('superAdminAuth') === 'true') {
      navigate('/super-admin');
    } else if (localStorage.getItem('teacherId')) {
      navigate('/teacher');
    } else if (localStorage.getItem('studentName')) {
      navigate('/dashboard');
    }
  }, [navigate, searchParams]);

  // Typewriter Effect
  useEffect(() => {
    let timer;
    const currentFullText = TYPEWRITER_TEXTS[textIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setDisplayedText(prev => prev.slice(0, -1));
        if (displayedText.length === 0) {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % TYPEWRITER_TEXTS.length);
        }
      }, 50); // Delete speed
    } else {
      timer = setTimeout(() => {
        setDisplayedText(currentFullText.slice(0, displayedText.length + 1));
        if (displayedText.length === currentFullText.length) {
          setTimeout(() => setIsDeleting(true), 2000); // Pause before delete
        }
      }, 80); // Type speed
    }
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, textIndex]);

  // Generate stars only once on mount
  const stars = React.useMemo(() => {
    return [...Array(15)].map(() => ({
      width: Math.random() * 3 + 1 + 'px',
      height: Math.random() * 3 + 1 + 'px',
      left: Math.random() * 100 + '%',
      top: Math.random() * 100 + '%',
      opacity: Math.random() * 0.5 + 0.1,
      animationDelay: Math.random() * 5 + 's',
      animationDuration: Math.random() * 10 + 5 + 's',
      boxShadow: '0 0 8px rgba(255,255,255,0.8)'
    }));
  }, []);

  return (
    <div className="flex-center" style={{ minHeight: '100vh', width: '100%', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Dynamic Style block for scoped animations */}
      <style>{`
        @keyframes orbitPulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); transform: scale(1); }
          50% { box-shadow: 0 0 0 30px rgba(59, 130, 246, 0); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); transform: scale(1); }
        }
        @keyframes floatSpace {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(5deg); opacity: 0.8; }
          100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
        }
        .orbit-pulse {
          animation: orbitPulse 3s infinite cubic-bezier(0.66, 0, 0, 1);
        }
        .star-particle {
          position: absolute;
          background: #fff;
          border-radius: 50%;
          animation: floatSpace 8s infinite ease-in-out;
        }
        .metallic-text {
          background: linear-gradient(to right, #e2e8f0 0%, #94a3b8 20%, #38bdf8 50%, #e2e8f0 80%, #94a3b8 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shine 5s linear infinite;
        }
        @keyframes shine {
          to { background-position: 200% center; }
        }
        .blink-cursor {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>

      {/* Space Particles (Stars) */}
      {stars.map((style, i) => (
        <div key={i} className="star-particle" style={style} />
      ))}

      <div className="slide-up" style={{ width: '100%', maxWidth: '900px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        
        <div style={{ marginBottom: '48px' }}>
          <div className="orbit-pulse" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Sparkles size={40} color="#3b82f6" />
          </div>
          <h1 className="title metallic-text" style={{ fontSize: '46px', marginBottom: '16px', letterSpacing: '-1px', fontWeight: '800' }}>Merkür Yörünge</h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', maxWidth: '500px', margin: '0 auto' }}>Platforma giriş yapmak veya kayıt olmak için lütfen profilinizi seçin.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '450px', margin: '0 auto' }}>
          
          {/* Student Card */}
          <button 
            className="glass-card hover-glow slide-up" 
            style={{ animationDelay: '0.1s', display: 'flex', alignItems: 'center', padding: '20px', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(59, 130, 246, 0.25)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '24px', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
            onClick={() => navigate('/ogrenci')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ flexShrink: 0, padding: '16px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.3)', marginRight: '20px', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}>
              <GraduationCap size={32} color="#3b82f6" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '6px', marginTop: 0 }}>Öğrenci Portalı</h2>
              <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.4', fontSize: '14px' }}>
                Çalışmalarınızı kaydedin, hedeflerinizi takip edin.
              </p>
            </div>
            <div style={{ opacity: 0.5, paddingLeft: '12px' }}>
              <ChevronRight size={24} color="#fff" />
            </div>
          </button>

          {/* Teacher Card */}
          <button 
            className="glass-card hover-glow slide-up" 
            style={{ animationDelay: '0.2s', display: 'flex', alignItems: 'center', padding: '20px', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(16, 185, 129, 0.25)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '24px', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
            onClick={() => navigate('/ogretmen')}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ flexShrink: 0, padding: '16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)', marginRight: '20px', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
              <Presentation size={32} color="#10b981" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '6px', marginTop: 0 }}>Öğretmen Portalı</h2>
              <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.4', fontSize: '14px' }}>
                Öğrencilerinizi yönetin ve analiz raporları alın.
              </p>
            </div>
            <div style={{ opacity: 0.5, paddingLeft: '12px' }}>
              <ChevronRight size={24} color="#fff" />
            </div>
          </button>

        </div>

        {/* Typewriter Effect Footer */}
        <div style={{ marginTop: '60px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--color-primary)', fontSize: '15px', margin: 0, fontWeight: '500', letterSpacing: '0.5px' }}>
            {displayedText}<span className="blink-cursor" style={{ color: '#fff', fontWeight: 'bold' }}>|</span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Landing;
