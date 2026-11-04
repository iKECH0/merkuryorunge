import React from 'react';
import { Link } from 'react-router-dom';

const sections = [
  ['Hizmet', 'Merkür Yörünge; öğrenci gelişimi, konu takibi, çalışma kayıtları, öğretmen yönetimi ve eğitim danışmanlığı araçları sunar. İçerik ve öneriler eğitim amaçlıdır; sınav başarısı veya belirli bir sonuç garantisi vermez.'],
  ['Hesap ve erişim', 'Hesabınızı doğru bilgilerle kullanmanız, giriş bilgilerinizi korumanız ve başkalarıyla paylaşmamanız gerekir. Öğrenci ve öğretmen hesapları ilgili yetkilerle kullanılır. Yetkisiz erişim veya kötüye kullanım halinde erişim sınırlandırılabilir.'],
  ['Abonelik ve ödeme', 'Ücretli öğrenci özellikleri için sunulan planın fiyatı, para birimi, yenileme dönemi ve varsa deneme koşulları satın alma öncesinde Google Play ekranında gösterilir. Ödeme ve otomatik yenileme Google Play tarafından yürütülür. Aboneliğinizi Google Play hesabınızın abonelikler bölümünden yönetebilir veya iptal edebilirsiniz. İptal, mevcut ücretli dönemin sonuna kadar erişimin sürmesini engellemez; iade talepleri Google Play kurallarına göre değerlendirilir.'],
  ['Ücretsiz özellikler ve danışmanlık', 'Eğitim danışmanlığı ön başvuru formu ücretsizdir; form göndermek abonelik veya ödeme oluşturmaz. Başvuru bilgileri sizinle iletişime geçmek için kullanılır.'],
  ['İçerik ve kullanım kuralları', 'Uygulamayı hukuka uygun kullanın. Başkalarının hesaplarına erişmeye, sistemi bozmaya, otomatik yollarla aşırı istek göndermeye veya uygulama içeriğini izinsiz çoğaltıp dağıtmaya çalışmayın. Kendi girdiğiniz verilerin doğruluğundan siz sorumlusunuz.'],
  ['Veriler ve gizlilik', 'Kişisel verilerin işlenmesi, saklanması ve silinmesine ilişkin bilgiler Gizlilik Politikası sayfasında açıklanır. Hesap silme talebini ilgili sayfadan iletebilirsiniz.'],
  ['Değişiklikler ve erişilebilirlik', 'Hizmeti geliştirmek için özellikleri ve bu şartları güncelleyebiliriz. Önemli değişiklikleri uygun kanallardan duyururuz. Bakım, güvenlik veya teknik aksaklıklar nedeniyle hizmete erişim geçici olarak kesilebilir.'],
  ['İletişim', 'Hizmet, hesap veya abonelikle ilgili sorularınız için ufukcelebi0137@gmail.com adresine yazabilirsiniz.']
];

export default function TermsOfService() {
  return <main style={{ minHeight: '100vh', background: 'linear-gradient(145deg,#062b39,#070d1d 55%)', color: '#effaff', padding: 'clamp(24px,5vw,72px) 20px' }}>
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Link to="/" style={{ color: '#70e6ef', textDecoration: 'none', fontWeight: 700 }}>← Merkür Yörünge ana sayfası</Link>
      <header style={{ margin: '45px 0 32px' }}>
        <p style={{ color: '#69dce9', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', fontSize: 12 }}>Yasal bilgiler</p>
        <h1 style={{ fontSize: 'clamp(36px,6vw,62px)', lineHeight: 1.1, margin: '10px 0 16px' }}>Hizmet Şartları</h1>
        <p style={{ color: '#b8ccda', fontSize: 17, lineHeight: 1.7, maxWidth: 720 }}>Merkür Yörünge’yi kullanırken hesabınız, aboneliğiniz ve verilerinizle ilgili temel koşullar.</p>
        <p style={{ color: '#8ea8bb', fontSize: 13 }}>Son güncelleme: 4 Kasım 2026</p>
      </header>
      <div style={{ display: 'grid', gap: 16 }}>
        {sections.map(([title, body], index) => <section key={title} style={{ padding: 'clamp(20px,3vw,30px)', border: '1px solid rgba(109,203,224,.2)', borderRadius: 20, background: 'rgba(14,28,45,.85)' }}>
          <h2 style={{ fontSize: 20, margin: '0 0 12px' }}><span style={{ color: '#5bdbe9', marginRight: 12 }}>{String(index + 1).padStart(2, '0')}</span>{title}</h2>
          <p style={{ color: '#c0d0dc', lineHeight: 1.75, margin: 0 }}>{body}</p>
        </section>)}
      </div>
      <footer style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 22 }}>
        <Link to="/gizlilikpolitikasi" style={{ color: '#70e6ef' }}>Gizlilik Politikası</Link>
        <Link to="/hesap-silme" style={{ color: '#70e6ef' }}>Hesap silme</Link>
      </footer>
    </div>
  </main>;
}
