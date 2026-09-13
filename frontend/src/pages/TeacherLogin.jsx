import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck, User } from 'lucide-react';

const TeacherLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && (password === 'merkur2026' || password === 'merkür2026')) {
      localStorage.setItem('teacherAuth', 'true');
      navigate('/teacher');
    } else {
      setError('Hatalı kullanıcı adı veya şifre. Lütfen tekrar deneyin.');
      setPassword('');
    }
  };

  return (
    <div className="fade-in flex-center" style={{ minHeight: '80vh', width: '100%', padding: '20px' }}>
      <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ position: 'absolute', top: '24px', left: '24px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
        >
          <ArrowLeft size={24} />
        </button>

        <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px' }}>
          <ShieldCheck size={40} color="#ef4444" />
        </div>
        
        <h2 className="title text-gradient" style={{ fontSize: '28px', marginBottom: '8px' }}>Profesyonel Öğretmen Girişi</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>Öğretmen paneline erişmek için bilgilerinizi girin.</p>

        <form onSubmit={handleLogin}>
          <div className="input-group text-left" style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} /> Kullanıcı Adı
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group text-left" style={{ textAlign: 'left', marginBottom: '24px' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} /> Erişim Şifresi
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Panele Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeacherLogin;
