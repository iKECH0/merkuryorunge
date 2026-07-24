import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerTeacher, loginTeacher } from '../api';
import { Sparkles, ArrowLeft, Briefcase, Lock, User, PlusCircle, LogIn, ArrowRight } from 'lucide-react';

const TeacherAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (!isLogin) {
        if (!fullName || !username || !password) {
          setError('Tüm alanları doldurunuz.');
          setIsLoading(false);
          return;
        }
        const user = await registerTeacher(fullName.trim(), username.trim().toLowerCase(), password);
        setError('');
        // Kayıt sonrası otomatik login yapılmıyor, çünkü onay gerekiyor
        setFullName('');
        setUsername('');
        setPassword('');
        setIsLogin(true); // Giriş sekmesine at
        setSuccessMsg('Kayıt başarılı! Hesabınız 1 gün içerisinde Lider Öğretmen tarafından onaylanacaktır.');
      } else {
        if (!username || !password) {
          setError('Kullanıcı adı ve şifre gereklidir.');
          setIsLoading(false);
          return;
        }
        
        // Super Admin Intercept
        if (username === 'admin' && (password === 'merkur2026' || password === 'merkür2026')) {
           localStorage.setItem('superAdminAuth', 'true');
           window.location.href = '/super-admin';
           return;
        }

        const user = await loginTeacher(username.trim().toLowerCase(), password);
        localStorage.setItem('teacherId', user.id);
        localStorage.setItem('teacherName', user.full_name);
        localStorage.setItem('teacherInviteCode', user.invite_code);
        navigate('/teacher');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in flex-center" style={{ minHeight: '100vh', width: '100%', padding: '20px' }}>
      <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
        
        <button 
          onClick={() => navigate('/')} 
          style={{ position: 'absolute', top: '24px', left: '24px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          title="Geri Dön"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="text-center" style={{ marginBottom: '32px', paddingTop: '16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(6,182,212,0.2)', marginBottom: '16px' }}>
            <Briefcase size={32} color="var(--color-primary)" />
          </div>
          <h1 className="title text-gradient" style={{ fontSize: '32px', marginBottom: '8px' }}>Öğretmen Portalı</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Öğrencilerinizi yönetin ve raporlayın.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '16px' }}>
          <button 
            className={`btn ${isLogin ? 'btn-primary' : ''}`} 
            style={{ flex: 1, padding: '12px', background: isLogin ? '' : 'transparent', border: 'none', color: isLogin ? '#fff' : 'var(--color-text-muted)', borderRadius: '12px' }}
            onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
            type="button"
          >
            Giriş Yap
          </button>
          <button 
            className={`btn ${!isLogin ? 'btn-primary' : ''}`} 
            style={{ flex: 1, padding: '12px', background: !isLogin ? '' : 'transparent', border: 'none', color: !isLogin ? '#fff' : 'var(--color-text-muted)', borderRadius: '12px' }}
            onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
            type="button"
          >
            Hesap Oluştur
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} /> Adınız Soyadınız
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Örn: Ahmet Yılmaz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} /> Kullanıcı Adı
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Örn: ahmethoca"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} /> Şifre
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

          {successMsg && (
            <div className="slide-up" style={{ color: '#10b981', fontSize: '14px', textAlign: 'center', background: 'rgba(16,185,129,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={16} /> <strong>Başarılı!</strong>
              </div>
              {successMsg}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            disabled={isLoading}
          >
            {isLoading ? 'İşleniyor...' : (isLogin ? <><LogIn size={20} /> Panele Gir</> : <><PlusCircle size={20} /> Kayıt Ol</>)}
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

export default TeacherAuth;
