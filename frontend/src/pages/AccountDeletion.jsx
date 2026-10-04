import React, { useState } from 'react';
import { ArrowLeft, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccountDeletion() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const API_URL = import.meta.env.PROD
        ? "https://backend-kodivas-projects.vercel.app/api"
        : "http://localhost:5000/api";
        
      await fetch(`${API_URL}/deletion-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Talebiniz alınırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
        
        <button 
          onClick={() => navigate(-1)}
          className="btn"
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', padding: '0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} /> Geri Dön
        </button>

        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
          <Trash2 size={32} color="#ef4444" />
        </div>

        <h1 className="title" style={{ textAlign: 'center', marginBottom: '8px' }}>Hesap Silme Talebi</h1>
        
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
            <h2 style={{ fontSize: '20px', color: '#10b981', marginBottom: '12px' }}>Talebiniz Alındı</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>
              Hesap silme talebiniz başarıyla alınmıştır. İlgili hesap ve veriler 7 gün içerisinde sistemlerimizden tamamen silinecektir.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              Ana Sayfaya Dön
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: 'rgba(245, 158, 11, 0.9)', lineHeight: '1.5' }}>
                Hesabınızı sildiğinizde, ilerlemeleriniz, istatistikleriniz ve profilleriniz kalıcı olarak silinir ve bu işlem geri alınamaz.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Ad Soyad veya Kullanıcı Adı</label>
                <input 
                  type="text" 
                  required
                  className="input-field"
                  placeholder="Adınızı giriniz"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">E-posta Adresi (İsteğe Bağlı)</label>
                <input 
                  type="email" 
                  className="input-field"
                  placeholder="E-posta adresiniz"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Silme Nedeni (İsteğe Bağlı)</label>
                <textarea 
                  className="input-field"
                  style={{ height: '100px', resize: 'none' }}
                  placeholder="Hesabınızı neden silmek istediğinizi kısaca belirtebilirsiniz."
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', marginTop: '8px', background: '#ef4444', border: 'none', fontSize: '16px', fontWeight: '600' }}
              >
                Kalıcı Olarak Silmeyi Talep Et
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
