import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { registerStudent, loginStudent } from '../api';
import { Sparkles, User, ArrowRight, UserPlus, Key, Link as LinkIcon, LogIn } from 'lucide-react';

const StudentLogin = ({ onLogin }) => {
  const [searchParams] = useSearchParams();
  const initialInvite = searchParams.get('invite') || '';

  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInvite);
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
        const user = await registerStudent(fullName.trim(), username.trim().toLowerCase(), password, inviteCode.trim().toUpperCase());
        onLogin(user.full_name, user.username);
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
        onLogin(user.full_name, user.username);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in flex-center" style={{ minHeight: '80vh', width: '100%', padding: '20px' }}>
      <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', position: 'relative' }}>
        
        {/* Toggle Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
          <button 
            style={{ 
              flex: 1, padding: '12px', background: 'transparent', border: 'none', 
              color: !isRegistering ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: !isRegistering ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer', fontWeight: 'bold'
            }}
            onClick={() => { setIsRegistering(false); setError(''); }}
          >
            Giriş Yap
          </button>
          <button 
            style={{ 
              flex: 1, padding: '12px', background: 'transparent', border: 'none', 
              color: isRegistering ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: isRegistering ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer', fontWeight: 'bold'
            }}
            onClick={() => { setIsRegistering(true); setError(''); }}
          >
            Kayıt Ol
          </button>
        </div>

        <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '20px', border: '1px solid rgba(6, 182, 212, 0.2)', marginBottom: '24px' }}>
          <Sparkles size={40} color="var(--color-primary)" />
        </div>
        
        <h2 className="title text-gradient" style={{ fontSize: '28px', marginBottom: '8px' }}>Merkür Yörünge</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>
          {isRegistering ? 'Yeni bir hesap oluştur ve yörüngeye gir.' : 'Öğrenci paneline erişmek için giriş yap.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRegistering && (
            <>
              <div className="input-group slide-up" style={{ animationDelay: '0.1s' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} /> Adınız Soyadınız
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Örn: Ali Yılmaz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              
              <div className="input-group slide-up" style={{ animationDelay: '0.15s' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LinkIcon size={16} /> Öğretmen Davet Kodu
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Örn: AXB89"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>Öğretmeninizden aldığınız 6 haneli kodu girin.</p>
              </div>
            </>
          )}

          <div className="input-group slide-up" style={{ animationDelay: '0.2s' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} /> Kullanıcı Adı
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Örn: aliyilmaz"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-group slide-up" style={{ animationDelay: '0.3s' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} /> Şifre
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="shake" style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '8px' }}
            disabled={isLoading}
          >
            {isLoading ? 'İşleniyor...' : (isRegistering ? <><UserPlus size={20} /> Kayıt Ol</> : <><ArrowRight size={20} /> Giriş Yap</>)}
          </button>
        </form>

        {/* Geri Dön Linki */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a 
            href="/" 
            className="text-primary hover-glow" 
            style={{ textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Portal Seçimine Geri Dön
          </a>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
