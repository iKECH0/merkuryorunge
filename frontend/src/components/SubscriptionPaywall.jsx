import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CreditCard, ExternalLink, RefreshCw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { isNativePlayBilling, loadSubscriptionPlans, MONTHLY_PLAN_ID, onPurchaseUpdated, purchaseSubscription, restoreSubscriptionPurchases, YEARLY_PLAN_ID } from '../billing';
import { verifyBillingPurchase } from '../api';
import BrandLogo from './BrandLogo';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.merkuryorunge.app';
const APP_URL = `intent://subscription/#Intent;scheme=merkuryorunge;package=com.merkuryorunge.app;S.browser_fallback_url=${encodeURIComponent(STORE_URL)};end`;
const androidBrowser = !isNativePlayBilling() && /Android/i.test(navigator.userAgent);

const SubscriptionPaywall = ({ onActivated }) => {
  const native = isNativePlayBilling();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(native);
  const [planError, setPlanError] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    setPlanError('');
    try {
      const result = await loadSubscriptionPlans();
      const loaded = (result.plans || []).filter(plan => [MONTHLY_PLAN_ID, YEARLY_PLAN_ID].includes(plan.basePlanId));
      if (!loaded.length) throw new Error('Google Play abonelik paketleri alınamadı.');
      setPlans(loaded);
    } catch (error) {
      setPlans([]);
      setPlanError(error.message || 'Paket bilgileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const finishPurchase = async purchase => {
    if (!purchase?.purchaseToken || purchase.state !== 1) return;
    setMessage('Aboneliğiniz doğrulanıyor…');
    const status = await verifyBillingPurchase(purchase.purchaseToken);
    setMessage(status.message || 'Aboneliğiniz etkinleştirildi.');
    setBusy('');
    onActivated(status);
  };

  useEffect(() => {
    if (!native) return undefined;
    let listener;
    let disposed = false;
    onPurchaseUpdated(purchase => finishPurchase(purchase).catch(error => {
      setBusy('');
      setMessage(error.response?.data?.error || error.message || 'Abonelik doğrulanamadı.');
    })).then(handle => {
      if (disposed) handle.remove();
      else listener = handle;
    }).catch(error => setPlanError(error.message || 'Google Play bağlantısı kurulamadı.'));
    fetchPlans();
    return () => { disposed = true; listener?.remove(); };
  }, [native]);

  const buy = async basePlanId => {
    setBusy(basePlanId);
    setMessage('Google Play ödeme ekranı açılıyor…');
    try {
      await purchaseSubscription(basePlanId, localStorage.getItem('studentUsername') || '');
      setBusy('');
      setMessage('Google Play ekranındaki işlemi tamamlayın. Ödeme onaylanınca aboneliğiniz burada doğrulanır.');
    } catch (error) {
      setBusy('');
      setMessage(error.message || 'Satın alma başlatılamadı.');
    }
  };

  const restore = async () => {
    setBusy('restore');
    setMessage('Satın almalar kontrol ediliyor…');
    try {
      const result = await restoreSubscriptionPurchases();
      const active = (result.purchases || []).find(item => item.state === 1);
      if (!active) throw new Error('Bu Google Play hesabında aktif abonelik bulunamadı.');
      await finishPurchase(active);
    } catch (error) {
      setBusy('');
      setMessage(error.response?.data?.error || error.message || 'Satın alma geri yüklenemedi.');
    }
  };

  const visiblePlans = native ? plans : [
    { basePlanId: MONTHLY_PLAN_ID, billingPeriod: 'P1M' },
    { basePlanId: YEARLY_PLAN_ID, billingPeriod: 'P1Y' }
  ];

  return (
    <div className="fade-in" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '30px 16px', background: 'radial-gradient(circle at 50% 0%, rgba(14,165,233,.18), transparent 42%), #050b18' }}>
      <section style={{ width: '100%', maxWidth: 760, padding: 'clamp(22px, 5vw, 40px)', borderRadius: 28, background: 'linear-gradient(145deg, #111f34, #0b1222 75%)', border: '1px solid rgba(103,232,249,.22)', boxShadow: '0 30px 90px rgba(0,0,0,.4)', color: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 25 }}><BrandLogo size={52} iconSize={30} /><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', color: '#67e8f9' }}>MERKÜR YÖRÜNGE</span></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 99, padding: '7px 12px', background: 'rgba(34,211,238,.11)', color: '#67e8f9', fontSize: 12, fontWeight: 800 }}><Sparkles size={14} /> ÖĞRENCİ ABONELİĞİ</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 38px)', lineHeight: 1.15, margin: '16px 0 10px' }}>Öğrenme yolculuğuna devam et</h1>
        <p style={{ color: '#a8b8ce', fontSize: 16, lineHeight: 1.6, margin: '0 0 25px' }}>Çalışmaların ve kayıtlı verilerin güvende. Sana uygun planı seçerek erişimini sürdür.</p>

        {!native && <div style={{ border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.09)', borderRadius: 18, padding: '17px 19px', marginBottom: 20 }}>
          <strong style={{ display: 'flex', gap: 9, alignItems: 'center', color: '#fde68a' }}><Smartphone size={19} /> Abonelik yalnızca Android uygulamasından alınabilir</strong>
          <p style={{ color: '#cbd5e1', margin: '9px 0 0', lineHeight: 1.55 }}>Google Play ödeme ekranı uygulamanın içinde açılır. Web sitesinden ödeme alınmaz.</p>
        </div>}

        {loading && <p style={{ color: '#a8b8ce' }}>Google Play paketleri yükleniyor…</p>}
        {planError && <div role="alert" style={{ color: '#fecaca', marginBottom: 16 }}>{planError} <button type="button" onClick={fetchPlans} style={{ border: 0, background: 'none', color: '#67e8f9', cursor: 'pointer', fontWeight: 700 }}>Tekrar dene</button></div>}
        {visiblePlans.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {visiblePlans.map(plan => <div key={plan.basePlanId} style={{ padding: 22, borderRadius: 19, border: plan.basePlanId === YEARLY_PLAN_ID ? '1px solid #22d3ee' : '1px solid rgba(255,255,255,.14)', background: plan.basePlanId === YEARLY_PLAN_ID ? 'linear-gradient(160deg, rgba(8,145,178,.15), rgba(255,255,255,.03))' : 'rgba(255,255,255,.04)' }}>
            {plan.basePlanId === YEARLY_PLAN_ID && <span style={{ color: '#67e8f9', fontSize: 12, fontWeight: 800 }}>YILLIK PLAN</span>}
            <h2 style={{ margin: '7px 0', fontSize: 23 }}>{plan.basePlanId === YEARLY_PLAN_ID ? 'Yıllık' : 'Aylık'}</h2>
            <div style={{ fontSize: native ? 30 : 18, fontWeight: 800, margin: '9px 0 3px' }}>{native ? plan.formattedPrice : 'Fiyatı uygulamada gör'}</div>
            <div style={{ color: '#a8b8ce', fontSize: 13, marginBottom: 18 }}>{plan.billingPeriod === 'P1Y' ? 'Yılda bir yenilenir' : 'Ayda bir yenilenir'}</div>
            {native && <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!!busy} onClick={() => buy(plan.basePlanId)}><CreditCard size={17} /> {busy === plan.basePlanId ? 'İşleniyor…' : 'Google Play ile abone ol'}</button>}
          </div>)}
        </div>}

        {!native && <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
          {androidBrowser && <a className="btn btn-primary" href={APP_URL} style={{ display: 'flex', justifyContent: 'center', gap: 9, textDecoration: 'none', padding: 15 }}><Smartphone size={18} /> Uygulamayı aç <ArrowRight size={17} /></a>}
          <a className="btn" href={STORE_URL} style={{ display: 'flex', justifyContent: 'center', gap: 9, textDecoration: 'none', padding: 14, color: '#e2e8f0', border: '1px solid rgba(255,255,255,.2)' }}><ExternalLink size={17} /> Google Play sayfasına git</a>
        </div>}

        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: '10px 22px', color: '#a8b8ce', fontSize: 13 }}>
          <span><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: '#67e8f9' }} />Ödeme Google Play üzerinden</span>
          <span><CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: '#67e8f9' }} />Öğrenci verilerin korunur</span>
        </div>
        {message && <p role="status" style={{ textAlign: 'center', color: '#bae6fd', marginTop: 18 }}>{message}</p>}
        {native && <button type="button" onClick={restore} disabled={!!busy} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px auto 0', background: 'transparent', border: 0, color: '#67e8f9', cursor: 'pointer', fontWeight: 700 }}><RefreshCw size={16} /> Satın almayı geri yükle</button>}
      </section>
    </div>
  );
};

export default SubscriptionPaywall;
