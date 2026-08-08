// Türkiye Müfredatı — İlkokul (1-4), Ortaokul (5-8), Lise (9-12, TYT, AYT)
let idCounter = 1;
const t = (grade, subject, topics) =>
  topics.map((topic_name, i) => ({ id: idCounter++, grade, subject, topic_name, sort_order: i + 1 }));

export const CURRICULUM = [
  // === ILKOKUL ===
  ...t("1","Türkçe",["Dinleme/İzleme ve Konuşma","Okuma ve Anlama","Yazma","Söz Varlığı ve Dil Bilgisi","Görsel Okuma ve Yorumlama"]),
  ...t("1","Matematik",["Sayılar ve Nicelikler","İşlemlerden Cebirsel Düşünmeye","Geometrik Şekiller","Nesnelerin Geometrisi","Veriye Dayalı Araştırma"]),
  ...t("1","Hayat Bilgisi",["Ben ve Okulum","Sağlığım ve Güvenliğim","Ailem ve Evim","Yaşadığım Yer ve Ülkem","Doğa ve Çevre","Bilim, Teknoloji ve Toplum"]),
  ...t("1","İngilizce",["School Life","My Family and Me","My Daily Life","My Home","My Town","Nature and Animals"]),
  ...t("1","Müzik",["Müziksel Algı ve Bilinç","Dinleme-Söyleme","Müzik Kültürü","Müziksel Yaratıcılık"]),
  ...t("1","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanatın Dili","Görsel Sanatlarda Uygulamalar"]),
  ...t("1","Beden Eğitimi ve Oyun",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Oyun ve Fiziksel Etkinlikler"]),

  ...t("2","Türkçe",["Dinleme/İzleme ve Konuşma","Okuma ve Anlama","Yazma","Söz Varlığı ve Dil Bilgisi","Metin Türleri ve Görsel Okuma"]),
  ...t("2","Matematik",["Sayılar ve Nicelikler","İşlemler","Ölçme","Geometrik Şekiller ve Örüntüler","Veri ve Olasılık Sezgisi"]),
  ...t("2","Hayat Bilgisi",["Ben ve Okulum","Sağlıklı Hayat","Ailem ve Evim","Yaşadığım Yer","Ülkem ve Kültürümüz","Doğa ve Çevre"]),
  ...t("2","İngilizce",["Classroom Life","Family","Daily Routines","Homes","Places","Weather and Nature"]),
  ...t("2","Müzik",["Müziksel Algı ve Bilinç","Dinleme-Söyleme","Müzik Kültürü","Müziksel Yaratıcılık"]),
  ...t("2","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanatın Dili","Görsel Sanatlarda Uygulamalar"]),
  ...t("2","Beden Eğitimi ve Oyun",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Oyun ve Fiziksel Etkinlikler"]),

  ...t("3","Türkçe",["Dinleme/İzleme","Konuşma","Okuma","Yazma","Dil Bilgisi ve Söz Varlığı"]),
  ...t("3","Matematik",["Sayılar","İşlemler","Kesirler","Geometri","Ölçme","Veri"]),
  ...t("3","Fen Bilimleri",["Dünya ve Evren","Kuvvet ve Hareket","Canlılar ve Yaşam","Madde ve Doğası","Fiziksel Olaylar","Çevre ve Bilim"]),
  ...t("3","Hayat Bilgisi",["Okulumuzda Hayat","Evimizde Hayat","Sağlıklı Hayat","Güvenli Hayat","Ülkemizde Hayat","Doğada Hayat"]),
  ...t("3","Müzik",["Müziksel Algı ve Bilinç","Dinleme-Söyleme","Müzik Kültürü","Müziksel Yaratıcılık"]),
  ...t("3","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanatın Dili","Görsel Sanatlarda Uygulamalar"]),
  ...t("3","Beden Eğitimi ve Oyun",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Oyun ve Fiziksel Etkinlikler"]),

  ...t("4","Türkçe",["Okuma ve Anlama","Dinleme/İzleme","Konuşma","Yazma","Dil Bilgisi ve Söz Varlığı"]),
  ...t("4","Matematik",["Sayılar ve İşlemler","Kesirler","Geometri","Ölçme","Veri"]),
  ...t("4","Fen Bilimleri",["Yer Kabuğu ve Dünya'mız","Besinlerimiz","Kuvvetin Etkileri","Maddenin Özellikleri","Aydınlatma ve Ses Teknolojileri","İnsan ve Çevre"]),
  ...t("4","Sosyal Bilgiler",["Birey ve Toplum","Kültür ve Miras","İnsanlar, Yerler ve Çevreler","Bilim, Teknoloji ve Toplum","Üretim, Dağıtım ve Tüketim","Etkin Vatandaşlık","Küresel Bağlantılar"]),
  ...t("4","Müzik",["Müziksel Algı ve Bilinç","Dinleme-Söyleme","Müzik Kültürü","Müziksel Yaratıcılık"]),
  ...t("4","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanatın Dili","Görsel Sanatlarda Uygulamalar"]),
  ...t("4","Beden Eğitimi ve Oyun",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Oyun ve Fiziksel Etkinlikler"]),

  // === ORTAOKUL ===
  ...t("5","Türkçe",["Söz Varlığı","Metinlerin Anlamı ve Yapısı","Okuma ve Anlama","Yazma","Konuşma ve Dinleme"]),
  ...t("5","Matematik",["Sayılar ve Nicelikler","İşlemlerle Cebirsel Düşünme","Geometrik Nicelikler","Geometrik Şekiller","Veriye Dayalı Araştırma","İstatistiksel Araştırma"]),
  ...t("5","Fen Bilimleri",["Dünya, Güneş ve Ay","Kuvvet ve Kuvvetin Ölçülmesi","Canlıların Dünyası","Işık ve Madde","Maddenin Doğası","Elektrik Devreleri"]),
  ...t("5","Sosyal Bilgiler",["Birlikte Yaşamak","Evimiz Dünya","Ortak Mirasımız","Yaşayan Demokrasimiz","Hayatımızdaki Ekonomi","Teknoloji ve Sosyal Bilimler"]),
  ...t("5","Din Kültürü ve Ahlak Bilgisi",["Allah İnancı ve İnsan","Ramazan ve Oruç","Ahlaki Davranışlar","Hz. Muhammed ve Örnekliği","Kur'an-ı Kerim ve Anlamı"]),
  ...t("5","İngilizce",["School Life","Classroom and Learning","My Daily Routine","Family and Friends","Health","Nature and Environment"]),
  ...t("5","Beden Eğitimi ve Spor",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Spor Kültürü"]),
  ...t("5","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanat Eleştirisi"]),
  ...t("5","Müzik",["Dinleme-Söyleme","Müziksel Algı ve Bilinç","Müzik Kültürü","Müziksel Yaratıcılık"]),

  ...t("6","Türkçe",["Söz Varlığı","Metin ve Anlam","Okuma","Yazma","Konuşma ve Dinleme"]),
  ...t("6","Matematik",["Sayılar ve Nicelikler","İşlemlerle Cebirsel Düşünme","Oran","Geometrik Nicelikler","Veri ve Olasılık"]),
  ...t("6","Fen Bilimleri",["Güneş Sistemi ve Tutulmalar","Vücudumuzdaki Sistemler","Kuvvet ve Hareket","Madde ve Isı","Ses ve Özellikleri","Elektriğin İletimi"]),
  ...t("6","Sosyal Bilgiler",["Birlikte Yaşamak","Evimiz Dünya","Ortak Mirasımız","Yaşayan Demokrasimiz","Hayatımızdaki Ekonomi","Teknoloji ve Sosyal Bilimler"]),
  ...t("6","Din Kültürü ve Ahlak Bilgisi",["Peygamber ve Vahiy","Namaz","Ahlaki Davranışlar","Hz. Muhammed'in Hayatı","İslam ve Bilim"]),
  ...t("6","İngilizce",["Life","Yummy Breakfast","Downtown","Weather and Emotions","At the Fair","Occupations"]),
  ...t("6","Beden Eğitimi ve Spor",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Spor Kültürü"]),
  ...t("6","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanat Eleştirisi"]),
  ...t("6","Müzik",["Dinleme-Söyleme","Müziksel Algı ve Bilinç","Müzik Kültürü","Müziksel Yaratıcılık"]),

  ...t("7","Türkçe",["Fiiller","Cümlede Anlam","Parçada Anlam","Yazım ve Noktalama","Metin Türleri","Söz Sanatları"]),
  ...t("7","Matematik",["Tam Sayılar ve Rasyonel Sayılar","Cebir","Eşitlik ve Denklem","Oran-Orantı","Yüzdeler","Doğrular ve Açılar","Çokgenler ve Çember","Veri Analizi"]),
  ...t("7","Fen Bilimleri",["Güneş Sistemi ve Ötesi","Hücre ve Bölünmeler","Kuvvet ve Enerji","Saf Madde ve Karışımlar","Işığın Madde ile Etkileşimi","Canlılarda Üreme, Büyüme ve Gelişme","Elektrik Devreleri"]),
  ...t("7","Sosyal Bilgiler",["Birey ve Toplum","Kültür ve Miras","İnsanlar, Yerler ve Çevreler","Bilim, Teknoloji ve Toplum","Üretim, Dağıtım ve Tüketim","Etkin Vatandaşlık","Küresel Bağlantılar"]),
  ...t("7","Din Kültürü ve Ahlak Bilgisi",["Melek ve Ahiret İnancı","Hac ve Kurban","Ahlaki Davranışlar","Hz. Muhammed'in Hayatı","İslam Düşüncesinde Yorumlar"]),
  ...t("7","İngilizce",["Appearance and Personality","Sports","Biographies","Wild Animals","Television","Celebrations"]),
  ...t("7","Beden Eğitimi ve Spor",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Spor Kültürü"]),
  ...t("7","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanat Eleştirisi"]),
  ...t("7","Müzik",["Dinleme-Söyleme","Müziksel Algı ve Bilinç","Müzik Kültürü","Müziksel Yaratıcılık"]),

  ...t("8","Türkçe",["Fiilimsiler","Cümle Türleri","Cümlenin Ögeleri","Parçada Anlam","Yazım ve Noktalama","Metin Türleri"]),
  ...t("8","Matematik",["Çarpanlar ve Katlar","Üslü İfadeler","Kareköklü İfadeler","Veri Analizi","Basit Olayların Olma Olasılığı","Cebirsel İfadeler ve Özdeşlikler","Doğrusal Denklemler","Eşitsizlikler","Üçgenler","Eşlik ve Benzerlik","Dönüşüm Geometrisi","Geometrik Cisimler"]),
  ...t("8","Fen Bilimleri",["Mevsimler ve İklim","DNA ve Genetik Kod","Basınç","Madde ve Endüstri","Basit Makineler","Enerji Dönüşümleri ve Çevre Bilimi","Elektrik Yükleri ve Elektrik Enerjisi"]),
  ...t("8","T.C. İnkılap Tarihi ve Atatürkçülük",["Bir Kahraman Doğuyor","Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar","Millî Bir Destan: Ya İstiklal Ya Ölüm!","Atatürkçülük ve Çağdaşlaşan Türkiye","Demokratikleşme Çabaları","Atatürk Dönemi Türk Dış Politikası","Atatürk'ün Ölümü ve Sonrası"]),
  ...t("8","Din Kültürü ve Ahlak Bilgisi",["Kader İnancı","Zekât ve Sadaka","Din ve Hayat","Hz. Muhammed'in Örnekliği","Kur'an-ı Kerim ve Evrensel Mesajlar"]),
  ...t("8","İngilizce",["Friendship","Teen Life","In the Kitchen","On the Phone","The Internet","Adventures","Tourism","Chores","Science"]),
  ...t("8","Beden Eğitimi ve Spor",["Hareket Yetkinliği","Aktif ve Sağlıklı Hayat","Spor Kültürü"]),
  ...t("8","Görsel Sanatlar",["Sanat ve Görsel İletişim","Kültürel Miras","Sanat Eleştirisi"]),
  ...t("8","Müzik",["Dinleme-Söyleme","Müziksel Algı ve Bilinç","Müzik Kültürü","Müziksel Yaratıcılık"]),

  // === LISE ===
  ...t("9","Türk Dili ve Edebiyatı",["Sözün Ezgisi","Anlam Arayışı","Anlamın Yapı Taşları","Dilin Zenginliği","Geleneğin İzinde","İletişim ve Etkileşim","Türklerin İlk Eserleri"]),
  ...t("9","Matematik",["Sayılar","Nicelikler ve Değişimler","Geometrik Şekiller","Eşlik ve Benzerlik","Algoritma ve Bilişim","İstatistiksel Araştırma Süreci","Veriden Olasılığa"]),
  ...t("9","Fizik",["Fizik Bilimi ve Kariyer Keşfi","Kuvvet ve Hareket","Akışkanlar","Enerji","Elektrik","Dalgalar"]),
  ...t("9","Kimya",["Etkileşim","Çeşitlilik","Etkileşimler","Enerji","Kimya ve Sürdürülebilirlik"]),
  ...t("9","Biyoloji",["Yaşam","Organizasyon","Ekoloji"]),
  ...t("9","Tarih",["Geçmişin İnşa Sürecinde Tarih","Eski Çağ Medeniyetleri","Orta Çağ Medeniyetleri","İlk ve Orta Çağlarda Türk Dünyası","İslam Medeniyetinin Doğuşu","Türklerin İslamiyet'i Kabulü ve İlk Türk İslam Devletleri"]),
  ...t("9","Coğrafya",["Coğrafyanın Doğası","Mekânsal Bilgi Teknolojileri","Doğal Sistemler ve Süreçler","Beşerî Sistemler ve Süreçler","Ekonomik Faaliyetler","Afetler ve Sürdürülebilir Çevre"]),
  ...t("9","Felsefe",["Felsefeyi Tanıma","Felsefi Düşünce","Felsefenin Temel Konuları","Felsefi Akıl Yürütme"]),
  ...t("9","Din Kültürü ve Ahlak Bilgisi",["Bilgi ve İnanç","Din ve İslam","Ahlak ve Değerler","Allah-İnsan İlişkisi","İslam'da İlkeler ve Değerler"]),
  ...t("9","İngilizce",["School Life and Education","Classroom Life","Personal Life","Family and Society","Daily Life","Environment and Nature","Culture and Travel","Digital World"]),
  ...t("9","Beden Eğitimi ve Spor",["Hareket ve Sağlık","Spor Kültürü","Aktif Yaşam"]),
  ...t("9","Görsel Sanatlar",["Sanatın Anlamı","Kültür ve Sanat","Sanatsal Uygulamalar"]),
  ...t("9","Müzik",["Müziksel Algı","Müzik Kültürü","Uygulama ve Yaratıcılık"]),

  ...t("10","Türk Dili ve Edebiyatı",["Sözün Ezgisi","Kelimelerin Ritmi","Dünden Bugüne","Kültürün Aynası","Köklere Dönüş","Toplum ve Sanat","Türk Dünyası"]),
  ...t("10","Matematik",["Sayılar","Nicelikler ve Değişimler","Sayma, Algoritma ve Bilişim","Geometrik Şekiller","Analitik İnceleme","İstatistiksel Araştırma"]),
  ...t("10","Fizik",["Kuvvet ve Hareket","Elektrik","Dalgalar","Enerji","Madde ve Özellikleri"]),
  ...t("10","Kimya",["Kimyasal Tepkimeler","Gazlar","Çözeltiler","Enerji","Kimya ve Sürdürülebilirlik"]),
  ...t("10","Biyoloji",["Enerji","Ekoloji","Hücre","Kalıtım","Canlılarda Enerji Dönüşümleri"]),
  ...t("10","Tarih",["Türkistan'dan Türkiye'ye","Beylikten Devlete Osmanlı","Devletleşme Sürecinde Osmanlı","Dünya Gücü Osmanlı","Osmanlı Siyaseti ve Kültürü"]),
  ...t("10","Coğrafya",["Doğal Sistemler","Beşerî Sistemler","Ekonomik Faaliyetler","Afetler","Bölgeler ve Ülkeler"]),
  ...t("10","Felsefe",["Felsefe ve Bilgelik","Bilgi Felsefesi","Bilim Felsefesi","Ahlak Felsefesi","Siyaset Felsefesi","Sanat Felsefesi"]),
  ...t("10","Din Kültürü ve Ahlak Bilgisi",["İslam'da İnanç Esasları","İslam'da İbadetler","Ahlak ve Değerler","İslam Düşüncesinde Yorumlar","İslam ve Bilim"]),
  ...t("10","İngilizce",["School and Education","Plans and Experiences","Modern Life","Family and Society","Culture","Environment","Science and Technology"]),
  ...t("10","Beden Eğitimi ve Spor",["Hareket ve Sağlık","Spor Kültürü","Aktif Yaşam"]),
  ...t("10","Görsel Sanatlar",["Sanatın Anlamı","Kültür ve Sanat","Sanatsal Uygulamalar"]),
  ...t("10","Müzik",["Müziksel Algı","Müzik Kültürü","Uygulama ve Yaratıcılık"]),

  ...t("11","Türk Dili ve Edebiyatı",["Bir Başka Dil: Şiir","Hikâye ve Roman","Makale ve Eleştiri","Tiyatro","Söyleşi ve Röportaj","Mülakat ve Sunum"]),
  ...t("11","Matematik",["Sayılar","Fonksiyonlar","Trigonometri","Analitik Geometri","İstatistik ve Olasılık"]),
  ...t("11","Fizik",["Kuvvet ve Hareket","Elektrik ve Manyetizma","Dalgalar","Optik"]),
  ...t("11","Kimya",["Modern Atom Teorisi","Gazlar","Sıvı Çözeltiler","Kimyasal Tepkimeler","Kimya ve Enerji","Kimya ve Elektrik"]),
  ...t("11","Biyoloji",["İnsan Fizyolojisi","Komünite ve Popülasyon Ekolojisi","Genden Proteine","Enerji ve Metabolizma"]),
  ...t("11","Tarih",["Değişen Dünya Dengeleri","Osmanlı Siyaseti ve Gücü","Avrupa ve Osmanlı","Uluslararası İlişkiler","Devrimler Çağında Değişen Devlet-Toplum İlişkileri"]),
  ...t("11","Coğrafya",["Doğal Sistemler","Beşerî Sistemler","Ekonomik Faaliyetler","Çevre ve Toplum","Bölgeler ve Ülkeler"]),
  ...t("11","Din Kültürü ve Ahlak Bilgisi",["Dünya ve Ahiret","Kur'an'a Göre Hz. Muhammed","İslam Düşüncesinde Tasavvufi Yorumlar","Güncel Dinî Meseleler","Hint ve Çin Dinleri"]),
  ...t("11","İngilizce",["Future Plans","Hobbies and Skills","Hard Times","What a Life","Back to the Past","Open Your Heart","Facts About Turkey"]),
  ...t("11","Beden Eğitimi ve Spor",["Hareket ve Sağlık","Spor Kültürü","Aktif Yaşam"]),
  ...t("11","Görsel Sanatlar",["Sanatın Anlamı","Kültür ve Sanat","Sanatsal Uygulamalar"]),
  ...t("11","Müzik",["Müziksel Algı","Müzik Kültürü","Uygulama ve Yaratıcılık"]),

  ...t("12","Türk Dili ve Edebiyatı",["Giriş ve Edebî Türler","Hikâye","Şiir","Tiyatro","Deneme ve Eleştiri","Söylev ve Mülakat"]),
  ...t("12","Matematik",["Üstel ve Logaritmik Fonksiyonlar","Diziler","Trigonometri","Dönüşümler","Türev","İntegral","Analitik Geometri","Olasılık"]),
  ...t("12","Fizik",["Kuvvet ve Hareket","Elektrik ve Manyetizma","Dalgalar","Atom Fiziğine Giriş ve Radyoaktivite","Modern Fizik","Modern Fiziğin Teknolojideki Uygulamaları"]),
  ...t("12","Kimya",["Kimya ve Elektrik","Karbon Kimyasına Giriş","Organik Bileşikler","Enerji","Çevre Kimyası"]),
  ...t("12","Biyoloji",["Genden Proteine","Canlılarda Enerji Dönüşümleri","Bitki Biyolojisi","Canlılar ve Çevre"]),
  ...t("12","T.C. İnkılap Tarihi ve Atatürkçülük",["XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya","Millî Mücadele","Atatürkçülük ve Türk İnkılabı","İki Savaş Arasındaki Dönemde Türkiye ve Dünya","II. Dünya Savaşı ve Sonrası","XXI. Yüzyılın Eşiğinde Türkiye ve Dünya"]),
  ...t("12","Coğrafya",["Doğal Sistemler","Beşerî Sistemler","Ekonomik Faaliyetler","Çevre ve Toplum","Küresel Ortam: Bölgeler ve Ülkeler"]),
  ...t("12","Din Kültürü ve Ahlak Bilgisi",["İslam ve Bilim","Anadolu'da İslam Kültürü ve Medeniyeti","İslam Düşüncesinde Tasavvufi Yorumlar","Güncel Dinî Meseleler","Yaşayan Dinler"]),
  ...t("12","İngilizce",["Music","Friendship","Human Rights","Coming Soon","Psychology","Famous People","Generations"]),
  ...t("12","Beden Eğitimi ve Spor",["Hareket ve Sağlık","Spor Kültürü","Aktif Yaşam"]),
  ...t("12","Görsel Sanatlar",["Sanatın Anlamı","Kültür ve Sanat","Sanatsal Uygulamalar"]),
  ...t("12","Müzik",["Müziksel Algı","Müzik Kültürü","Uygulama ve Yaratıcılık"]),
  // TYT
  ...t("TYT","Matematik",["Temel Kavramlar","Sayı Basamakları","Bölme ve Bölünebilme","EBOB - EKOK","Rasyonel Sayılar","Basit Eşitsizlikler","Mutlak Değer","Üslü Sayılar","Köklü Sayılar","Çarpanlara Ayırma","Oran Orantı","Denklem Çözme","Sayı Problemleri","Kesir Problemleri","Yaş Problemleri","Hareket Hız Problemleri","İşçi Emek Problemleri","Yüzde Problemleri","Kar Zarar Problemleri","Karışım Problemleri","Grafik Problemleri","Rutin Olmayan Problemleri","Kümeler","Kartezyen Çarpım","Mantık","Fonksiyonlar","Polinomlar","2.Dereceden Denklemler","Permütasyon","Kombinasyon","Olasılık","Binom Açılımı","Veri - İstatistik"]),
  ...t("TYT","Geometri",["Temel Kavramlar", "Doğruda Açılar", "Üçgende Açılar", "Dik Üçgen", "İkizkenar Üçgen", "Eşkenar Üçgen", "Açıortay", "Kenarortay", "Eşlik ve Benzerlik", "Üçgende Alan", "Üçgende Benzerlik", "Açı Kenar Bağıntıları", "Çokgenler", "Dörtgenler", "Deltoid", "Paralelkenar", "Eşkenar Dörtgen", "Dikdörtgen", "Kare", "Yamuk", "Çemberde Açı", "Çemberde Uzunluk", "Dairede Çevre ve Alan", "Noktanın Analitiği", "Doğrunun Analitiği", "Dönüşüm Geometrisi", "Prizmalar", "Küp", "Silindir", "Piramit", "Koni", "Küre", "Çemberin Analitiği"]),
  ...t("TYT","Fizik",["Fizik Bilimine Giriş", "Madde ve Özellikleri", "Sıvıların Kaldırma Kuvveti", "Basınç", "Isı, Sıcaklık ve Genleşme", "Hareket ve Kuvvet", "Dinamik", "İş, Güç ve Enerji", "Elektrik", "Manyetizma", "Dalgalar", "Optik"]),
  ...t("TYT","Kimya",["Kimya Bilimi", "Atomun Yapısı", "Periyodik Tablo", "Maddenin Halleri", "Kimyasal Türler Arası Etkileşimler", "Kimyasal Hesaplamalar", "Kimyanın Temel Kanunları", "Asit, Baz ve Tuz", "Karışımlar", "Kimya Her Yerde"]),
  ...t("TYT","Biyoloji",["Yaşam Bilimi Biyolojisi", "Canlıların Ortak Özellikleri", "Canlıların Temel Bileşenleri", "Güncel Çevre Sorunları", "Hücre ve Organeller - Madde Geçişleri", "Canlıların Sınıflandırılması", "Hücrede Bölünme - Üreme", "Kalıtım", "Bitki Biyolojisi", "Ekosistem"]),
  ...t("TYT","Türkçe",["Sözcükte Anlam","Söz Yorumu","Deyim ve Atasözü","Cümlede Anlam","Paragraf","Paragrafta Anlatım Teknikleri","Paragrafta Düşünceyi Geliştirme Yolları","Paragrafta Yapı","Paragrafta Konu-Ana Düşünce","Paragrafta Yardımcı Düşünce","Ses Bilgisi","Yazım Kuralları","Noktalama İşaretleri","Sözcükte Yapı/Ekler","Sözcük Türleri","İsimler","Zamirler","Sıfatlar","Zarflar","Edat – Bağlaç – Ünlem","Fiiller","Fiilde Anlam (Kip-Kişi-Yapı)","Ek Fiil","Fiilimsi","Fiilde Çatı","Sözcük Grupları","Cümlenin Ögeleri","Cümle Türleri","Anlatım Bozukluğu"]),
  ...t("TYT","Tarih",["Tarih ve Zaman", "İnsanlığın İlk Dönemleri", "Orta Çağ'da Dünya", "İlk ve Orta Çağlarda Türk Dünyası", "İslam Medeniyetinin Doğuşu", "Türklerin İslamiyet'i Kabulü ve İlk Türk İslam Devletleri", "Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi", "Beylikten Devlete Osmanlı Siyaseti", "Devletleşme Sürecinde Savaşçılar ve Askerler", "Beylikten Devlete Osmanlı Medeniyeti", "Dünya Gücü Osmanlı", "Sultan ve Osmanlı Merkez Teşkilatı", "Klasik Çağda Osmanlı Toplum Düzeni", "Değişen Dünya Dengeleri Karşısında Osmanlı Siyaseti", "Değişim Çağında Avrupa ve Osmanlı", "Uluslararası İlişkilerde Denge Stratejisi (1774-1914)", "Devrimler Çağında Değişen Devlet-Toplum İlişkileri", "Sermaye ve Emek", "XIX. ve XX. Yüzyılda Değişen Gündelik Hayat", "XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya", "Milli Mücadele", "Atatürkçülük ve Türk İnkılabı", "İki Savaş Arasındaki Dönemde Türkiye ve Dünya", "II. Dünya Savaşı Sürecinde Türkiye ve Dünya", "II. Dünya Savaşı Sonrasında Türkiye ve Dünya", "Toplumsal Devrim Çağında Dünya ve Türkiye", "XXI. Yüzyılın Eşiğinde Türkiye ve Dünya"]),
  ...t("TYT","Coğrafya",["Doğa ve İnsan", "Dünya'nın Şekli ve Hareketleri", "Coğrafi Konum", "Harita Bilgisi", "Atmosfer ve Sıcaklık", "İklimler", "Basınç ve Rüzgarlar", "Nem, Yağış ve Buharlaşma", "İç Kuvvetler / Dış Kuvvetler", "Su - Toprak ve Bitkiler", "Nüfus", "Göç", "Yerleşme", "Türkiyenin Yer Şekilleri", "Ekonomik Faaliyetler", "Bölgeler", "Uluslararası Ulaşım Haritası", "Çevre ve Toplum", "Doğal Afetler"]),
  ...t("TYT","Felsefe",["Felsefeyi Tanıma", "Felsefe İle Düşünme", "Varlık Felsefesi", "Bilgi Felsefesi", "Bilim Felsefesi", "Ahlak Felsefesi", "Din Felsefesi", "Siyaset Felsefesi", "Sanat Felsefesi"]),
  // AYT
  ...t("AYT","Matematik",["Polinomlar","2.Dereceden Denklemler","Karmaşık Sayılar","2.Dereceden Eşitsizlikler","Parabol","Trigonometri","Logaritma","Diziler","Limit","Türev","İntegral"]),
  ...t("AYT","Fizik",["Vektörler", "Kuvvet, Tork ve Denge", "Kütle Merkezi", "Basit Makineler", "Hareket", "Newton'un Hareket Yasaları", "İş, Güç ve Enerji II", "Atışlar", "İtme ve Momentum", "Elektrik Alan ve Potansiyel", "Paralel Levhalar ve Sığa", "Manyetik Alan ve Manyetik Kuvvet", "İndüksiyon, Alternatif Akım ve Transformatörler", "Çembersel Hareket", "Dönme, Yuvarlanma ve Açısal Momentum", "Kütle Çekim ve Kepler Yasaları", "Basit Harmonik Hareket", "Dalga Mekaniği ve Elektromanyetik Dalgalar", "Atom Modelleri", "Büyük Patlama ve Parçacık Fiziği", "Radyoaktivite", "Özel Görelilik", "Kara Cisim Işıması", "Fotoelektrik Olay ve Compton Olayı", "Modern Fiziğin Teknolojideki Uygulamaları"]),
  ...t("AYT","Kimya",["Kimya Bilimi", "Atom ve Periyodik Sistem", "Kimyasal Türler Arası Etkileşimler", "Kimyasal Hesaplamalar", "Kimyanın Temel Kanunları", "Asit, Baz ve Tuz", "Maddenin Halleri", "Karışımlar", "Doğa ve Kimya", "Kimya Her Yerde", "Modern Atom Teorisi", "Gazlar", "Sıvı Çözeltiler", "Kimyasal Tepkimelerde Enerji", "Kimyasal Tepkimelerde Hız", "Kimyasal Tepkimelerde Denge", "Asit-Baz Dengesi", "Çözünürlük Dengesi", "Kimya ve Elektrik", "Organik Kimyaya Giriş", "Organik Kimya", "Enerji Kaynakları ve Bilimsel Gelişmeler"]),
  ...t("AYT","Biyoloji",["Sinir Sistemi", "Endokrin Sistem", "Duyu Organları", "Destek ve Hareket Sistemi", "Sindirim Sistemi", "Dolaşım Sistemi", "Solunum Sistemi", "Üriner Sistem (Boşaltım Sistemi)", "Üreme Sistemi ve Embriyonik Gelişim", "Komünite Ekolojisi", "Popülasyon Ekolojisi", "Nükleik Asitler", "Genetik Şifre ve Protein Sentezi", "Canlılık ve Enerji", "Fotosentez", "Kemosentez", "Hücresel Solunum", "Bitki Biyolojisi", "Canlılar ve Çevre"]),
  ...t("AYT","Türk Dili ve Edebiyatı",["Anlam Bilgisi","Dil Bilgisi","Güzel Sanatlar ve Edebiyat","Metinlerin Sınıflandırılması","Şiir Bilgisi","Edebi Sanatlar","Türk Edebiyatı Dönemleri","İslamiyet Öncesi Türk Edebiyatı ve Geçiş Dönemi","Halk Edebiyatı","Divan Edebiyatı","Tanzimat Edebiyatı","Servet-i Fünun Edebiyatı","Fecr-i Âti Edebiyatı","Milli Edebiyat","Cumhuriyet Dönemi Edebiyatı","Edebiyat Akımları","Dünya Edebiyatı"]),
  ...t("AYT","Tarih",["Tarih ve Zaman", "İnsanlığın İlk Dönemleri", "Orta Çağ'da Dünya", "İlk ve Orta Çağlarda Türk Dünyası", "İslam Medeniyetinin Doğuşu", "Türklerin İslamiyet'i Kabulü ve İlk Türk İslam Devletleri", "Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi", "Beylikten Devlete Osmanlı Siyaseti", "Devletleşme Sürecinde Savaşçılar ve Askerler", "Beylikten Devlete Osmanlı Medeniyeti", "Dünya Gücü Osmanlı", "Sultan ve Osmanlı Merkez Teşkilatı", "Klasik Çağda Osmanlı Toplum Düzeni", "Değişen Dünya Dengeleri Karşısında Osmanlı Siyaseti", "Değişim Çağında Avrupa ve Osmanlı", "Uluslararası İlişkilerde Denge Stratejisi (1774-1914)", "Devrimler Çağında Değişen Devlet-Toplum İlişkileri", "Sermaye ve Emek", "XIX. ve XX. Yüzyılda Değişen Gündelik Hayat", "XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya", "Milli Mücadele", "Atatürkçülük ve Türk İnkılabı", "İki Savaş Arasındaki Dönemde Türkiye ve Dünya", "II. Dünya Savaşı Sürecinde Türkiye ve Dünya", "II. Dünya Savaşı Sonrasında Türkiye ve Dünya", "Toplumsal Devrim Çağında Dünya ve Türkiye", "XXI. Yüzyılın Eşiğinde Türkiye ve Dünya"]),
  ...t("AYT","Coğrafya",["Ekosistem", "İlk Medeniyet ve Şehirler", "Nüfus Politikaları", "Göç ve Şehirleşme", "Türkiye'nin Jeopolitik Konumu", "Türkiye Ekonomisi", "Türkiye'de Doğal Afetler", "Türkiye ve Dünyada Bölgeler", "İklim ve Yer şekilleri", "Ülkeler Arası Etkileşim", "Küresel ve Bölgesel Örgütler", "Üretim Alanları ve Ulaşım Ağları", "Ülkeler"]),
  ...t("AYT","Felsefe Grubu",["Felsefeye Giriş","Bilgi Felsefesi","Varlik Felsefesi","Ahlak Felsefesi","Siyaset Felsefesi","Estetik","Psikoloji","Sosyoloji","Mantik","Din Felsefesi"]),
];

export const SCHOOL_LEVELS = {
  "İlkokul": { grades: ["1","2","3","4"], label: "İlkokul (1-4)", emoji: "🏫" },
  "Ortaokul": { grades: ["5","6"], label: "Ortaokul (5-6)", emoji: "📚" },
  "LGS": { grades: ["7","8"], label: "LGS Hazırlık (7-8)", emoji: "🎯" },
  "Lise": { grades: ["9","10"], label: "Lise (9-10)", emoji: "🎓" },
  "YKS": { grades: ["11","12","TYT","AYT"], label: "YKS Hazırlık", emoji: "🚀" },
};

export const GRADE_LABELS = {
  "1":"1. Sınıf","2":"2. Sınıf","3":"3. Sınıf","4":"4. Sınıf",
  "5":"5. Sınıf","6":"6. Sınıf","7":"7. Sınıf","8":"8. Sınıf",
  "9":"9. Sınıf","10":"10. Sınıf","11":"11. Sınıf","12":"12. Sınıf",
  "TYT":"TYT","AYT":"AYT"
};

export const GRADE_ORDER = ["1","2","3","4","5","6","7","8","9","10","11","12","TYT","AYT"];

const SUBJECT_PRIORITY = {
  "Matematik": 1,
  "Türkçe": 2,
  "Türk Dili ve Edebiyatı": 3,
  "Geometri": 4,
  "Fizik": 5,
  "Kimya": 6,
  "Biyoloji": 7,
  "Fen Bilimleri": 8,
  "Tarih": 9,
  "T.C. İnkılap Tarihi ve Atatürkçülük": 10,
  "Coğrafya": 11,
  "Din Kültürü ve Ahlak Bilgisi": 12,
  "İngilizce": 13,
  "Felsefe": 14,
  "Felsefe Grubu": 15
};

export const CURRICULUM_TREE = {};
CURRICULUM.forEach(item => {
  if (!CURRICULUM_TREE[item.grade]) CURRICULUM_TREE[item.grade] = {};
  if (!CURRICULUM_TREE[item.grade][item.subject]) CURRICULUM_TREE[item.grade][item.subject] = [];
  CURRICULUM_TREE[item.grade][item.subject].push(item);
});

// Sort subjects within each grade based on priority
Object.keys(CURRICULUM_TREE).forEach(grade => {
  const subjectsObj = CURRICULUM_TREE[grade];
  const sortedSubjects = {};
  
  Object.keys(subjectsObj).sort((a, b) => {
    const priorityA = SUBJECT_PRIORITY[a] || 99;
    const priorityB = SUBJECT_PRIORITY[b] || 99;
    return priorityA - priorityB;
  }).forEach(key => {
    sortedSubjects[key] = subjectsObj[key];
  });
  
  CURRICULUM_TREE[grade] = sortedSubjects;
});
