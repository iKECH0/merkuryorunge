import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Presentation, Sparkles } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  return (
    <div className="flex-center" style={{ minHeight: '100vh', width: '100%', padding: '20px' }}>
      <div className="slide-up" style={{ width: '100%', maxWidth: '900px', textAlign: 'center' }}>
        
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <Sparkles size={40} color="#3b82f6" />
          </div>
          <h1 className="title" style={{ fontSize: '42px', marginBottom: '16px', textShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>Merkür Yörünge</h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', maxWidth: '500px', margin: '0 auto' }}>Platforma giriş yapmak veya kayıt olmak için lütfen profilinizi seçin.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          
          {/* Student Card */}
          <button 
            className="glass-card hover-glow" 
            style={{ padding: '48px 32px', cursor: 'pointer', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.2)', transition: 'all 0.3s ease', background: 'rgba(255, 255, 255, 0.03)' }}
            onClick={() => navigate('/ogrenci')}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <GraduationCap size={56} color="#3b82f6" />
              </div>
            </div>
            <h2 style={{ fontSize: '28px', color: '#fff', marginBottom: '16px' }}>Öğrenci Girişi</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.6', fontSize: '15px' }}>
              Öğretmeninizin davet koduyla sınıfa katılın, soru çözümlerinizi kaydedin ve gelişiminizi takip edin.
            </p>
          </button>

          {/* Teacher Card */}
          <button 
            className="glass-card hover-glow" 
            style={{ padding: '48px 32px', cursor: 'pointer', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)', transition: 'all 0.3s ease', background: 'rgba(255, 255, 255, 0.03)' }}
            onClick={() => navigate('/ogretmen')}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <Presentation size={56} color="#10b981" />
              </div>
            </div>
            <h2 style={{ fontSize: '28px', color: '#fff', marginBottom: '16px' }}>Öğretmen Girişi</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.6', fontSize: '15px' }}>
              Öğrenci sınıfınızı oluşturun, öğrencilerinizi davet edin ve detaylı analiz raporlarına ulaşın.
            </p>
          </button>

        </div>

      </div>
    </div>
  );
};

export default Landing;
