export const legalLastUpdated = "11 Ağustos 2026";

export const legalEntity = {
  platformName: "Fıstık360",
  domain: "fistik360.com",
  operatorName: "Fıstık360 platform işletmecisi",
  publicationNotice: "Ticari unvan, tebligat adresi, vergi bilgileri ve doğrulanmış iletişim kanalları canlı yayın öncesinde işletmeci tarafından tamamlanacaktır.",
} as const;

export const corporateLinks = [
  { href: "/sayfalar/hakkimizda", label: "Hakkımızda" },
  { href: "/fiyatlandirma", label: "Fiyatlandırma" },
  { href: "/paketler", label: "Toplu Paketler" },
  { href: "/sayfalar/kunye", label: "Künye" },
  { href: "/sayfalar/iletisim", label: "İletişim" },
] as const;

export const legalLinks = [
  { href: "/sayfalar/kvkk-aydinlatma-metni", label: "KVKK Aydınlatma Metni" },
  { href: "/sayfalar/gizlilik-politikasi", label: "Gizlilik Politikası" },
  { href: "/sayfalar/kullanim-sartlari", label: "Kullanım Şartları" },
  { href: "/sayfalar/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/sayfalar/iptal-iade-politikasi", label: "İptal & İade Politikası" },
  { href: "/sayfalar/hesap-silme", label: "Hesap Silme" },
] as const;

export const legalDocumentSlugs = [
  "hakkimizda",
  "kunye",
  "iletisim",
  "kvkk-aydinlatma-metni",
  "gizlilik-politikasi",
  "kullanim-sartlari",
  "mesafeli-satis-sozlesmesi",
  "iptal-iade-politikasi",
  "hesap-silme",
] as const;

export type LegalDocumentSlug = (typeof legalDocumentSlugs)[number];

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  facts?: Array<{ label: string; value: string }>;
  links?: Array<{ href: string; label: string }>;
}

export interface LegalDocument {
  slug: LegalDocumentSlug;
  group: "Kurumsal" | "Yasal";
  title: string;
  description: string;
  notice?: string;
  sections: LegalSection[];
}

const documents: Record<LegalDocumentSlug, LegalDocument> = {
  hakkimizda: {
    slug: "hakkimizda",
    group: "Kurumsal",
    title: "Hakkımızda",
    description: "Kuruyemiş ticaretinin tüketici, mağaza, toptancı ve marka partneri katmanlarını tek dijital altyapıda buluşturuyoruz.",
    sections: [
      {
        title: "Fıstık360 nedir?",
        paragraphs: [
          "Fıstık360; kuruyemişçiler, kuruyemiş toptancıları, üretici markalar ve tüketiciler için tasarlanmış dikey bir pazaryeri ve mağaza yönetim altyapısıdır.",
          "Tüketici mahallesini seçerek yalnız o bölgeye aktif teslimat yapan kuruyemiş mağazalarını görür. Kuruyemişçiler kendilerine ayrılmış toptan pazarda yetkili tedarikçileri inceleyebilir. Onaylı marka partnerleri ürünlerini kendi vitrinlerinde sergileyip siparişlerini kendi stoklarından hazırlar.",
        ],
      },
      {
        title: "Pazaryeri modelimiz",
        bullets: [
          "Mahalle pazarı, tüketici ile o mahalleye teslimat yapan kuruyemiş mağazasını buluşturur.",
          "Toptan pazar yalnız yetkili kuruyemişçi, toptancı ve yönetici hesaplarına açıktır.",
          "Partner vitrini doğrulanmış kuruyemiş ve atıştırmalık markalarının ürünlerini tüketiciye sunar.",
          "Tek mağazalı sepet, fiyat, teslimat ve ödeme koşullarının doğru satıcıya ait kalmasını sağlar.",
        ],
      },
      {
        title: "%0 komisyon ve sorumluluk",
        paragraphs: [
          "Mahalle mağazalarının tüketici siparişlerinde Fıstık360’ın temel modeli %0 satış komisyonudur. Ücretli mağaza planları ve marka partnerliği gibi ticari hizmetlerin kapsamı kendi plan veya sözleşmesinde ayrıca belirlenir.",
          "Ürün fiyatı, stok, içerik ve alerjen bilgileri, teslimat, fiş veya fatura ve satış sonrası süreç ilgili satıcının sorumluluğundadır. Fıstık360 ürün üretmez veya stoklamaz; siparişin kurulmasına ve yönetilmesine aracılık eden dijital altyapıyı sunar.",
        ],
      },
      {
        title: "Güvenli alışveriş yaklaşımı",
        bullets: [
          "Canlı bağlantılar HTTPS/TLS üzerinden korunur.",
          "Mevcut MVP akışında Fıstık360 kart numarası veya kart güvenlik kodu toplamaz ve saklamaz.",
          "Nakit, kapıda kart veya banka transferi seçenekleri yalnız ilgili mağaza etkinleştirdiyse gösterilir.",
          "Banka transferi bilgisi genel mağaza listelerinde yayımlanmaz; sipariş bağlamında kontrollü biçimde gösterilir.",
        ],
      },
    ],
  },
  kunye: {
    slug: "kunye",
    group: "Kurumsal",
    title: "Künye",
    description: "Fıstık360 platformunun işletmeci, iletişim ve yayın bilgileri.",
    notice: legalEntity.publicationNotice,
    sections: [
      {
        title: "Platform bilgileri",
        facts: [
          { label: "Platform", value: legalEntity.platformName },
          { label: "İnternet adresi", value: legalEntity.domain },
          { label: "İşletmeci", value: legalEntity.operatorName },
          { label: "Ticari unvan", value: "Yayın öncesi doğrulanacak" },
          { label: "Tebligat adresi", value: "Yayın öncesi doğrulanacak" },
          { label: "VKN / Vergi dairesi", value: "Yayın öncesi doğrulanacak" },
          { label: "Telefon ve e-posta", value: "Yayın öncesi doğrulanacak" },
        ],
      },
      {
        title: "Platformun rolü",
        paragraphs: [
          "Fıstık360; mağaza, toptancı ve marka partnerlerinin dijital vitrinlerini yönetmesine, tüketicinin bölgesine hizmet veren mağazayı bulmasına ve sipariş sürecinin taraflar arasında kurulmasına aracılık eden bir teknoloji platformudur.",
          "Siparişin satıcısı, sipariş özetinde adı ve iletişim bilgileri gösterilen mağaza veya marka partneridir. Satıcıya özgü fiyat, teslimat, ödeme ve iade koşulları sipariş öncesinde ayrıca sunulur.",
        ],
      },
    ],
  },
  iletisim: {
    slug: "iletisim",
    group: "Kurumsal",
    title: "İletişim",
    description: "Sipariş, hesap, mağaza, toptan pazar, partnerlik ve kişisel veri talepleriniz için doğru kanala ulaşın.",
    notice: legalEntity.publicationNotice,
    sections: [
      {
        title: "Fıstık360 destek",
        paragraphs: ["Doğrulanmış destek e-postası, telefon ve tebligat adresi canlı yayın öncesinde bu alana ve footer’a merkezi yapılandırmadan eklenecektir."],
      },
      {
        title: "Sipariş konusunda",
        paragraphs: [
          "Teslimat zamanı, ürün içeriği, alerjen, stok, fiş veya fatura ve mağazaya yapılan ödeme hakkında öncelikle siparişinizde görünen satıcıyla iletişime geçin. Çözülemeyen platform kaynaklı durumlarda sipariş numaranızı Fıstık360 desteğe iletin.",
        ],
      },
      {
        title: "KVKK ve hesap talepleri",
        paragraphs: [
          "Kişisel veri veya hesap silme talebi yalnız kayıtlı e-posta ve güvenli kimlik doğrulaması sonrasında işleme alınır. Doğrulanmış başvuru kanalı yayın öncesinde burada belirtilecektir.",
        ],
      },
    ],
  },
  "kvkk-aydinlatma-metni": {
    slug: "kvkk-aydinlatma-metni",
    group: "Yasal",
    title: "KVKK Aydınlatma Metni",
    description: "Fıstık360 kullanıcılarının kişisel verilerinin hangi kapsamda işlendiğine ilişkin 6698 sayılı Kanun uyarınca bilgilendirme.",
    notice: "Bu metin aydınlatma yükümlülüğünü yerine getirmek içindir; tek başına açık rıza talebi değildir. Veri sorumlusunun tam ticari bilgileri canlı yayın öncesinde künye ile birlikte tamamlanmalıdır.",
    sections: [
      {
        title: "1. Veri sorumlusu",
        paragraphs: ["Kişisel verileriniz, veri sorumlusu sıfatıyla Fıstık360 platform işletmecisi tarafından işlenir. Veri sorumlusunun tam unvanı, adresi ve doğrulanmış başvuru kanalı canlı yayın öncesinde bu metne eklenecektir."],
      },
      {
        title: "2. İşlenen veri kategorileri",
        bullets: [
          "Kimlik ve iletişim: ad soyad, e-posta, telefon ve hesap doğrulama kayıtları.",
          "Müşteri işlem: sepet, sipariş, teslimat bölgesi, ödeme yöntemi ve destek kayıtları.",
          "Satıcı ve partner: işletme, yetkili, vergi, mağaza, ürün, abonelik ve başvuru bilgileri.",
          "İşlem güvenliği: oturum, IP, cihaz, hata, erişim ve kötüye kullanım önleme kayıtları.",
          "Finans ve hukuk: ödeme yöntemine ilişkin sınırlı işlem bilgileri, fiş/fatura ve uyuşmazlık kayıtları.",
        ],
      },
      {
        title: "3. İşleme amaçları",
        bullets: [
          "Hesap açmak, e-posta OTP doğrulaması yapmak ve rol bazlı erişimi sağlamak.",
          "Mağaza, toptan pazar, partner vitrini, sepet, sipariş ve teslimat işlevlerini yürütmek.",
          "Satıcı ve partner başvurularını değerlendirmek; sözleşme ve abonelik süreçlerini yönetmek.",
          "Bilgi güvenliği, dolandırıcılık önleme, hata analizi ve hizmet sürekliliğini sağlamak.",
          "Yasal yükümlülükleri yerine getirmek, talepleri yanıtlamak ve uyuşmazlıkları yönetmek.",
        ],
      },
      {
        title: "4. Toplama yöntemi ve hukuki sebepler",
        paragraphs: [
          "Veriler; web ve mobil arayüzler, OTP işlemleri, formlar, sipariş hareketleri, destek iletişimi ve teknik kayıtlar üzerinden otomatik veya kısmen otomatik yollarla toplanır.",
          "İşleme faaliyetleri; sözleşmenin kurulması veya ifası, hukuki yükümlülük, bir hakkın tesisi/kullanılması/korunması ve temel haklara zarar vermemek kaydıyla meşru menfaat hukuki sebeplerine dayanır. Açık rıza gereken ayrı faaliyetlerde rıza ayrıca alınır.",
        ],
      },
      {
        title: "5. Aktarım ve saklama",
        paragraphs: [
          "Veriler, işlem için gerekli olduğu ölçüde siparişin ilgili satıcısına; barındırma, kimlik doğrulama, e-posta, güvenlik ve destek hizmeti sağlayıcılarına; yetkili kamu kurumlarına ve hukuken yetkili kişilere aktarılabilir.",
          "Her veri kategorisi işleme amacı ve yasal saklama süreleriyle sınırlı tutulur; süre sonunda silinir, yok edilir veya anonim hâle getirilir. Yurt dışı aktarım gerektiren hizmetlerde yürürlükteki KVKK şartları ve uygun güvenceler gözetilir.",
        ],
      },
      {
        title: "6. İlgili kişi hakları",
        bullets: [
          "Verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme.",
          "İşleme amacını, amaca uygun kullanımı ve aktarılan üçüncü kişileri öğrenme.",
          "Eksik veya yanlış verinin düzeltilmesini; şartları oluştuğunda silinmesini veya yok edilmesini isteme.",
          "Otomatik sistem sonucuna itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme.",
        ],
        links: [{ href: "/sayfalar/hesap-silme", label: "Hesap silme adımları" }],
      },
    ],
  },
  "gizlilik-politikasi": {
    slug: "gizlilik-politikasi",
    group: "Yasal",
    title: "Gizlilik Politikası",
    description: "Fıstık360’ın hesap, mağaza, sipariş ve platform kullanım verilerine yaklaşımı.",
    sections: [
      {
        title: "Topladığımız bilgiler",
        paragraphs: ["Yalnız hizmeti sunmak, hesabı güvenli tutmak, siparişi doğru satıcıya iletmek ve yasal yükümlülükleri yerine getirmek için gerekli bilgileri toplarız. Kayıt sırasında doğrulama; sipariş sırasında sepet, teslimat bölgesi ve iletişim; satıcı ve partner süreçlerinde işletme bilgileri işlenebilir."],
      },
      {
        title: "Konum ve mahalle seçimi",
        paragraphs: ["Mahalle seçimi, o bölgeye gerçekten teslimat yapan mağazaları listelemek için kullanılır. Açık izin verilmedikçe cihazın hassas konumu alınmaz. İl, ilçe ve mahalle seçimi sipariş teslimatı ve mağaza uygunluğu amacıyla işlenir."],
      },
      {
        title: "Çerezler ve yerel depolama",
        paragraphs: ["Oturumun sürdürülmesi, güvenlik, tercihlerin hatırlanması ve sepet deneyimi için zorunlu çerezler veya tarayıcı depolaması kullanılabilir. Zorunlu olmayan analiz ya da pazarlama teknolojileri devreye alınırsa ayrı bilgilendirme ve gerektiğinde tercih yönetimi sunulur."],
      },
      {
        title: "Ödeme ve güvenlik",
        bullets: [
          "Mevcut MVP’de online kart numarası ve kart güvenlik kodu Fıstık360 tarafından alınmaz veya saklanmaz.",
          "Kapıda nakit, kapıda kart ve banka transferi seçenekleri mağaza tarafından belirlenir.",
          "Banka hesabı bilgisi genel listeleme sayfalarında gösterilmez; ilgili sipariş bağlamıyla sınırlandırılır.",
          "OTP, rol tabanlı erişim, güvenli bağlantı ve sunucu tarafı kontroller yetkisiz erişimi azaltmak için kullanılır.",
        ],
      },
      {
        title: "Politika değişiklikleri",
        paragraphs: ["Hizmet veya mevzuat değiştiğinde bu politika güncellenebilir. Önemli değişiklikler uygun kanal üzerinden duyurulur; güncel tarih sayfanın üstünde gösterilir."],
      },
    ],
  },
  "kullanim-sartlari": {
    slug: "kullanim-sartlari",
    group: "Yasal",
    title: "Kullanım Şartları",
    description: "Fıstık360’ın tüketici, kuruyemiş mağazası, toptancı ve marka partneri hesapları için temel platform kuralları.",
    sections: [
      {
        title: "1. Kapsam ve kabul",
        paragraphs: ["Fıstık360’a erişen veya hesap oluşturan kullanıcı bu şartları, rolüne özel ek koşulları ve ilgili yasal metinleri okumakla yükümlüdür. Sipariş veren tüketici satıcı, ürün, toplam fiyat, teslimat ve ödeme bilgilerini sipariş öncesinde ayrıca onaylar."],
      },
      {
        title: "2. Hesap ve yetkilendirme",
        bullets: [
          "Hesap yalnız kullanıcıya ait doğrulanmış e-posta üzerinden 6 haneli OTP ile açılır veya erişilir.",
          "Kullanıcı iletişim ve işletme bilgilerinin doğru, güncel ve kendisine ait olmasını sağlar.",
          "Satıcı, toptancı, partner veya yönetici rolü kullanıcı tarafından değiştirilemez; yetkili iş akışıyla atanır.",
          "Şüpheli erişim, yetki aşımı veya kötüye kullanım hâlinde erişim geçici olarak sınırlandırılabilir.",
        ],
      },
      {
        title: "3. Satıcı ve partner yükümlülükleri",
        bullets: [
          "Ürün, gramaj, fiyat, stok, içerik, alerjen, son tüketim ve teslimat bilgisini doğru tutmak.",
          "Siparişe ilişkin geçerli fiş veya faturayı düzenlemek ve müşteriye ulaştırmak.",
          "Yalnız hukuka uygun, güvenli ve satış yetkisi bulunan ürünleri yayımlamak.",
          "Tüketici talepleri, iptal, iade ve ayıplı mal süreçlerini mevzuata göre sonuçlandırmak.",
        ],
      },
      {
        title: "4. Toptan pazar ve partner vitrini",
        paragraphs: ["Toptan pazar tüketici hesaplarına kapalıdır; fiyat ve talep bilgileri yalnız yetkili ticari rollere gösterilir. Marka partneri doğrulanmış markası ve kendi ürünleri dışında içerik yayımlayamaz. Ticari komisyon, abonelik veya hizmet bedelleri ilgili plan ya da partner sözleşmesinde ayrıca düzenlenir."],
      },
      {
        title: "5. Fikri mülkiyet ve hizmet sürekliliği",
        paragraphs: ["Fıstık360 markası, yazılımı, arayüzü ve platform içeriği üzerindeki haklar saklıdır. Satıcı ve partner, yüklediği içerik için gerekli haklara sahip olduğunu kabul eder. Bakım, güvenlik veya mücbir sebep durumlarında hizmet geçici olarak kesilebilir."],
      },
    ],
  },
  "mesafeli-satis-sozlesmesi": {
    slug: "mesafeli-satis-sozlesmesi",
    group: "Yasal",
    title: "Mesafeli Satış Sözleşmesi",
    description: "Fıstık360 üzerinden tüketici ile siparişte belirtilen satıcı arasında kurulan satış için genel çerçeve.",
    notice: "Bu genel metin tek başına siparişe özgü sözleşme değildir. Satıcı kimliği, ürün, miktar, toplam bedel, teslimat ve ödeme bilgileri checkout sırasında siparişe özel olarak gösterilmelidir.",
    sections: [
      {
        title: "1. Taraflar ve platformun rolü",
        paragraphs: ["ALICI siparişi veren tüketicidir. SATICI, sipariş özetinde ticari unvanı ve iletişim bilgileri gösterilen kuruyemiş mağazası veya marka partneridir. Fıstık360, tarafların mesafeli sözleşme kurmasına aracılık eden dijital platformdur; siparişte açıkça satıcı olarak gösterilmedikçe ürünün satıcısı değildir."],
      },
      {
        title: "2. Sipariş ön bilgilendirmesi",
        bullets: [
          "Ürünün temel nitelikleri, miktarı, gramajı, içerik ve varsa alerjen bilgisi.",
          "Satıcının adı veya unvanı, adresi ve erişilebilir iletişim kanalı.",
          "Vergiler dâhil toplam fiyat, teslimat ücreti ve diğer zorunlu masraflar.",
          "Teslimat yöntemi, tahmini süre, hizmet alanı ve seçilen ödeme yöntemi.",
          "Cayma hakkı, istisnaları, iptal/iade yöntemi ve başvuru kanalları.",
        ],
      },
      {
        title: "3. Sözleşmenin kurulması ve ödeme",
        paragraphs: [
          "ALICI, sipariş düğmesinin ödeme yükümlülüğü doğurduğunu görerek ön bilgileri ve sözleşmeyi elektronik ortamda onayladığında sözleşme kurulur. Ödeme yöntemi ilgili satıcının etkinleştirdiği kapıda nakit, kapıda kart veya banka transferi seçeneklerinden biridir.",
          "Banka transferinde gösterilen hesap satıcıya aittir. Mevcut MVP’de Fıstık360 online kart tahsilatı yapmaz ve kart bilgisi saklamaz.",
        ],
      },
      {
        title: "4. Teslimat ve belge",
        paragraphs: ["Sipariş, checkout’ta seçilen hizmet alanı ve satıcının bildirdiği koşullara göre teslim edilir. Minimum sepet, teslimat ücreti ve ücretsiz teslimat eşiği sipariş özeti oluşturulurken sunucu tarafında hesaplanır. Satıcı fiş veya faturayı düzenleyerek ALICI’ya ulaştırır."],
      },
      {
        title: "5. Cayma hakkı ve istisnalar",
        paragraphs: [
          "Tüketici, yasal istisnalar dışında malın tesliminden itibaren on dört gün içinde gerekçe göstermeden cayma hakkını kullanabilir. Çabuk bozulabilen, tüketicinin talebine göre hazırlanan veya koruyucu ambalajı açıldıktan sonra sağlık ve hijyen bakımından iadeye uygun olmayan ürünlerde ürün niteliğine göre yasal istisna uygulanabilir.",
          "İstisnalar ayıplı, bozuk, yanlış veya siparişe aykırı ürünlere ilişkin tüketici haklarını ortadan kaldırmaz.",
        ],
        links: [
          { href: "/sayfalar/iptal-iade-politikasi", label: "İptal ve iade adımları" },
          { href: "/sayfalar/iletisim", label: "Destek kanalları" },
        ],
      },
      {
        title: "6. Uyuşmazlık",
        paragraphs: ["Taraflar öncelikle satıcı ve Fıstık360 destek kanalları üzerinden çözüm arar. Tüketicinin, yürürlükteki parasal sınırlara göre Tüketici Hakem Heyetine veya Tüketici Mahkemesine başvuru hakkı saklıdır."],
      },
    ],
  },
  "iptal-iade-politikasi": {
    slug: "iptal-iade-politikasi",
    group: "Yasal",
    title: "İptal & İade Politikası",
    description: "Kuruyemiş mağazası veya marka partnerinden verilen siparişlerde iptal, cayma ve ayıplı ürün bildirim süreci.",
    sections: [
      {
        title: "Sipariş hazırlanmadan önce iptal",
        paragraphs: ["Sipariş henüz hazırlanmadıysa müşteri, sipariş ekranındaki kanal veya satıcı iletişimi üzerinden iptal talebi oluşturabilir. Satıcı hazırlığa başladıysa ürünün niteliği ve yasal haklar dikkate alınarak talep değerlendirilir."],
      },
      {
        title: "Teslimatta kontrol",
        bullets: [
          "Ambalajı, ürün adını, miktarı ve görünür hasarı teslim anında kontrol edin.",
          "Eksik, yanlış, hasarlı veya bozulmuş ürünü mümkünse fotoğrafla belgeleyin.",
          "Sorunu gecikmeden siparişte görünen satıcıya ve gerekiyorsa Fıstık360 desteğe bildirin.",
        ],
      },
      {
        title: "Cayma hakkı",
        paragraphs: [
          "Yasal istisna bulunmayan ürünlerde tüketici teslimden itibaren on dört gün içinde cayma bildiriminde bulunabilir. Bildirim yazılı olarak veya kalıcı veri saklayıcısı üzerinden yapılmalıdır.",
          "Çabuk bozulabilen, kişiye özel hazırlanan ya da koruyucu ambalajı açıldıktan sonra sağlık ve hijyen bakımından iadesi uygun olmayan ürünlerde mevzuattaki istisnalar uygulanabilir. Her kuruyemiş ürünü otomatik olarak istisna kabul edilmez; ürün ve ambalaj niteliği değerlendirilir.",
        ],
      },
      {
        title: "Ayıplı veya siparişe aykırı ürün",
        paragraphs: ["Bozuk, bayat, hasarlı, eksik, yanlış veya ilan edilen niteliklere aykırı ürünlerde tüketicinin seçimlik hakları saklıdır. Hijyen veya cayma istisnası, ayıplı mala ilişkin hakları ortadan kaldırmaz."],
      },
      {
        title: "İade ve geri ödeme",
        paragraphs: ["Onaylanan iade, satıcının bildirdiği teslim yöntemiyle tamamlanır. Geri ödeme, ilk ödeme kanalının niteliğine göre satıcı tarafından yürütülür. Nakit veya banka transferinde satıcı, tüketiciden yalnız iade için gerekli bilgileri istemelidir."],
      },
    ],
  },
  "hesap-silme": {
    slug: "hesap-silme",
    group: "Yasal",
    title: "Hesap Silme",
    description: "Fıstık360 hesabınızı ve hesapla ilişkili kişisel verileri silme talebi oluşturma adımları.",
    notice: "Doğrulanmış hesap silme başvuru kanalı canlı yayın öncesinde bu sayfaya eklenecektir.",
    sections: [
      {
        title: "Talep nasıl oluşturulur?",
        bullets: [
          "Talebi hesabınızda kullandığınız doğrulanmış e-posta adresiyle oluşturun.",
          "Hesabın tüketici, mağaza, toptancı veya partner hesabı olduğunu belirtin.",
          "Hesabın size ait olduğunu doğrulamak için güvenli OTP veya eşdeğer kimlik doğrulama adımını tamamlayın.",
          "Doğrulama tamamlandıktan sonra talebin kapsamı ve sonuçları size bildirilir.",
        ],
      },
      {
        title: "Silme işleminin sonucu",
        paragraphs: ["Aktif oturumlar kapatılır ve hesabın platform erişimi sona erer. Mağaza, toptancı veya partner hesabına bağlı aktif satış ve başvurular önce güvenli biçimde kapatılır. Silinen hesap geri alınamayabilir."],
      },
      {
        title: "Saklanması gereken kayıtlar",
        paragraphs: ["Vergi, ticaret, tüketici, ödeme, dolandırıcılık önleme veya uyuşmazlık mevzuatı gereği belirli kayıtlar yasal süre boyunca kısıtlı erişimle saklanabilir. Süre sonunda kayıtlar silinir, yok edilir veya anonimleştirilir."],
      },
      {
        title: "Hesabı silmeden önce",
        bullets: [
          "Devam eden sipariş, iade veya destek talebinizi sonuçlandırın.",
          "İhtiyaç duyduğunuz fiş, fatura ve sipariş kayıtlarını indirin.",
          "Satıcı veya partner hesabında bekleyen sipariş ve alıcı yükümlülüklerini tamamlayın.",
        ],
      },
    ],
  },
};

export function getLegalDocument(slug: string) {
  return documents[slug as LegalDocumentSlug];
}
