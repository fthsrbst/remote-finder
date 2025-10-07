# Remote Finder - Yeni Özellikler

## ✨ Tüm Yeni Özellikler

### 1. 🖥️ Çoklu Terminal Desteği
- Birden fazla terminal açabilme
- Terminal tab sistemi
- Her terminal ayrı SSH bağlantısı
- Terminal'ler arası geçiş
- Yeni terminal butonu (+)
- Terminal tab kapatma (x)
- Performans optimize edilmiş (1000 satır scrollback, canvas renderer, throttled resize)

### 2. 💾 Kaydedilmiş Bağlantılar
- Sidebar'da "Saved Connections" bölümü
- Bağlantıları özel isimle kaydetme
- Şifre saklama opsiyonu
- Tek tıkla bağlanma
- Bağlantı silme

### 3. 🕒 Server History
- Son 10 bağlantı otomatik kaydediliyor
- Timestamp ile gösterim
- Tıklayarak formu doldurma

### 4. 📁 Gelişmiş Dosya Yönetimi
- **Çoklu Seçim**: Ctrl/Cmd + Click, Shift + Click
- **Çift Tıklama Düzeltmesi**: Artık seçim yapmıyor, sadece açıyor
- **Sürükle-Bırak**: Çoklu dosya yükleme
- **Çöp Sepeti**: Seçili dosyaları toplu silme
- **Birden Fazla Dosya Upload**: Multiple attribute ile

### 5. 🔍 Inline Quick Search
- Toolbar'da direkt arama kutusu
- Gerçek zamanlı filtreleme
- 200ms debounce ile optimize
- Ctrl/Cmd + K kısayolu
- Modal yerine inline

### 6. 🎨 Gelişmiş Arayüz
- **Katlanabilir Sidebar**: Icon-only mod
- **GitHub Linki**: Header'da GitHub profil linki
- **Kullanıcı Bilgisi**: Bağlı kullanıcı adı gösterimi
- **Saat & Tarih**: Canlı güncellenen saat ve tarih
- **Temaya Uygun Bildirimler**: Alert/confirm yerine özel tasarım
- **Sistem Teması**: Otomatik dark/light algılama

### 7. 🛠️ SFTP Araçları
- **Disk Usage**: Top 20 en büyük dosya/klasör analizi
- **Find Duplicates**: MD5 hash ile duplicate arama
- **Compress/Extract**:
  - Tar.gz, tgz, tar, zip, tar.bz2 desteği
  - Seçili dosyaları sıkıştırma
  - Archive'leri çıkarma

### 8. ⚙️ Properties & Permissions
- **Properties**: Sağ tık → Properties
  - Dosya bilgileri
  - Boyut, sahip, grup
  - Erişim & değiştirme tarihleri
  - Permissions (chmod format)

- **Permissions**: Sağ tık → Permissions
  - Chmod değiştirme (755, 644 vb.)
  - Input validation
  - Direkt SSH komutu ile uygulama

### 9. 📱 Mobil Uyumluluk
- Responsive tasarım
- Hamburger menü
- Touch-friendly butonlar
- Adaptive layout
- Mobilde gereksiz kolonlar gizleniyor

### 10. 🚀 Performans İyileştirmeleri
- **Optimized State Management**: Tek state objesi
- **Element Caching**: Tüm elementler cache'leniyor
- **Debounced Search**: 200ms debounce
- **Throttled Terminal Resize**: 100ms throttle
- **Canvas Renderer**: Terminal için canvas renderer
- **Reduced Scrollback**: 10000'den 1000'e

## 🔧 Teknik İyileştirmeler

### Kod Organizasyonu
- Modüler yapı
- Tek dosyada tüm özellikler
- Clear naming conventions
- Proper event cleanup
- Memory leak prevention

### Güvenlik
- XSS koruması
- Input validation
- Secure password storage opsiyonu
- Session management

### UX İyileştirmeleri
- 250ms double-click detection
- Keyboard shortcuts (Esc, Ctrl+K)
- Visual feedback (notifications, loading states)
- Error handling with user-friendly messages
- Consistent modal system

## 🎯 Kullanım

### Bağlantı Kaydetme
1. Servera bağlan
2. "Save Connection" modal'ı açılır
3. İsim ver (optional)
4. Şifre kaydetme seç (optional)
5. Sidebar'da görünür

### Çoklu Terminal
1. Terminal aç (sidebar → Terminal)
2. "+" butonuna tıkla (yeni terminal)
3. Tab'ler arası geçiş yap
4. "x" ile terminal kapat

### Dosya İşlemleri
- **Çoklu Seçim**: Ctrl/Cmd + Click
- **Aralık Seçim**: Shift + Click
- **Sağ Tık**: Properties, Permissions, Rename, Delete
- **Sürükle-Bırak**: Dosyaları pencereye sürükle

### Araçlar
- **Disk Usage**: Tools → Disk Usage
- **Duplicates**: Tools → Find Duplicates
- **Compress**: Dosya seç → Tools → Compress

## 🔗 GitHub
Projeye katkıda bulunmak için: [https://github.com/fthsrbst](https://github.com/fthsrbst)

## 📊 Dosya Boyutları
- **app.js**: ~51KB (optimized)
- **styles.css**: ~28KB
- **new-features.css**: ~5.8KB
- **index.html**: ~20KB
- **Toplam**: ~105KB (minified olmadan)

## 🎨 Tasarım Sistemi
- Finder-inspired interface
- macOS-like color palette
- Smooth transitions (0.15s, 0.25s)
- Consistent border-radius (6px, 10px, 14px)
- Backdrop blur effects
- Shadow elevations (sm, md, lg)
