import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  isNativePlayBilling,
  loadSubscriptionPlans,
  MONTHLY_PLAN_ID,
  onPurchaseUpdated,
  purchaseSubscription,
  restoreSubscriptionPurchases,
  YEARLY_PLAN_ID
} from '../billing';
import { verifyBillingPurchase } from '../api';
import BrandLogo from './BrandLogo';

const fallbackPlans = [
  { basePlanId: MONTHLY_PLAN_ID, formattedPrice: '150 TL', billingPeriod: 'P1M', title: 'Aylık' },
  { basePlanId: YEARLY_PLAN_ID, formattedPrice: '1.500 TL', billingPeriod: 'P1Y', title: 'Yıllık', badge: '2 ay avantajlı' }
];

const SubscriptionPaywall = ({ onActivated }) => {
  const [plans, setPlans] = useState(fallbackPlans);
  const [busyPlan, setBusyPlan] = useState('');
  const [message, setMessage] = useState('');
  const native = isNativePlayBilling();

  const finishPurchase = async purchase => {
    if (!purchase?.purchaseToken || purchase.state !== 1) return;
    setMessage('Aboneliğiniz doğrulanıyor…');
    const status = await verifyBillingPurchase(purchase.purchaseToken);
    setMessage(status.message || 'Aboneliğiniz etkinleştirildi.');
    setBusyPlan('');
    onActivated(status);
  };

  useEffect(() => {
    if (!native) return undefined;
    let listener;
    loadSubscriptionPlans()
      .then(result => {
        const loaded = (result.plans || []).map(plan => ({
          ...plan,
          title: plan.basePlanId === YEARLY_PLAN_ID ? 'Yıllık' : 'Aylık',
          badge: plan.basePlanId === YEARLY_PLAN_ID ? '2 ay avantajlı' : ''
        }));
        if (loaded.length) setPlans(loaded);
      })
      .catch(error => setMessage(error.message || 'Paket bilgileri alınamadı.'));
    onPurchaseUpdated(purchase => finishPurchase(purchase).catch(error => {
      setBusyPlan('');
      setMessage(error.response?.data?.error || error.message || 'Abonelik doğrulanamadı.');
    })).then(handle => { listener = handle; });
    return () => listener?.remove();
  }, [native]);

  const buy = async basePlanId => {
    setBusyPlan(basePlanId);
    setMessage('Google Play ödeme ekranı açılıyor…');
    try {
      await purchaseSubscription(basePlanId, localStorage.getItem('studentUsername') || '');
    } catch (error) {
      setBusyPlan('');
      setMessage(error.message || 'Satın alma başlatılamadı.');
    }
  };

  const restore = async () => {
    setBusyPlan('restore');
    setMessage('Satın almalar kontrol ediliyor…');
    try {
      const result = await restoreSubscriptionPurchases();
      const active = (result.purchases || []).find(item => item.state === 1);
      if (!active) throw new Error('Bu Google Play hesabında aktif abonelik bulunamadı.');
      await finishPurchase(active);
    } catch (error) {
      setBusyPlan('');
      setMessage(error.response?.data?.error || error.message || 'Satın alma geri yüklenemedi.');
    }
  };

  return (
    <div className="fade-in" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px' }}>
      <section style={{ width: '100%', maxWidth: 720, padding: 28, borderRadius: 24, background: 'rgba(8, 18, 35, .96)', border: '1px solid rgba(34,211,238,.25)', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <BrandLogo size={54} iconSize={32} />
          <h1 style={{ margin: '16px 0 8px', fontSize: 28 }}>Merkür Yörünge Öğrenci Aboneliği</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Çalışmalarına ve kayıtlı verilerine kesintisiz erişmeye devam et.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {plans.map(plan => (
            <div key={plan.basePlanId} style={{ padding: 22, borderRadius: 18, border: plan.basePlanId === YEARLY_PLAN_ID ? '1px solid #22d3ee' : '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)' }}>
              {plan.badge && <span style={{ color: '#22d3ee', fontSize: 12, fontWeight: 700 }}>{plan.badge}</span>}
              <h2 style={{ margin: '8px 0' }}>{plan.title}</h2>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{plan.formattedPrice}</div>
              <div style={{ color: 'var(--color-text-muted)', margin: '4px 0 18px' }}>{plan.billingPeriod === 'P1Y' ? 'yılda bir' : 'ayda bir'}</div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!native || !!busyPlan} onClick={() => buy(plan.basePlanId)}>
                <CreditCard size={18} /> {busyPlan === plan.basePlanId ? 'İşleniyor…' : 'Google Play ile abone ol'}
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, display: 'grid', gap: 10, color: 'var(--color-text-muted)', fontSize: 14 }}>
          <span><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />Ödeme Google Play üzerinden güvenle alınır.</span>
          <span><CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />Hesabınız ve öğrenci verileriniz silinmez.</span>
        </div>
        {!native && <p style={{ color: '#fbbf24', textAlign: 'center' }}>Abonelik satın alma işlemi Android uygulamasından yapılabilir.</p>}
        {message && <p style={{ textAlign: 'center', color: '#bae6fd' }}>{message}</p>}
        {native && <button type="button" onClick={restore} disabled={!!busyPlan} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px auto 0', background: 'transparent', border: 0, color: '#67e8f9', cursor: 'pointer' }}><RefreshCw size={16} /> Satın almayı geri yükle</button>}
      </section>
    </div>
  );
};

export default SubscriptionPaywall;
