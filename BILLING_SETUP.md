# Merkür Yörünge Google Play abonelik kurulumu

Kod güvenli dağıtım için varsayılan olarak kapalıdır. Play Console ürünleri ve sunucu doğrulaması tamamlanmadan `BILLING_ENABLED=true` yapılmamalıdır.

## Play Console ürünleri

1. **Para kazanma > Ürünler > Abonelikler** bölümünde `merkur_yorunge_ogrenci` kimlikli ürünü oluşturun.
2. Ürün adı: **Merkür Yörünge Öğrenci Aboneliği**.
3. `aylik` temel planı: aylık otomatik yenileme, Türkiye fiyatı **150 TL**.
4. `yillik` temel planı: yıllık otomatik yenileme, Türkiye fiyatı **1.500 TL**.
5. Uygulama ilk 7 günü kendi sunucusunda ücretsiz verdiği için Play Console'da ayrıca ücretsiz deneme teklifi eklemeyin.

Fiyatın ve para biriminin ekranda görünen asıl değeri Google Play'den dinamik alınır.

## Google Play Developer API

1. Google Cloud projesinde **Google Play Android Developer API** hizmetini etkinleştirin.
2. Sadece bu uygulama için bir servis hesabı oluşturun.
3. Play Console **Kullanıcılar ve izinler** alanında servis hesabını davet edip abonelikleri doğrulamak ve siparişleri yönetmek için gereken en dar izinleri verin.
4. Anahtar değerlerini Vercel/backend ortam değişkenlerine ekleyin; anahtar dosyasını Git'e koymayın.

Gerekli backend ortam değişkenleri:

```text
BILLING_ENABLED=false
BILLING_TRIAL_DAYS=7
SESSION_SECRET=<en az 32 bayt rastgele sır>
GOOGLE_PLAY_PACKAGE_NAME=com.merkuryorunge.app
GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID=merkur_yorunge_ogrenci
GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID=aylik
GOOGLE_PLAY_YEARLY_BASE_PLAN_ID=yillik
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=<servis-hesabi@proje.iam.gserviceaccount.com>
GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY=<-----BEGIN PRIVATE KEY-----...>
```

## Yayına almadan önce

1. `versionCode 9` AAB dosyasını önce dahili test kanalına yükleyin.
2. Lisans test kullanıcılarını ekleyin ve aylık/yıllık paketleri gerçek Android cihazda test edin.
3. Yeni ve eski bir öğrenciyle ilk girişte 7 günlük sürenin başladığını doğrulayın.
4. Test satın almasını, geri yüklemeyi ve süresi dolmuş hesapta ödeme ekranını doğrulayın.
5. Testler geçtikten sonra backend'de `BILLING_ENABLED=true` yapın ve yeniden dağıtın.

Hesap ve öğrenci verileri abonelik bittiğinde silinmez; yalnız öğrenci paneli ödeme tamamlanana kadar kilitlenir.
