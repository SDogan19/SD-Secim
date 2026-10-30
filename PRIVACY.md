# SD Seçim Privacy Notice / Gizlilik Bildirimi

**Version:** 0.0.3  
**Developer / Geliştirici:** Sercan Doğan  
**GitHub:** https://github.com/SDogan19/SD-Secim

## Türkçe

SD Seçim analitik, reklam, takip veya kullanıcı hesabı sistemi içermez.

### Cihazda saklanan veriler
- Araç çubuğu ve dil/tema ayarları
- Kullanıcının web sayfalarında kopyaladığı metinlerden oluşan pano geçmişi
- Kullanıcının SD Seçim ile aldığı ekran görüntüleri

Bu veriler `chrome.storage.local` içinde kullanıcının cihazında tutulur. Uzantı kaldırıldığında Chrome yerel uzantı verilerini temizler.

Parola türündeki alanlardan (`password`, `current-password`, `new-password`) seçilen/kopyalanan içerik SD Seçim pano geçmişine kaydedilmez.

### Dış hizmetlere gönderilen veriler
SD Seçim seçili içeriği yalnız kullanıcı ilgili araca bilerek tıkladığında dış hizmete aktarır:
- Google Ara: seçili metin Google aramasına gönderilir.
- Google AI Mode: seçili metin Google AI Mode giriş alanına yerleştirilir; SD Seçim sorguyu otomatik göndermez.
- Çeviri: seçili metin Google Translate hizmetine gönderilir.
- YouTube: seçili metin YouTube arama sorgusu olarak açılır.
- ChatGPT: seçili metin ChatGPT sorgusu olarak açılır.
- Google Lens: yalnız kullanıcı Lens seçeneğine bastığında seçilen ekran görüntüsü Google Lens'e yüklenir.

SD Seçim bu hizmetlerden gelen verileri kendi sunucusuna aktarmaz ve geliştiricinin bir sunucusu üzerinden yönlendirme yapmaz. İlgili hizmetlerin kendi gizlilik politikaları geçerlidir.

## English

SD Seçim contains no analytics, advertising, tracking, or account system.

### Data stored on the device
- Toolbar, language and theme settings
- Clipboard-history text copied by the user on web pages
- Screenshots captured with SD Seçim

This data is stored locally in `chrome.storage.local`. Password-field content (`password`, `current-password`, `new-password`) is excluded from clipboard history.

### Data sent to external services
Selected content is sent or inserted into an external service only after the user explicitly chooses that tool: Google Search, Google AI Mode, Google Translate, YouTube, ChatGPT, or Google Lens. SD Seçim does not operate a relay server and does not send this content to the developer.
