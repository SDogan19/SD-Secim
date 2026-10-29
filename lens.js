(async () => {
  const msg = document.getElementById("msg");
  const fallback = () => {
    const tr=(navigator.language||'en').toLowerCase().startsWith('tr');
    msg.replaceChildren();
    msg.append(document.createTextNode(tr ? 'Otomatik gönderilemedi. Görüntü panoda; ' : 'Automatic upload failed. The image is in your clipboard; paste it with Ctrl+V at '));
    const link=document.createElement('a');
    link.href='https://lens.google.com/';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.textContent='lens.google.com';
    msg.append(link, document.createTextNode(tr ? ' sayfasında Ctrl+V ile yapıştırabilirsiniz.' : '.'));
  };
  try {
    const key = location.hash.slice(1);
    const store = chrome.storage.session || chrome.storage.local;
    let data = (await store.get(key))[key];
    if (!data && store !== chrome.storage.local) data = (await chrome.storage.local.get(key))[key];
    if (!data) return fallback();
    await store.remove(key);

    const blob = await (await fetch(data)).blob();
    const file = new File([blob], "screenshot.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://lens.google.com/v3/upload?ep=ccm&s=&st=" + Date.now();
    form.enctype = "multipart/form-data";
    const input = document.createElement("input");
    input.type = "file";
    input.name = "encoded_image";
    input.files = dt.files;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  } catch (e) {
    console.warn("Lens upload error:", e);
    fallback();
  }
})();
