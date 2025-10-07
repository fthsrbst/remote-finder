# sshGui

Modern ve minimal bir web tabanlı SFTP istemcisi. SSH/SFTP bağlantıları üzerinden dosya yönetimi yapmak için kullanıcı dostu bir arayüz sunar.

## 🚀 Özellikler

- 🔐 **Güvenli Bağlantı**: Şifre veya SSH private key ile bağlantı desteği
- 📁 **Dosya Yönetimi**: Dizin gezinme, dosya/klasör oluşturma, silme, yeniden adlandırma
- 📝 **Metin Editörü**: 2MB'a kadar dosyaları doğrudan tarayıcıda düzenleme
- ⬆️⬇️ **Dosya Transferi**: Dosya yükleme ve indirme desteği (1GB'a kadar)
- ⭐ **Favoriler**: Sık kullanılan dizinleri kaydetme
- 💾 **Bağlantı Profilleri**: Bağlantı bilgilerini kaydetme ve yönetme
- 🎨 **Tema Desteği**: Açık/koyu tema seçeneği
- 🧭 **Gelişmiş Navigasyon**: Breadcrumb navigasyonu, ileri/geri gezinme
- ⚡ **Hızlı ve Hafif**: Minimal bağımlılıklarla optimize edilmiş performans

## 📋 Gereksinimler

- Node.js 16.x veya üzeri
- npm veya yarn

## 🛠️ Kurulum

```bash
# Projeyi klonlayın
git clone https://github.com/fthsrbst/sshGui.git
cd sshGui

# Bağımlılıkları yükleyin
npm install

# Sunucuyu başlatın
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

## 📖 Kullanım

1. Tarayıcınızda `http://localhost:3000` adresine gidin
2. Sol panelden bağlantı bilgilerinizi girin:
   - **Host**: SSH sunucu adresi
   - **Port**: SSH port numarası (varsayılan: 22)
   - **Username**: Kullanıcı adı
   - **Password** veya **Private Key**: Kimlik doğrulama yönteminizi seçin
3. **Connect** butonuna tıklayın
4. Bağlantı başarılı olduktan sonra dosya sisteminde gezinmeye başlayabilirsiniz

### Bağlantı Profilleri

Sık kullanılan bağlantılarınızı kaydedebilir ve tek tıklama ile bağlanabilirsiniz. Profiller tarayıcınızın localStorage'ında saklanır.

### Favoriler

Sık eriştiğiniz dizinleri favorilerinize ekleyerek hızlı erişim sağlayabilirsiniz.

## 🔧 Teknolojiler

### Backend
- **Express**: Web framework
- **ssh2-sftp-client**: SFTP bağlantı yönetimi
- **multer**: Dosya yükleme işlemleri
- **uuid**: Session token oluşturma

### Frontend
- **Vanilla JavaScript**: Sade ve hızlı
- **CSS3**: Modern ve responsive tasarım
- **LocalStorage**: Profil ve favori yönetimi

## 🌍 API Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/connect` | POST | SFTP bağlantısı oluşturma |
| `/api/disconnect` | POST | Bağlantıyı sonlandırma |
| `/api/list` | GET | Dizin içeriğini listeleme |
| `/api/stat` | GET | Dosya/dizin bilgisi alma |
| `/api/mkdir` | POST | Yeni dizin oluşturma |
| `/api/rename` | POST | Dosya/dizin yeniden adlandırma |
| `/api/delete` | POST | Dosya/dizin silme |
| `/api/read` | GET | Dosya içeriğini okuma (max 2MB) |
| `/api/write` | POST | Dosyaya yazma |
| `/api/touch` | POST | Yeni dosya oluşturma |
| `/api/download` | GET | Dosya indirme |
| `/api/upload` | POST | Dosya yükleme (max 1GB) |
| `/api/health` | GET | Sunucu durumu |

## 🔒 Güvenlik

- Bağlantı bilgileri yalnızca hafızada tutulur
- Session token'lar UUID ile oluşturulur
- 15 dakika işlem yapılmayan oturumlar otomatik sonlandırılır
- Private key'ler sunucuda saklanmaz

## 📝 Notlar

- Metin editörü yalnızca UTF-8 formatındaki dosyaları destekler
- Binary dosyalar düzenlenemez
- Maksimum dosya yükleme boyutu: 1GB
- Maksimum editörde düzenlenebilir dosya boyutu: 2MB

## 🤝 Katkıda Bulunma

1. Bu projeyi fork edin
2. Feature branch'i oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

ISC

## 👤 Yazar

**fthsrbst**
- GitHub: [@fthsrbst](https://github.com/fthsrbst)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
