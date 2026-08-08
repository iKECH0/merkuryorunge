import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in" style={{ width: '100%', minHeight: '100vh', padding: '20px' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
        
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary" 
          style={{ marginBottom: '24px', background: 'transparent', border: '1px solid var(--color-border)', padding: '8px 16px', fontSize: '14px' }}
        >
          <ArrowLeft size={16} /> Geri Dön
        </button>

        <div className="glass-card slide-up" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '16px', color: 'var(--color-primary)' }}>
              <Shield size={32} />
            </div>
            <h1 className="title text-gradient" style={{ margin: 0, fontSize: '28px' }}>Gizlilik Politikası ve Veri Silme</h1>
          </div>

          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '32px' }}>
            <strong>Son Güncelleme:</strong> 27.07.2026
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--color-text-main)', lineHeight: 1.6 }}>
            
            <section>
              <h3 style={{ color: 'var(--color-primary-light)', fontSize: '18px', marginBottom: '8px' }}>1. Hangi Verileri Topluyoruz?</h3>
              <p>Merkür Yörünge uygulamasını kullanabilmeniz için ad, soyad ve sisteme giriş yapabilmeniz adına size tanımlanan kullanıcı adı (veya e-posta) ile şifre bilgileriniz toplanır. Ayrıca uygulama içi gelişim takibiniz için çözdüğünüz soru sayıları ve çalışma süreleriniz sunucularımızda tutulur.</p>
            </section>

            <section>
              <h3 style={{ color: 'var(--color-primary-light)', fontSize: '18px', marginBottom: '8px' }}>2. Verileri Nasıl Kullanıyoruz?</h3>
              <p>Toplanan veriler yalnızca öğretmenlerinizin akademik gelişiminizi takip edebilmesi, analiz raporları oluşturulması ve eğitim planlamalarınızın yapılması amacıyla kullanılır. Verileriniz hiçbir şekilde üçüncü şahıs veya kurumlarla reklam/pazarlama amacıyla paylaşılmaz.</p>
            </section>

            <section>
              <h3 style={{ color: 'var(--color-primary-light)', fontSize: '18px', marginBottom: '8px' }}>3. Veri Güvenliği</h3>
              <p>Bilgileriniz güvenli sunucularda veri tabanı şifreleme yöntemleriyle (HTTPS/SSL) saklanmaktadır.</p>
            </section>

            <section>
              <h3 style={{ color: 'var(--color-primary-light)', fontSize: '18px', marginBottom: '8px' }}>4. Hesap ve Veri Silme Talebi (Data Deletion)</h3>
              <p>Google Play kuralları gereği, kullanıcılarımızın tüm verilerinin silinmesini talep etme hakkı vardır. Hesabınızın ve size ait tüm çalışma verilerinin kalıcı olarak silinmesini istiyorsanız, sistemdeki Öğretmeninizle iletişime geçebilir veya <strong>merkurakademiiletisim@gmail.com</strong> adresine "Hesap Silme Talebi" başlıklı bir e-posta gönderebilirsiniz. Talebiniz 7 iş günü içerisinde işleme alınarak size ait tüm kayıtlar sistemden tamamen silinecektir.</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
