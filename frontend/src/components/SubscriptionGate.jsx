import React, { useEffect, useState } from 'react';
import { getBillingStatus } from '../api';
import SubscriptionPaywall from './SubscriptionPaywall';

const SubscriptionGate = ({ children }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    const token = localStorage.getItem('studentBillingToken');
    if (!token) {
      setError('Oturumunuz yenilenmeli. Çıkış yapıp tekrar giriş yapın.');
      setLoading(false);
      return;
    }
    try {
      const next = await getBillingStatus();
      localStorage.setItem('studentBillingStatus', JSON.stringify(next));
      setStatus(next);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Abonelik durumu kontrol edilemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Hesabınız kontrol ediliyor…</div>;
  if (error || !status) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }} role="alert">
      <div>
        <p>{error || 'Abonelik durumu kontrol edilemedi. Sayfayı yenileyin.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Tekrar dene</button>
        <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={() => {
          ['studentName', 'studentUsername', 'studentId', 'studentBillingToken', 'studentBillingStatus'].forEach(key => localStorage.removeItem(key));
          window.location.assign('/ogrenci');
        }}>Yeniden giriş yap</button>
      </div>
    </div>
  );
  if (status.enabled && !status.access) return <SubscriptionPaywall onActivated={next => setStatus(next)} />;

  const trialDate = status?.reason === 'trial' && status.trialEndsAt
    ? new Date(status.trialEndsAt).toLocaleDateString('tr-TR')
    : null;
  return (
    <>
      {trialDate && <div style={{ position: 'sticky', top: 0, zIndex: 1000, padding: '8px 14px', textAlign: 'center', background: '#164e63', color: '#ecfeff', fontSize: 13 }}>{status?.trialDays || 3} günlük deneme erişiminiz {trialDate} tarihine kadar aktif.</div>}
      {children}
    </>
  );
};

export default SubscriptionGate;
