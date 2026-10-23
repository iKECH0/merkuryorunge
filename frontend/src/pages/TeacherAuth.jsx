import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerTeacher, loginTeacher, loginAdmin } from '../api';
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
        setSuccessMsg('Kayıt başarılı! Hesabınız 1 gün içerisinde Profesyonel Öğretmen tarafından onaylanacaktır.');
      } else {
        if (!username || !password) {
          setError('Kullanıcı adı ve şifre gereklidir.');
          setIsLoading(false);
          return;
        }
        
        // Super Admin Intercept
        if (username.trim().toLowerCase() === 'admin') {
           const adminSession = await loginAdmin(username.trim().toLowerCase(), password);
           localStorage.removeItem('teacherAuth');
           localStorage.removeItem('teacherId');
           localStorage.removeItem('teacherName');
           localStorage.setItem('superAdminToken', adminSession.token);
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
    <div className="fade-in flex-center" style={{ minHeight: '100vh', width: '100%', padding: '20px', background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.15), transparent 40%)' }}>
      
      {/* Decorative Blur Orbs */}
      <div style={{ position: 'absolute', top: '10%', right: '20%', width: '150px', height: '150px', background: '#10b981', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.2, zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '150px', height: '150px', background: '#3b82f6', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.2, zIndex: 0 }} />

      <div className="slide-up" style={{ width: '100%', maxWidth: '420px', padding: '40px 20px', position: 'relative', zIndex: 1 }}>
        
        {/* Toggle Tabs (Segmented Control) */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '14px', padding: '6px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', 
              background: isLogin ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: isLogin ? '#fff' : 'var(--color-text-muted)',
              boxShadow: isLogin ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s'
            }}
            onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
          >
            Giriş Yap
          </button>
          <button 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', 
              background: !isLogin ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: !isLogin ? '#fff' : 'var(--color-text-muted)',
              boxShadow: !isLogin ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.3s'
            }}
            onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
          >
            Kayıt Ol
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '18px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '20px', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}>
            <Briefcase size={36} color="#10b981" />
          </div>
          <h2 className="title text-gradient" style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.5px' }}>Öğretmen Portalı</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>{isLogin ? 'Giriş yapın veya yeni öğretmen hesabı oluşturun.' : 'Hesabınız admin onayından sonra aktifleşir.'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
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
            <Lock size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
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
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} /> {error}
            </div>
          )}
          {successMsg && (
            <div className="slide-up" style={{ color: '#10b981', fontSize: '13px', textAlign: 'center', background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
              {successMsg}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              height: '54px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', 
              marginTop: '12px', borderRadius: '14px', background: 'linear-gradient(to right, #10b981, #059669)',
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)', border: 'none', fontWeight: '600'
            }}
            disabled={isLoading}
          >
            {isLoading ? 'İşleniyor...' : (isLogin ? <><LogIn size={20} /> Giriş Yap</> : <><PlusCircle size={20} /> Kayıt Ol</>)}
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

export default TeacherAuth;
