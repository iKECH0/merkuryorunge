import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { registerStudent, loginStudent } from '../api';
import { User, ArrowRight, ArrowLeft, UserPlus, Key, Link as LinkIcon } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const StudentLogin = ({ onLogin }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialInvite = searchParams.get('invite') || '';

  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [schoolLevel, setSchoolLevel] = useState('Lise (YKS)');
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If there's an invite code in URL, default to register tab
  useEffect(() => {
    if (initialInvite) setIsRegistering(true);
  }, [initialInvite]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!fullName || !username || !password || !inviteCode) {
          setError('Tüm alanları doldurunuz.');
          setIsLoading(false);
          return;
        }
        const user = await registerStudent(fullName.trim(), username.trim().toLowerCase(), password, inviteCode.trim().toUpperCase(), schoolLevel, className.trim() || null);
        onLogin(user);
      } else {
        if (username.trim().length === 0 || password.length === 0) {
          setError('Kullanıcı adı ve şifre gereklidir.');
          setIsLoading(false);
          return;
        }

        const normalizedUsername = username.trim().toLowerCase();
        
        // Super Admin Intercept (Fallback)
        if (normalizedUsername === 'admin' && (password === 'merkur2026' || password === 'merkür2026')) {
          localStorage.setItem('superAdminAuth', 'true');
          window.location.href = '/super-admin';
          return;
        }

        const user = await loginStudent(normalizedUsername, password);
        onLogin(user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in flex-center" style={{ minHeight: '100vh', width: '100%', padding: '20px', background: 'radial-gradient(circle at top right, rgba(6, 182, 212, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.15), transparent 40%)' }}>
      
      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: '150px', height: '150px', background: 'var(--color-primary)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3, zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '150px', height: '150px', background: 'var(--color-accent)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3, zIndex: 0 }} />

      <div className="slide-up" style={{ width: '100%', maxWidth: '420px', padding: '40px 20px', position: 'relative', zIndex: 1 }}>
        
        {/* Toggle Tabs (Segmented Control) */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '14px', padding: '6px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', 
              background: !isRegistering ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: !isRegistering ? '#fff' : 'var(--color-text-muted)',
              boxShadow: !isRegistering ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s'
            }}
            onClick={() => { setIsRegistering(false); setError(''); }}
          >
            Giriş Yap
          </button>
          <button 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', 
              background: isRegistering ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: isRegistering ? '#fff' : 'var(--color-text-muted)',
              boxShadow: isRegistering ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s'
            }}
            onClick={() => { setIsRegistering(true); setError(''); }}
          >
            Kayıt Ol
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '18px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))', borderRadius: '24px', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: '20px', boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)' }}>
            <BrandLogo size={58} iconSize={36} />
          </div>
          <h2 className="title text-gradient" style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.5px' }}>Merkür Yörünge</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
            {isRegistering ? 'Hedefine ulaşmak için yörüngeye gir.' : 'Eğitim paneline erişmek için giriş yap.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRegistering && (
            <>
              <div className="input-group slide-up" style={{ animationDelay: '0.1s', position: 'relative' }}>
                <User size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Adınız Soyadınız"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '48px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', height: '54px' }}
                />
              </div>
              
              <div className="input-group slide-up" style={{ animationDelay: '0.12s', position: 'relative' }}>
                <select
                  className="input-field"
                  value={schoolLevel}
                  onChange={(e) => setSchoolLevel(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', height: '54px', padding: '0 16px', color: '#fff', width: '100%', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="İlkokul" style={{color: '#000'}}>İlkokul</option>
                  <option value="Ortaokul (LGS)" style={{color: '#000'}}>Ortaokul (LGS)</option>
                  <option value="Lise (YKS)" style={{color: '#000'}}>Lise (YKS)</option>
                </select>
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>▼</div>
              </div>

              <div className="input-group slide-up" style={{ animationDelay: '0.14s', position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="input-field"
                  placeholder="Sınıf numaranız (Örn: 9, 10) — İsteğe Bağlı"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', height: '54px', padding: '0 16px', color: '#fff', width: '100%' }}
                />
              </div>

              <div className="input-group slide-up" style={{ animationDelay: '0.15s', position: 'relative' }}>
                <LinkIcon size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Davet Kodu (Örn: AXB89)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ paddingLeft: '48px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', height: '54px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                />
              </div>
            </>
          )}

          <div className="input-group slide-up" style={{ animationDelay: '0.2s', position: 'relative' }}>
            <User size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: '48px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', height: '54px' }}
            />
          </div>

          <div className="input-group slide-up" style={{ animationDelay: '0.3s', position: 'relative' }}>
            <Key size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="password"
              className="input-field"
              placeholder="Erişim Şifresi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '48px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', height: '54px', letterSpacing: password ? '4px' : 'normal' }}
            />
          </div>

          {error && (
            <div className="shake" style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              height: '54px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', 
              marginTop: '12px', borderRadius: '14px', background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))',
              boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.4)', border: 'none', fontWeight: '600'
            }}
            disabled={isLoading}
          >
            {isLoading ? 'İşleniyor...' : (isRegistering ? <><UserPlus size={20} /> Kayıt Ol</> : <><ArrowRight size={20} /> Giriş Yap</>)}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <ArrowLeft size={16} /> Portal Seçimine Dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
