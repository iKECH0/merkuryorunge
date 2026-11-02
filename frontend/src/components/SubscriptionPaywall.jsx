import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CreditCard, ExternalLink, RefreshCw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { isNativePlayBilling, loadSubscriptionPlans, MONTHLY_PLAN_ID, onPurchaseUpdated, purchaseSubscription, restoreSubscriptionPurchases, YEARLY_PLAN_ID } from '../billing';
import { verifyBillingPurchase } from '../api';
import BrandLogo from './BrandLogo';
import './SubscriptionPaywall.css';

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

  const goHome = () => {
    ['studentName', 'studentUsername', 'studentId', 'studentBillingToken', 'studentBillingStatus'].forEach(key => localStorage.removeItem(key));
    window.location.assign('/');
  };

  return (
    <div className="subscription-page fade-in">
      <main className="subscription-shell">
        <header className="subscription-header">
          <div className="subscription-brand"><BrandLogo size={44} iconSize={25} /><span>Merkür Yörünge</span></div>
          <button type="button" className="subscription-home" onClick={goHome}><ArrowLeft size={17} /> Ana sayfaya dön</button>
        </header>

        <div className="subscription-hero">
          <span className="subscription-eyebrow"><Sparkles size={15} /> ÖĞRENCİ ABONELİĞİ</span>
          <h1>Hedeflerine kaldığın yerden devam et.</h1>
          <p>Çalışmaların ve ilerlemen hesabında saklı. Sana uygun planı seçerek erişimini sürdürebilirsin.</p>
        </div>

        <div className="subscription-benefits" aria-label="Abonelik özellikleri">
          <span><Check size={16} /> Kişisel gelişim takibi</span>
          <span><Check size={16} /> Ders ve konu ilerlemesi</span>
          <span><Check size={16} /> Merkür AI erişimi</span>
        </div>

        {!native && <div className="subscription-notice"><Smartphone size={22} /><div><strong>Aboneliği Android uygulamasından başlat</strong><p>Ödeme Google Play içinde tamamlanır. Paket fiyatını uygulamada, kendi bölgenin para biriminde görebilirsin.</p></div></div>}

        {loading && <p className="subscription-feedback">Google Play paketleri yükleniyor…</p>}
        {planError && <div role="alert" className="subscription-error">{planError} <button type="button" onClick={fetchPlans}>Tekrar dene</button></div>}

        {visiblePlans.length > 0 && <div className="subscription-plans">
          {visiblePlans.map(plan => {
            const annual = plan.basePlanId === YEARLY_PLAN_ID;
            return <article key={plan.basePlanId} className={`subscription-plan${annual ? ' subscription-plan-featured' : ''}`}>
              <div className="subscription-plan-top"><span className="subscription-plan-label">{annual ? 'Yıllık plan' : 'Aylık plan'}</span>{annual && <span className="subscription-plan-badge">UZUN DÖNEM</span>}</div>
              <div className="subscription-price">{native ? (plan.formattedPrice || 'Fiyat yükleniyor') : 'Fiyatı uygulamada gör'}</div>
              <p className="subscription-period">{annual ? 'Yılda bir' : 'Ayda bir'} otomatik yenilenir.</p>
              {native && <button type="button" className="subscription-buy" disabled={!!busy || !plan.formattedPrice} onClick={() => buy(plan.basePlanId)}><CreditCard size={18} /> {busy === plan.basePlanId ? 'İşleniyor…' : 'Google Play ile abone ol'} <ArrowRight size={18} /></button>}
            </article>;
          })}
        </div>}

        {!native && <div className="subscription-links">
          {androidBrowser && <a className="subscription-buy" href={APP_URL}><Smartphone size={18} /> Uygulamayı aç <ArrowRight size={18} /></a>}
          <a className="subscription-store" href={STORE_URL}><ExternalLink size={17} /> Google Play sayfasına git</a>
        </div>}

        {message && <p role="status" className="subscription-feedback">{message}</p>}
        <footer className="subscription-footer"><span><ShieldCheck size={17} /> Ödemeler Google Play tarafından işlenir.</span>{native && <button type="button" onClick={restore} disabled={!!busy}><RefreshCw size={16} /> Satın almayı geri yükle</button>}</footer>
        <p className="subscription-home-note">Ana sayfaya dönmek, bu cihazdaki öğrenci oturumunu kapatır.</p>
      </main>
    </div>
  );
};

export default SubscriptionPaywall;
