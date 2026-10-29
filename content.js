(() => {
  if (window.__quickSelectionToolsAIModeLoaded) return;
  window.__quickSelectionToolsAIModeLoaded = true;

  let menu = null;
  let historyMenu = null;
  let translatePanel = null;

  const DEFAULT_HISTORY_LIMIT = 25;

  const removeMenu = () => {
    if (menu) { menu.remove(); menu = null; }
    if (historyMenu) { historyMenu.remove(); historyMenu = null; }
    if (translatePanel) { translatePanel.remove(); translatePanel = null; }
  };

  const getSettings = async () => {
    const defaultOrder = ["search", "ai", "copy", "clipboard", "settings", "translate", "youtube", "chatgpt"];
    const simpleDefaults = { copy: true, search: true, ai: true, clipboard: false, settings: false, translate: false, youtube: false, chatgpt: false };
    if (!chrome.storage?.local) return { uiLang: "auto", theme: "light", sourceLang: "auto", targetLang: "tr", buttons: simpleDefaults, buttonOrder: defaultOrder, historyLimit: DEFAULT_HISTORY_LIMIT };
    try {
      const { sd_settings = {} } = await chrome.storage.local.get("sd_settings");
      let order = Array.isArray(sd_settings.buttonOrder) ? sd_settings.buttonOrder.filter(k => defaultOrder.includes(k)) : defaultOrder.slice();
      for (const k of defaultOrder) if (!order.includes(k)) order.push(k);
      const migrated = {
        uiLang: sd_settings.uiLang || "auto",
        theme: sd_settings.theme || "light",
        sourceLang: sd_settings.sourceLang || "auto",
        targetLang: sd_settings.targetLang || "tr",
        buttons: { ...simpleDefaults, ...(sd_settings.buttons || {}) },
        buttonOrder: order,
        historyLimit: [10, 25, 50, 100].includes(Number(sd_settings.historyLimit)) ? Number(sd_settings.historyLimit) : DEFAULT_HISTORY_LIMIT,
        layoutVersion: 4
      };
      if (sd_settings.layoutVersion !== 4 || !Array.isArray(sd_settings.buttonOrder)) {
        await chrome.storage.local.set({ sd_settings: migrated });
      }
      return migrated;
    } catch {
      return { uiLang: "auto", theme: "light", sourceLang: "auto", targetLang: "tr", buttons: simpleDefaults, buttonOrder: defaultOrder, historyLimit: DEFAULT_HISTORY_LIMIT };
    }
  };

  const UI = {
    tr: { translating:"Çeviriliyor...", translation:"Çeviri", translateFailed:"Çeviri yapılamadı. Google Translate'i açın.", history:"📋 Pano Geçmişi", clear:"🗑 Temizle", clearTitle:"Favoriler hariç tüm pano geçmişini temizler", empty:"Henüz kopyalanmış geçmiş yok.", image:"🖼 Ekran Görüntüsü", unpin:"Sabitlemeyi Kaldır", pin:"Favorilere Sabitle (Silinmesini Engeller)", copy:"Kopyala", search:"Google'da Ara", ai:"Google AI Mode ile Ara", translate:"Çeviri Yap", clipboard:"Pano Geçmişi", youtube:"YouTube'da Ara", chatgpt:"ChatGPT ile Sor", settings:"Ayarlar" },
    en: { translating:"Translating...", translation:"Translation", translateFailed:"Translation failed. Open Google Translate.", history:"📋 Clipboard History", clear:"🗑 Clear", clearTitle:"Clear all clipboard history except pinned items", empty:"Clipboard history is empty.", image:"🖼 Screenshot", unpin:"Unpin", pin:"Pin to favorites (prevents deletion)", copy:"Copy", search:"Search Google", ai:"Search with Google AI Mode", translate:"Translate", clipboard:"Clipboard History", youtube:"Search YouTube", chatgpt:"Ask ChatGPT", settings:"Settings" }
  };
  const resolveUiLang = settings => { const v=settings?.uiLang; if(v==="tr"||v==="en") return v; return (navigator.language||"en").toLowerCase().startsWith("tr")?"tr":"en"; };
  const uiText = (settings,key) => UI[resolveUiLang(settings)]?.[key] || UI.en[key] || key;


  const saveToHistory = async (text) => {
    text = (text || "").trim();
    if (!text || !chrome.storage?.local) return;
    try {
      const [{ sd_clipboard_history = [] }, { sd_settings = {} }] = await Promise.all([
        chrome.storage.local.get("sd_clipboard_history"),
        chrome.storage.local.get("sd_settings")
      ]);
      const limit = [10, 25, 50, 100].includes(Number(sd_settings.historyLimit)) ? Number(sd_settings.historyLimit) : DEFAULT_HISTORY_LIMIT;
      const now = Date.now();
      let updated = sd_clipboard_history.filter(item => item.type !== "text" || item.text !== text);
      updated.unshift({ type: "text", text, timestamp: now, pinned: false, id: "txt_" + now });
      if (updated.length > limit) updated = updated.slice(0, limit);
      await chrome.storage.local.set({ sd_clipboard_history: updated });
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const getHistory = async () => {
    if (!chrome.storage?.local) return [];
    try {
      const { sd_clipboard_history = [] } = await chrome.storage.local.get("sd_clipboard_history");
      return sd_clipboard_history;
    } catch {
      return [];
    }
  };

  const selectedText = () => {
    const active = document.activeElement;
    if (active?.tagName === "INPUT") {
      const type = (active.type || "text").toLowerCase();
      const autocomplete = (active.autocomplete || "").toLowerCase();
      // Parola alanlarını hiçbir zaman araç çubuğuna veya pano geçmişine alma.
      if (type === "password" || autocomplete === "current-password" || autocomplete === "new-password") return "";
      if (/^(text|search|url|email|tel)$/i.test(type)) {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (start != null && end != null && end > start) return active.value.slice(start, end).trim();
      }
    } else if (active?.tagName === "TEXTAREA") {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      if (start != null && end != null && end > start) return active.value.slice(start, end).trim();
    }
    return (window.getSelection()?.toString() || "").trim();
  };

  const ICONS = {
    copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    google: `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`,
    ai: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#8b5cf6"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>`,
    translate: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M5 8l6 6M4 14l6-6 2 2M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6"/></svg>`,
    clipboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    youtube: `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    chatgpt: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10a37f" stroke-width="2.2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path></svg>`,
    settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
  };

  const makeIconButton = (iconSvg, title, action, isDark) => {
    const button = document.createElement("button");
    button.type = "button";
    button.title = title;
    button.innerHTML = iconSvg;
    button.setAttribute("data-sd-element", "true");
    
    Object.assign(button.style, {
      boxSizing: "border-box",
      border: "0",
      borderRadius: "7px",
      padding: "0",
      width: "26px",
      height: "26px",
      background: isDark ? "#334155" : "#f4f5f7",
      color: isDark ? "#f8fafc" : "#1e293b",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.15s ease"
    });
    button.addEventListener("mouseenter", () => button.style.background = isDark ? "#475569" : "#e2e8f0");
    button.addEventListener("mouseleave", () => button.style.background = isDark ? "#334155" : "#f4f5f7");
    button.addEventListener("mousedown", event => event.preventDefault());
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      action(button);
    });
    return button;
  };

  const showTranslateInline = async (text, anchorBtn, sourceLang, targetLang, isDark, settings) => {
    if (translatePanel) translatePanel.remove();
    translatePanel = document.createElement("div");
    translatePanel.setAttribute("data-sd-element", "true");
    Object.assign(translatePanel.style, {
      position: "fixed",
      zIndex: "2147483647",
      padding: "10px 12px",
      maxWidth: "260px",
      borderRadius: "10px",
      background: isDark ? "#1e293b" : "#ffffff",
      color: isDark ? "#f8fafc" : "#0f172a",
      border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      font: "12px -apple-system, sans-serif"
    });
    translatePanel.textContent = uiText(settings, "translating");
    (document.body || document.documentElement).appendChild(translatePanel);
    const rect = anchorBtn.getBoundingClientRect();
    translatePanel.style.left = Math.max(8, rect.left) + "px";
    translatePanel.style.top = (rect.bottom + 6) + "px";
    try {
      const sl = sourceLang || "auto";
      const tl = targetLang || "tr";
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      const translatedText = Array.isArray(data?.[0]) ? data[0].map(x => x?.[0] || "").join("") : "";
      if (!translatedText) throw new Error("Empty translation");

      // Uzak servisten gelen metni innerHTML ile basma; DOM düğümleri ve textContent kullan.
      translatePanel.replaceChildren();
      const head = document.createElement("div");
      Object.assign(head.style, {
        fontWeight: "600", marginBottom: "4px", color: "#2563eb",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px"
      });
      const title = document.createElement("span");
      title.textContent = `${uiText(settings, "translation")} (${sl.toUpperCase()} ➔ ${tl.toUpperCase()}):`;
      const link = document.createElement("a");
      const params = new URLSearchParams({ sl, tl, text });
      link.href = `https://translate.google.com/?${params.toString()}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Google Translate ↗";
      Object.assign(link.style, { color: "#0284c7", textDecoration: "none", fontSize: "11px", whiteSpace: "nowrap" });
      head.append(title, link);

      const body = document.createElement("div");
      body.style.lineHeight = "1.4";
      body.textContent = translatedText;
      translatePanel.append(head, body);
    } catch {
      translatePanel.textContent = uiText(settings, "translateFailed");
    }
  };

  const showClipboardHistoryMenu = async (anchorButton, settings) => {
    if (historyMenu) {
      historyMenu.remove();
      historyMenu = null;
      return;
    }
    const isDark = settings.theme === "dark";
    let historyItems = await getHistory();
    historyMenu = document.createElement("div");
    historyMenu.setAttribute("data-sd-element", "true");
    Object.assign(historyMenu.style, {
      position: "fixed",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      padding: "10px",
      width: "260px",
      maxHeight: "320px",
      overflowY: "auto",
      overscrollBehavior: "contain",
      border: isDark ? "1px solid #334155" : "1px solid rgba(0,0,0,.1)",
      borderRadius: "12px",
      background: isDark ? "#0f172a" : "#ffffff",
      color: isDark ? "#f8fafc" : "#0f172a",
      boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: "12px"
    });
    const header = document.createElement("div");
    Object.assign(header.style, {
      flexShrink: "0",
      fontWeight: "bold",
      color: isDark ? "#94a3b8" : "#64748b",
      paddingBottom: "6px",
      borderBottom: isDark ? "1px solid #1e293b" : "1px solid #f1f5f9",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    });
    const headerTitle = document.createElement("span");
    headerTitle.textContent = uiText(settings, "history");
    const btnClearAll = document.createElement("button");
    btnClearAll.textContent = uiText(settings, "clear");
    btnClearAll.title = uiText(settings, "clearTitle");
    Object.assign(btnClearAll.style, {
      border: "none",
      background: "#ef4444",
      color: "#ffffff",
      fontSize: "11px",
      padding: "3px 8px",
      borderRadius: "6px",
      cursor: "pointer"
    });
    btnClearAll.addEventListener("click", async (e) => {
      e.stopPropagation();
      let updated = historyItems.filter(item => item.pinned === true);
      await chrome.storage.local.set({ sd_clipboard_history: updated });
      removeMenu();
    });
    header.append(headerTitle, btnClearAll);
    historyMenu.appendChild(header);

    if (historyItems.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = uiText(settings, "empty");
      Object.assign(emptyMsg.style, { color: "#94a3b8", padding: "6px 0" });
      historyMenu.appendChild(emptyMsg);
    } else {
      historyItems.forEach((item, index) => {
        const row = document.createElement("div");
        Object.assign(row.style, {
          flexShrink: "0",
          padding: "6px 8px",
          borderRadius: "8px",
          background: isDark ? "#1e293b" : "#f8fafc",
          cursor: "pointer",
          color: isDark ? "#e2e8f0" : "#334155",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0"
        });
        const leftContainer = document.createElement("div");
        Object.assign(leftContainer.style, {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflow: "hidden"
        });
        if (item.type === "image" && typeof item.data === "string" && item.data.startsWith("data:image/png;base64,")) {
          const imgPreview = document.createElement("img");
          imgPreview.src = item.data;
          Object.assign(imgPreview.style, {
            width: "40px",
            height: "30px",
            objectFit: "cover",
            borderRadius: "4px"
          });
          const label = document.createElement("span");
          label.textContent = item.name || uiText(settings, "image");
          Object.assign(label.style, {
            fontWeight: "500",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          });
          leftContainer.append(imgPreview, label);
        } else {
          const textSpan = document.createElement("span");
          textSpan.textContent = item.type === "image" ? uiText(settings, "image") : (item.text || "");
          Object.assign(textSpan.style, {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          });
          leftContainer.appendChild(textSpan);
        }
        const btnPin = document.createElement("button");
        btnPin.textContent = item.pinned ? "📌" : "📍";
        btnPin.title = item.pinned ? uiText(settings, "unpin") : uiText(settings, "pin");
        Object.assign(btnPin.style, {
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "13px",
          padding: "2px"
        });
        btnPin.addEventListener("click", async (e) => {
          e.stopPropagation();
          historyItems[index].pinned = !historyItems[index].pinned;
          await chrome.storage.local.set({ sd_clipboard_history: historyItems });
          btnPin.textContent = historyItems[index].pinned ? "📌" : "📍";
        });
        row.append(leftContainer, btnPin);
        row.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (item.type === "image" && typeof item.data === "string" && item.data.startsWith("data:image/png;base64,")) {
            const arr = item.data.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            const blob = new Blob([u8arr], { type: mime });
            await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
          } else {
            await navigator.clipboard.writeText(item.text);
          }
          removeMenu();
        });
        historyMenu.appendChild(row);
      });
    }
    (document.body || document.documentElement).appendChild(historyMenu);
    const rect = anchorButton.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + 260 > window.innerWidth - 8) left = window.innerWidth - 268;
    if (top + 280 > window.innerHeight - 8) top = rect.top - 290;
    historyMenu.style.left = Math.max(8, left) + "px";
    historyMenu.style.top = Math.max(8, top) + "px";
  };

  const showMenu = async (text, x, y) => {
    removeMenu();
    if (!text) return;
    const settings = await getSettings();
    const isDark = settings.theme === "dark";
    const btnOpts = settings.buttons;
    menu = document.createElement("div");
    menu.setAttribute("data-sd-element", "true");
    
    Object.assign(menu.style, {
      position: "fixed",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      padding: "6px",
      border: isDark ? "1px solid #334155" : "1px solid rgba(0,0,0,.1)",
      borderRadius: "12px",
      background: isDark ? "#0f172a" : "#ffffff",
      boxShadow: "0 6px 20px rgba(0,0,0,.2)",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    });

    const allButtons = [
      { key: "copy", icon: ICONS.copy, title: uiText(settings, "copy"), action: async () => {
          try {
            await navigator.clipboard.writeText(text);
            await saveToHistory(text);
          } catch {
            const area = document.createElement("textarea");
            area.value = text;
            Object.assign(area.style, { position: "fixed", opacity: "0" });
            (document.body || document.documentElement).appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
            await saveToHistory(text);
          }
          removeMenu();
        }
      },
      { key: "search", icon: ICONS.google, title: uiText(settings, "search"), action: () => {
          window.open("https://www.google.com/search?q=" + encodeURIComponent(text), "_blank", "noopener");
          removeMenu();
        }
      },
      { key: "ai", icon: ICONS.ai, title: uiText(settings, "ai"), action: async () => {
          // AI Mode sekmesini background açar ve seçili metni doğrudan
          // o sekmedeki gerçek giriş alanına yerleştirir. URL'ye q= eklenmez.
          // Ek güvence olarak metin panoya da kopyalanır.
          try { await navigator.clipboard.writeText(text); } catch {}
          try {
            const result = await chrome.runtime.sendMessage({ action: "openAiMode", text });
            if (!result?.ok) window.open("https://www.google.com/search?udm=50&aep=11", "_blank", "noopener");
          } catch {
            window.open("https://www.google.com/search?udm=50&aep=11", "_blank", "noopener");
          }
          removeMenu();
        }
      },
      { key: "translate", icon: ICONS.translate, title: uiText(settings, "translate"), action: (btn) => {
          showTranslateInline(text, btn, settings.sourceLang, settings.targetLang, isDark, settings);
        }
      },
      { key: "clipboard", icon: ICONS.clipboard, title: uiText(settings, "clipboard"), action: (btn) => {
          showClipboardHistoryMenu(btn, settings);
        }
      },
      { key: "youtube", icon: ICONS.youtube, title: uiText(settings, "youtube"), action: () => {
          window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(text), "_blank", "noopener");
          removeMenu();
        }
      },
      { key: "chatgpt", icon: ICONS.chatgpt, title: uiText(settings, "chatgpt"), action: () => {
          window.open("https://chatgpt.com/?q=" + encodeURIComponent(text), "_blank", "noopener");
          removeMenu();
        }
      },
      { key: "settings", icon: ICONS.settings, title: uiText(settings, "settings"), action: () => {
          chrome.runtime.sendMessage({ action: "openOptions" });
          removeMenu();
        }
      }
    ];

    const byKey = Object.fromEntries(allButtons.map(b => [b.key, b]));
    const activeKeys = (settings.buttonOrder || []).filter(key => btnOpts[key] !== false && byKey[key]);
    const displayButtons = activeKeys.map(key => byKey[key]);

    // Dengeli satır düzeni:
    // 1-3 => tek satır, 4 => 2+2, 5-6 => 3+2 / 3+3, 7-8 => 4+3 / 4+4.
    const getRowSizes = (n) => {
      if (n <= 0) return [];
      if (n <= 3) return [n];
      if (n === 4) return [2, 2];
      if (n <= 6) return [3, n - 3];
      return [4, n - 4];
    };
    let offset = 0;
    for (const rowSize of getRowSizes(displayButtons.length)) {
      const row = document.createElement("div");
      Object.assign(row.style, { display: "flex", gap: "4px", alignItems: "center", justifyContent: "center" });
      displayButtons.slice(offset, offset + rowSize).forEach(b => {
        const control = makeIconButton(b.icon, b.title, b.action, isDark);
        row.appendChild(control);
      });
      menu.appendChild(row);
      offset += rowSize;
    }

    (document.body || document.documentElement).appendChild(menu);

    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
    let top = y + 10;
    if (top + height > window.innerHeight - 8) top = Math.max(8, y - height - 10);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  };

  // Web sayfasında kullanıcı Cmd/Ctrl+C veya sağ tık > Kopyala yaptığında
  // seçili metni otomatik olarak SD Seçim pano geçmişine ekle.
  document.addEventListener("copy", () => {
    const text = selectedText();
    if (text) saveToHistory(text);
  }, true);

  document.addEventListener("mouseup", event => {
    if (event.target.closest?.('[data-sd-element="true"]')) return;
    setTimeout(() => {
      const text = selectedText();
      if (text) showMenu(text, event.clientX, event.clientY);
      else removeMenu();
    }, 10);
  }, true);

  document.addEventListener("keyup", event => {
    if (["Shift", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      const text = selectedText();
      if (text) {
        const sel = window.getSelection();
        const rect = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
        showMenu(text, rect ? rect.left : 24, rect ? rect.bottom : 24);
      }
    }
  }, true);

  document.addEventListener("mousedown", event => {
    if (menu && !event.target.closest?.('[data-sd-element="true"]')) removeMenu();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") removeMenu();
  }, true);

  window.addEventListener("scroll", event => {
    // Panelin kendi kaydırması menüyü kapatmamalı. Sayfa veya başka bir
    // kaydırılabilir alan hareket ettiğinde eski kapatma davranışı korunur.
    if (event.composedPath().some(node => node?.matches?.('[data-sd-element="true"]'))) return;
    removeMenu();
  }, true);
})();
