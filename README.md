# SD Seçim v0.0.1

**Geliştirici / Developer:** Sercan Doğan  
**GitHub:** https://github.com/sercandogan19

SD Seçim, Chrome için açık kaynaklı; seçili metin araçları, ekran görüntüsü ve yerel pano geçmişi sunan hafif bir uzantıdır.

## Varsayılan araç çubuğu

İlk kurulumda şu sıra açık gelir:

**Google Ara → AI Mode → Kopyala**

Pano Geçmişi, Ayarlar, Çeviri, YouTube ve ChatGPT araçları Ayarlar sayfasından açılıp kapatılabilir ve sürükle-bırak ile sıralanabilir.

## Temel özellikler

- Seçili metni kopyalama ve Google'da arama
- Google AI Mode sayfasını açıp seçili metni giriş alanına yerleştirme; otomatik gönderme yapılmaz
- İsteğe bağlı Google Translate, YouTube ve ChatGPT araçları
- Web sayfalarında kopyalanan metinleri yerel pano geçmişine otomatik kaydetme
- Aynı metin yeniden kopyalandığında yeni kayıt oluşturmak yerine en üste taşıma
- Pano geçmişinde 10 / 25 / 50 / 100 kayıt limiti
- Ekran görüntülerini panoya ve pano geçmişine kaydetme
- Ekran görüntüsü seçimi sırasında gerçek PNG piksel ölçüsünü gösterme
- Google Lens ile isteğe bağlı görsel arama
- Türkçe / English / Otomatik arayüz dili
- Açık / koyu tema

## Klavye kısayolları

- **Ekran görüntüsü:** macOS `Command+Shift+S` — Windows/Linux `Ctrl+Shift+S`
- **Ayarlar:** macOS `Command+Shift+A` — Windows/Linux `Ctrl+Shift+A`

Kısayollar `chrome://extensions/shortcuts` sayfasından değiştirilebilir.

## Ekran görüntüsü

Uzantı simgesine tıklamak veya ekran görüntüsü kısayolunu kullanmak alan seçimini başlatır. Seçim sırasında kaydedilecek PNG'nin gerçek piksel boyutu görünür. Görüntü panoya kopyalanır ve yerel pano geçmişine eklenir. Geçmişteki görünen adı `HH:MM` biçimindedir.

## Gizlilik ve güvenlik

- Analitik, reklam veya izleme kodu yoktur.
- Pano geçmişi ve ekran görüntüleri cihazdaki `chrome.storage.local` alanında tutulur.
- Parola alanlarından seçilen/kopyalanan içerik pano geçmişine alınmaz.
- Seçili metin yalnızca kullanıcı ilgili aracı tıkladığında Google, Google AI Mode, Google Translate, YouTube veya ChatGPT sayfasına aktarılır.
- Görsel yalnızca kullanıcı **Google Lens'te Ara** seçeneğini kullandığında Google Lens'e gönderilir.
- Uzak sunucudan JavaScript yüklenmez; Manifest V3 Content Security Policy kullanılır.

Daha ayrıntılı bilgi için `PRIVACY.md` dosyasına bakın.

## Kurulum

1. ZIP dosyasını çıkartın.
2. Chrome'da `chrome://extensions` adresini açın.
3. **Geliştirici modu**nu açın.
4. **Paketlenmemiş öğe yükle** seçeneğiyle klasörü seçin.
5. Açık web sayfalarını yenileyin.

## English

SD Seçim is a lightweight open-source Chrome extension for selected-text actions, screenshots and local clipboard history. The UI supports **Automatic**, **Türkçe** and **English**. Clipboard history stays on the device; external services receive selected content only when the user explicitly chooses the corresponding tool.

## License

MIT License — see `LICENSE`.
