import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, CreditCard, ExternalLink, RefreshCw, ShieldCheck, Smartphone, Sparkles, Stars } from 'lucide-react';
import { isNativePlayBilling, loadSubscriptionPlans, MONTHLY_PLAN_ID, onPurchaseError, onPurchaseUpdated, purchaseSubscription, restoreSubscriptionPurchases, YEARLY_PLAN_ID } from '../billing';
import { verifyBillingPurchase } from '../api';
import BrandLogo from './BrandLogo';
import './SubscriptionPaywall.css';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.merkuryorunge.app';
const MANAGE_URL = 'https://play.google.com/store/account/subscriptions?sku=merkur_yorunge_ogrenci&package=com.merkuryorunge.app';
const APP_URL = `intent://subscription/#Intent;scheme=merkuryorunge;package=com.merkuryorunge.app;S.browser_fallback_url=${encodeURIComponent(STORE_URL)};end`;
const androidBrowser = !isNativePlayBilling() && /Android/i.test(navigator.userAgent);

const SubscriptionPaywall = ({ onActivated }) => {
  const native = isNativePlayBilling();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(native);
  const [planError, setPlanError] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [retryable, setRetryable] = useState(false);

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
    let errorListener;
    let disposed = false;
    onPurchaseUpdated(purchase => finishPurchase(purchase).catch(error => {
      setBusy('');
      setMessage(error.response?.data?.error || error.message || 'Abonelik doğrulanamadı.');
    })).then(handle => {
      if (disposed) handle.remove();
      else listener = handle;
    }).catch(error => setPlanError(error.message || 'Google Play bağlantısı kurulamadı.'));
    onPurchaseError(error => {
      setBusy('');
      if (error.code === 'USER_CANCELED') { setMessage(''); return; }
      if (error.code === 'ITEM_ALREADY_OWNED') { restoreSubscriptionPurchases().then(result => (result.purchases || []).filter(item => item.state === 1).forEach(item => finishPurchase(item))).catch(() => {}); return; }
      setRetryable(['SERVICE_UNAVAILABLE', 'NETWORK_ERROR'].includes(error.code));
      setMessage(error.message || 'Ödeme tamamlanamadı.');
    }).then(handle => { if (disposed) handle.remove(); else errorListener = handle; });
    fetchPlans();
    restoreSubscriptionPurchases().then(result => {
      (result.purchases || []).filter(item => item.state === 1).forEach(item => {
        finishPurchase(item).catch(error => setMessage(error.response?.data?.error || error.message || 'Abonelik doğrulanamadı.'));
      });
    }).catch(() => {});
    return () => { disposed = true; listener?.remove(); errorListener?.remove(); };
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
      if (error.code === 'USER_CANCELED') { setMessage(''); return; }
      if (error.code === 'ITEM_ALREADY_OWNED') { await restore(); return; }
      setRetryable(['SERVICE_UNAVAILABLE', 'NETWORK_ERROR'].includes(error.code));
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
          <button type="button" className="subscription-home" onClick={goHome} aria-label="Ana sayfaya dön">
            <ArrowLeft size={18} /><span className="subscription-home-label">Ana sayfaya dön</span>
          </button>
        </header>

        <section className="subscription-hero">
          <span className="subscription-eyebrow"><Sparkles size={16} /> Öğrenci aboneliği</span>
          <h1>Öğrenme yolculuğuna devam et<span>.</span></h1>
          <p>İlerlemen güvende. Sana uygun planı seç, kaldığın yerden devam et.</p>
        </section>

        <ul className="subscription-benefits" aria-label="Abonelik özellikleri">
          <li><Check size={16} /> Kişisel gelişim takibi</li>
          <li><Check size={16} /> Ders ve konu ilerlemesi</li>
          <li><Check size={16} /> Merkür AI erişimi</li>
        </ul>

        {!native && (
          <div className="subscription-notice">
            <span className="subscription-notice-icon"><Smartphone size={22} /></span>
            <div>
              <strong>Aboneliğini uygulamada başlat</strong>
              <p>Ödemeyi Google Play üzerinden güvenle tamamlayabilirsin. Fiyatı uygulamada kendi para biriminde görürsün.</p>
            </div>
          </div>
        )}

        {loading && <p className="subscription-feedback">Google Play paketleri yükleniyor…</p>}
        {planError && <div role="alert" className="subscription-error">{planError} <button type="button" onClick={fetchPlans}>Tekrar dene</button></div>}

        {visiblePlans.length > 0 && (
          <div className="subscription-plans">
            {visiblePlans.map(plan => {
              const annual = plan.basePlanId === YEARLY_PLAN_ID;
              return (
                <article key={plan.basePlanId} className={`subscription-plan${annual ? ' subscription-plan-featured' : ''}`}>
                  <div className="subscription-plan-top">
                    <span className="subscription-plan-icon">{annual ? <Stars size={19} /> : <CalendarDays size={19} />}</span>
                    <span className="subscription-plan-label">{annual ? 'Yıllık' : 'Aylık'} plan</span>
                    {annual && <span className="subscription-plan-badge">Uzun dönem</span>}
                  </div>
                  <div className={`subscription-price${native ? '' : ' subscription-price-muted'}`}>
                    {native ? (plan.formattedPrice || 'Fiyat yükleniyor') : 'Fiyat uygulamada gösterilir'}
                  </div>
                  <p className="subscription-period">{annual ? 'Yılda bir' : 'Ayda bir'}, iptal edilene kadar otomatik yenilenir. Dilediğinde iptal edebilirsin.</p>
                  {native && (
                    <button type="button" className="subscription-buy" disabled={!!busy || !plan.formattedPrice} onClick={() => buy(plan.basePlanId)}>
                      <CreditCard size={18} /> <span>{busy === plan.basePlanId ? 'İşleniyor…' : 'Google Play ile devam et'}</span>
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!native && (
          <div className="subscription-links">
            {androidBrowser && <a className="subscription-buy" href={APP_URL}><Smartphone size={18} /> <span>Uygulamayı aç</span></a>}
            <a className={androidBrowser ? 'subscription-store' : 'subscription-buy'} href={STORE_URL}>
              <ExternalLink size={18} /> <span>Google Play sayfasına git</span>
            </a>
          </div>
        )}

        {message && <p role="status" className="subscription-feedback">{message}</p>}
        {retryable && <button type="button" className="subscription-store" onClick={fetchPlans}>Tekrar dene</button>}

        <footer className="subscription-footer">
          <span><ShieldCheck size={18} /> Ödemeler Google Play tarafından işlenir.</span>
          {native && <button type="button" onClick={restore} disabled={!!busy}><RefreshCw size={16} /> Satın almayı geri yükle</button>}
          <a href={MANAGE_URL} target="_blank" rel="noreferrer">Aboneliği yönet</a>
          <a href="/hizmet-sartlari">Kullanım Şartları</a>
          <a href="/gizlilikpolitikasi">Gizlilik Politikası</a>
        </footer>
        <p className="subscription-home-note">Ana sayfaya dönmek, bu cihazdaki öğrenci oturumunu kapatır.</p>
      </main>
    </div>
  );
};

export default SubscriptionPaywall;
