chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== "install") return;
  const { sd_settings } = await chrome.storage.local.get("sd_settings");
  if (sd_settings) return;
  await chrome.storage.local.set({
    sd_settings: {
      uiLang: "auto",
      theme: "light",
      sourceLang: "auto",
      targetLang: "tr",
      buttons: { search: true, ai: true, copy: true, clipboard: false, settings: false, translate: false, youtube: false, chatgpt: false },
      buttonOrder: ["search", "ai", "copy", "clipboard", "settings", "translate", "youtube", "chatgpt"],
      historyLimit: 25,
      layoutVersion: 4
    }
  });
});

const isRestrictedUrl = (url = "") => /^(?:chrome|chrome-extension|edge|about|devtools|view-source):/i.test(url);

async function startScreenshotForTab(tab) {
  if (!tab || !tab.id) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs && tabs[0];
    } catch (_) {}
  }
  if (!tab || !tab.id) return false;
  const url = tab.url || "";
  if (!url || isRestrictedUrl(url)) {
    console.warn("Internal system page.");
    return false;
  }

  try {
    // Eklenti simgesinin ait olduğu pencereyi açıkça kullan.
    // Böylece çoklu pencere / odak değişimlerinde yanlış sekme yakalanmaz.
    const captureWindowId = Number.isInteger(tab.windowId) ? tab.windowId : undefined;
    const { sd_settings = {} } = await chrome.storage.local.get("sd_settings");
    const uiLang = sd_settings.uiLang === "tr" || sd_settings.uiLang === "en" ? sd_settings.uiLang : ((chrome.i18n.getUILanguage() || "en").toLowerCase().startsWith("tr") ? "tr" : "en");
    const dataUrl = await chrome.tabs.captureVisibleTab(captureWindowId, { format: "png" });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runCropOverlay,
      args: [dataUrl, uiLang]
    });
    return true;
  } catch (e) {
    console.warn("Capture error:", e?.message || e);
    return false;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  // Araç çubuğundaki SD Seçim simgesine tıklamak daima ekran görüntüsünü başlatır.
  await startScreenshotForTab(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-settings") {
    if (chrome.runtime.openOptionsPage) {
      await chrome.runtime.openOptionsPage();
    } else {
      await chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    }
    return;
  }

  if (command === "take-screenshot") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await startScreenshotForTab(tab);
    } catch (e) {
      console.warn("Shortcut capture error:", e?.message || e);
    }
  }
});


async function waitForTabReady(tabId, timeoutMs = 15000) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") return true;
  } catch (_) {}
  return new Promise((resolve) => {
    let done = false;
    let timer = null;
    const finish = (ok) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(ok);
    };
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") finish(true);
    };
    chrome.tabs.onUpdated.addListener(listener);
    timer = setTimeout(() => finish(false), timeoutMs);
  });
}

// Google AI Mode giriş alanına metin yerleştirme.
// URL üzerinden q= parametresi göndermez ve sorguyu otomatik olarak göndermez.
function installAiModeAutofill(text) {
  if (!text || window.__sdAiModeAutofillActive) return false;
  window.__sdAiModeAutofillActive = true;

  const wanted = String(text);
  const started = Date.now();
  const MAX_MS = 20000;

  const visible = (el) => {
    try {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 120 && r.height > 20 && r.bottom > 0 && r.top < innerHeight && st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity || 1) > 0;
    } catch { return false; }
  };

  const candidateSelector = [
    'textarea',
    'input[type="text"]',
    'input[type="search"]',
    'input:not([type])',
    '[contenteditable="true"]',
    '[role="textbox"]'
  ].join(',');

  const candidateElements = () => {
    try { return Array.from(document.querySelectorAll(candidateSelector)); }
    catch { return []; }
  };

  const labelOf = (el) => [
    el.getAttribute?.('placeholder'), el.getAttribute?.('aria-label'), el.getAttribute?.('data-placeholder'),
    el.getAttribute?.('name'), el.getAttribute?.('role'), el.getAttribute?.('class'), el.id
  ].filter(Boolean).join(' ').toLowerCase();

  const score = (el) => {
    if (!visible(el)) return -9999;
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.getAttribute?.('type') || '').toLowerCase();
    const label = labelOf(el);
    let n = 0;
    if (tag === 'textarea') n += 80;
    if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') n += 75;
    if (el.getAttribute?.('role') === 'textbox') n += 60;
    if (el.getAttribute?.('aria-multiline') === 'true') n += 45;
    if (/soru|ask|prompt|anything|ai mode|gemini|mesaj|message/.test(label)) n += 180;
    if (/search|ara/.test(label)) n -= 45;
    if (tag === 'input' && (type === 'search' || el.getAttribute?.('name') === 'q')) n -= 180;
    try {
      const r = el.getBoundingClientRect();
      if (r.width > 300) n += 25;
      if (r.height > 40) n += 20;
      if (r.top > innerHeight * 0.20) n += 15;
    } catch {}
    try {
      if (el.closest('header, nav, [role="navigation"]')) n -= 70;
    } catch {}
    return n;
  };

  const getCandidates = () => candidateElements()
    .map(el => ({ el, score: score(el) }))
    .filter(x => x.score >= 70)
    .sort((a,b) => b.score - a.score);

  const currentText = (el) => {
    if ('value' in el && typeof el.value === 'string') return el.value;
    return el.innerText || el.textContent || '';
  };

  const dispatchInput = (el) => {
    try { el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: wanted })); } catch {}
    try { el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: wanted })); }
    catch { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch {} }
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
  };

  const write = (el) => {
    try {
      el.scrollIntoView?.({ block: 'center', inline: 'nearest' });
      el.click?.();
      el.focus?.({ preventScroll: true });
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'textarea' || tag === 'input') {
        const proto = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, wanted); else el.value = wanted;
        dispatchInput(el);
        try { el.setSelectionRange(wanted.length, wanted.length); } catch {}
      } else {
        const sel = getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
        let ok = false;
        try { ok = document.execCommand('insertText', false, wanted); } catch {}
        if (!ok || !currentText(el).trim()) {
          // Bazı Google editörleri execCommand yerine DOM + input olayı bekliyor.
          el.textContent = wanted;
        }
        dispatchInput(el);
        const end = document.createRange();
        end.selectNodeContents(el);
        end.collapse(false);
        sel.removeAllRanges();
        sel.addRange(end);
      }
      return true;
    } catch { return false; }
  };

  const verify = (el) => {
    const actual = currentText(el).replace(/\s+/g, ' ').trim();
    const target = wanted.replace(/\s+/g, ' ').trim();
    return actual === target || actual.includes(target);
  };

  const attempt = () => {
    if (Date.now() - started > MAX_MS) {
      clearInterval(timer);
      window.__sdAiModeAutofillActive = false;
      return;
    }
    const candidates = getCandidates();
    for (const { el } of candidates.slice(0, 6)) {
      if (verify(el)) {
        clearInterval(timer);
        window.__sdAiModeAutofillActive = false;
        return;
      }
      if (!write(el)) continue;
      setTimeout(() => {
        if (verify(el)) {
          clearInterval(timer);
          window.__sdAiModeAutofillActive = false;
        }
      }, 120);
      // En yüksek puanlı adayı önce dene; Google state güncellemesi için kısa süre ver.
      break;
    }
  };

  const timer = setInterval(attempt, 350);
  attempt();
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const aiText = message?.action === "openAiMode" && typeof message.text === "string" ? message.text.trim() : "";
  if (aiText) {
    (async () => {
      try {
        const tab = await chrome.tabs.create({ url: "https://www.google.com/search?udm=50&aep=11", active: true });
        if (!tab?.id) throw new Error("AI Mode tab could not be opened");
        await waitForTabReady(tab.id, 15000);
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: installAiModeAutofill,
          args: [aiText]
        });
        sendResponse({ ok: true, tabId: tab.id });
      } catch (e) {
        console.warn("AI Mode open/fill error:", e?.message || e);
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true;
  }

  if (message.action === "takeScreenshot") {
    (async () => {
      try {
        let tab = sender && sender.tab ? sender.tab : null;
        if (!tab) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          tab = tabs && tabs[0];
        }
        const ok = await startScreenshotForTab(tab);
        sendResponse({ ok });
      } catch (e) {
        console.warn("Screenshot message error:", e?.message || e);
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true;
  }

  if (message.action === "openOptions") {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    }
    return;
  }

  if (message?.action === "saveImageHistory" && typeof message.dataUrl === "string" && message.dataUrl.startsWith("data:image/png;base64,")) {
    (async () => {
      try {
        const [{ sd_clipboard_history = [] }, { sd_settings = {} }] = await Promise.all([
          chrome.storage.local.get("sd_clipboard_history"),
          chrome.storage.local.get("sd_settings")
        ]);
        const now = Date.now();
        const allowedLimits = [10, 25, 50, 100];
        const historyLimit = allowedLimits.includes(Number(sd_settings.historyLimit)) ? Number(sd_settings.historyLimit) : 25;
        let updated = sd_clipboard_history.slice();
        const name = new Date(now).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
        updated.unshift({ type: "image", data: message.dataUrl, name, timestamp: now, pinned: false, id: "img_" + now });
        if (updated.length > historyLimit) updated = updated.slice(0, historyLimit);
        await chrome.storage.local.set({ sd_clipboard_history: updated });
        sendResponse({ ok: true, name });
      } catch (e) {
        console.warn("Image history save error:", e && e.message ? e.message : e);
        sendResponse({ ok: false, error: e && e.message ? e.message : String(e) });
      }
    })();
    return true;
  }

  // Kırpılmış görüntüyü Google Lens'e gönder
  if (message?.action === "openLens" && typeof message.dataUrl === "string" && message.dataUrl.startsWith("data:image/png;base64,")) {
    (async () => {
      const key = "lens_" + Date.now();
      try {
        const store = chrome.storage.session || chrome.storage.local;
        await store.set({ [key]: message.dataUrl });
        await chrome.tabs.create({
          url: chrome.runtime.getURL("lens.html") + "#" + key,
          active: true
        });
        sendResponse({ ok: true });
      } catch (e) {
        console.warn("Lens error:", e.message);
        await chrome.tabs.create({ url: "https://lens.google.com/", active: true });
        sendResponse({ ok: false });
      }
    })();
    return true; // asenkron yanıt
  }
});

// NOT: executeScript yalnızca bu fonksiyonu sayfaya serileştirip gönderir.
// Bu yüzden bildirim dahil gereken her şey fonksiyonun İÇİNDE olmalıdır.
function runCropOverlay(dataUrl, uiLang = "en") {
  if (window.__sdScreenshotActive) return;
  window.__sdScreenshotActive = true;
  const tr = uiLang === "tr";
  const L = {
    titleOk: tr ? "✓ Ekran Görüntüsü Alındı!" : "✓ Screenshot Captured!",
    titleWarn: tr ? "⚠ Ekran Görüntüsü Alındı" : "⚠ Screenshot Captured",
    copiedStored: tr ? "Panoya kopyalandı · Geçmiş: " : "Copied to clipboard · History: ",
    copiedNoStore: tr ? "Panoya kopyalandı · Geçmişe kaydedilemedi" : "Copied to clipboard · Could not save to history",
    stored: tr ? "Geçmişe kaydedildi: " : "Saved to history: ",
    failed: tr ? "Panoya ve geçmişe kaydedilemedi" : "Could not copy or save to history",
    saved: tr ? "kaydedildi" : "saved", close: tr ? "Kapat" : "Close", lens: tr ? "🔍 Google Lens'te Ara" : "🔍 Search with Google Lens"
  };

  const img = new Image();
  img.src = dataUrl;
  img.onerror = () => { window.__sdScreenshotActive = false; };
  img.onload = () => {
    const overlay = document.createElement("div");
    overlay.id = "sd-screenshot-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "2147483647",
      cursor: "crosshair",
      background: "rgba(0, 0, 0, 0.45)",
      userSelect: "none"
    });

    const selectionBox = document.createElement("div");
    Object.assign(selectionBox.style, {
      position: "absolute",
      boxSizing: "border-box",
      border: "2px dashed #3b82f6",
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
      display: "none",
      pointerEvents: "none"
    });
    overlay.appendChild(selectionBox);

    const sizeBadge = document.createElement("div");
    sizeBadge.id = "sd-screenshot-size-badge";
    Object.assign(sizeBadge.style, {
      position: "absolute",
      zIndex: "2147483647",
      display: "none",
      pointerEvents: "none",
      padding: "4px 7px",
      borderRadius: "6px",
      background: "rgba(15, 23, 42, 0.92)",
      color: "#ffffff",
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
      font: "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      lineHeight: "1",
      whiteSpace: "nowrap",
      userSelect: "none"
    });
    overlay.appendChild(sizeBadge);

    const scaleX = img.naturalWidth / window.innerWidth;
    const scaleY = img.naturalHeight / window.innerHeight;

    const updateSizeBadge = (left, top, width, height) => {
      const pixelWidth = Math.max(0, Math.round(width * scaleX));
      const pixelHeight = Math.max(0, Math.round(height * scaleY));
      sizeBadge.textContent = `${pixelWidth} × ${pixelHeight} px`;
      sizeBadge.style.display = "block";

      const badgeWidth = sizeBadge.offsetWidth || 90;
      const badgeHeight = sizeBadge.offsetHeight || 24;
      let badgeLeft = left;
      let badgeTop = top - badgeHeight - 6;
      if (badgeTop < 6) badgeTop = top + height + 6;
      if (badgeTop + badgeHeight > window.innerHeight - 6) badgeTop = Math.max(6, window.innerHeight - badgeHeight - 6);
      if (badgeLeft + badgeWidth > window.innerWidth - 6) badgeLeft = Math.max(6, window.innerWidth - badgeWidth - 6);
      sizeBadge.style.left = Math.max(6, badgeLeft) + "px";
      sizeBadge.style.top = Math.max(6, badgeTop) + "px";
    };

    let startX = 0, startY = 0, curX = 0, curY = 0, isSelecting = false;

    const cleanup = () => {
      overlay.remove();
      window.__sdScreenshotActive = false;
      document.removeEventListener("keydown", onKeyDown, true);
    };
    // Görüntüyü eklenti arka planında pano geçmişine kaydet.
    const saveImageToHistory = async (croppedDataUrl) => {
      try {
        const result = await chrome.runtime.sendMessage({ action: "saveImageHistory", dataUrl: croppedDataUrl });
        return result || { ok: false };
      } catch (e) {
        console.error("History message error:", e);
        return { ok: false, error: e?.message || String(e) };
      }
    };

    // ---- Sade bildirim kutusu ----
    const showNotification = (copied, stored, blob, historyName) => {
      const old = document.getElementById("sdSimpleNotification");
      if (old) old.remove();

      const box = document.createElement("div");
      box.id = "sdSimpleNotification";
      Object.assign(box.style, {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: "2147483647",
        background: "#0f172a",
        color: "#ffffff",
        padding: "14px 16px",
        borderRadius: "10px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.15)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: "13px",
        lineHeight: "1.4",
        minWidth: "230px",
        boxSizing: "border-box",
        userSelect: "none"
      });

      let timer = null;
      const close = () => {
        clearTimeout(timer);
        box.remove();
      };

      const head = document.createElement("div");
      Object.assign(head.style, { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px" });

      const texts = document.createElement("div");
      const title = document.createElement("div");
      title.textContent = (copied && stored) ? L.titleOk : L.titleWarn;
      Object.assign(title.style, { fontWeight: "600", color: (copied && stored) ? "#10b981" : "#f59e0b" });
      const sub = document.createElement("div");
      sub.textContent = copied && stored
        ? `${L.copiedStored}${historyName || L.saved}`
        : copied
          ? L.copiedNoStore
          : stored
            ? `${L.stored}${historyName || ""}`
            : L.failed;
      Object.assign(sub.style, { fontSize: "12px", color: "#cbd5e1", marginTop: "2px" });
      texts.append(title, sub);

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "✕";
      closeBtn.title = L.close;
      Object.assign(closeBtn.style, {
        border: "0", background: "transparent", color: "#94a3b8", cursor: "pointer",
        fontSize: "14px", padding: "0", lineHeight: "1", font: "inherit"
      });
      closeBtn.addEventListener("mouseenter", () => closeBtn.style.color = "#ffffff");
      closeBtn.addEventListener("mouseleave", () => closeBtn.style.color = "#94a3b8");
      closeBtn.addEventListener("click", close);
      head.append(texts, closeBtn);

      const lensBtn = document.createElement("button");
      lensBtn.type = "button";
      lensBtn.textContent = L.lens;
      Object.assign(lensBtn.style, {
        marginTop: "10px", width: "100%", border: "0", borderRadius: "7px",
        padding: "8px 10px", background: "#3b82f6", color: "#ffffff",
        cursor: "pointer", fontSize: "13px", fontWeight: "600",
        fontFamily: "inherit"
      });
      lensBtn.addEventListener("mouseenter", () => lensBtn.style.background = "#2563eb");
      lensBtn.addEventListener("mouseleave", () => lensBtn.style.background = "#3b82f6");
      lensBtn.addEventListener("click", () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({ action: "openLens", dataUrl: reader.result });
          close();
        };
        reader.readAsDataURL(blob);
      });

      box.append(head, lensBtn);
      (document.body || document.documentElement).appendChild(box);

      // 5 saniye sonra otomatik kapan
      timer = setTimeout(close, 5000);
    };

    // ---- Kırp + panoya kopyala ----
    const copyAndNotify = (rect) => {
      const sx = Math.round(rect.left * scaleX);
      const sy = Math.round(rect.top * scaleY);
      const sw = Math.max(1, Math.round(rect.width * scaleX));
      const sh = Math.max(1, Math.round(rect.height * scaleY));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const croppedDataUrl = canvas.toDataURL("image/png");

      canvas.toBlob(async (blob) => {
        if (!blob) { cleanup(); return; }
        let copied = false;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          copied = true;
        } catch (err) {
          console.error("Clipboard Error:", err);
        }
        const historyResult = await saveImageToHistory(croppedDataUrl);
        const stored = !!historyResult?.ok;
        cleanup();
        showNotification(copied, stored, blob, historyResult?.name);
      }, "image/png");
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isSelecting = true;
      startX = curX = e.clientX;
      startY = curY = e.clientY;
      Object.assign(selectionBox.style, {
        left: startX + "px", top: startY + "px", width: "0px", height: "0px", display: "block"
      });
      updateSizeBadge(startX, startY, 0, 0);
    };

    const onMouseMove = (e) => {
      if (!isSelecting) return;
      curX = e.clientX;
      curY = e.clientY;
      const left = Math.min(startX, curX);
      const top = Math.min(startY, curY);
      const width = Math.abs(curX - startX);
      const height = Math.abs(curY - startY);
      selectionBox.style.left = left + "px";
      selectionBox.style.top = top + "px";
      selectionBox.style.width = width + "px";
      selectionBox.style.height = height + "px";
      updateSizeBadge(left, top, width, height);
    };

    // Fare bırakıldığı an otomatik kopyala
    const onMouseUp = (e) => {
      if (!isSelecting) return;
      isSelecting = false;
      curX = e.clientX;
      curY = e.clientY;
      const rect = {
        left: Math.min(startX, curX),
        top: Math.min(startY, curY),
        width: Math.abs(curX - startX),
        height: Math.abs(curY - startY)
      };
      if (rect.width < 15 || rect.height < 15) {
        selectionBox.style.display = "none";
        sizeBadge.style.display = "none";
        return;
      }
      copyAndNotify(rect);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") cleanup();
    };

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown, true);
    (document.body || document.documentElement).appendChild(overlay);
  };
}
