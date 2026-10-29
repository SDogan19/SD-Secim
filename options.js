document.addEventListener("DOMContentLoaded", async () => {
  const I18N = {
    tr: {
      pageTitle:"SD Seçim Ayarları", appearance:"Görünüm", language:"Dil", auto:"Otomatik", theme:"Tema", light:"Açık", dark:"Koyu",
      toolbar:"Araç çubuğu", toolbarHint:"Araçları açtığın sıraya göre bara eklenir. Aktif ikonları sürükleyip bırakarak sıralayabilirsin.",
      shortcuts:"Klavye kısayolları", screenshot:"Ekran görüntüsü", openSettings:"Ayarları aç", unassigned:"Atanmamış",
      shortcutHint:"Kısayolları değiştirmek için Chrome adres çubuğuna chrome://extensions/shortcuts yaz. Varsayılan: Mac ⌘⇧S / ⌘⇧A. Windows ve Linux: Ctrl+Shift+S / Ctrl+Shift+A.",
      history:"Pano geçmişi", historyHint:"Web sayfalarında kopyaladığın metinler ve ekran görüntüleri burada saklanır.", limit:"Limit", clearAll:"Tümünü temizle", emptyHistory:"Pano geçmişi boş.", record:"kayıt", image:"Ekran görüntüsü", copyAgain:"Tekrar panoya kopyala", deleteRecord:"Bu kaydı sil",
      translation:"Çeviri dili", source:"Kaynak", target:"Hedef", save:"Ayarları Kaydet", saved:"✓ Araç çubuğu kaydedildi", developer:"Geliştirici",
      tool_copy:"Kopyala", tool_search:"Google Ara", tool_ai:"AI Mode", tool_clipboard:"Pano Geçmişi", tool_translate:"Çeviri", tool_youtube:"YouTube", tool_chatgpt:"ChatGPT", tool_settings:"Ayarlar"
    },
    en: {
      pageTitle:"SD Seçim Settings", appearance:"Appearance", language:"Language", auto:"Automatic", theme:"Theme", light:"Light", dark:"Dark",
      toolbar:"Toolbar", toolbarHint:"Tools are added in the order you enable them. Drag active icons to reorder them.",
      shortcuts:"Keyboard shortcuts", screenshot:"Screenshot", openSettings:"Open settings", unassigned:"Unassigned",
      shortcutHint:"To change shortcuts, open chrome://extensions/shortcuts in Chrome. Defaults: Mac ⌘⇧S / ⌘⇧A. Windows and Linux: Ctrl+Shift+S / Ctrl+Shift+A.",
      history:"Clipboard history", historyHint:"Text copied on web pages and screenshots are stored here.", limit:"Limit", clearAll:"Clear all", emptyHistory:"Clipboard history is empty.", record:"item", image:"Screenshot", copyAgain:"Copy to clipboard again", deleteRecord:"Delete this item",
      translation:"Translation language", source:"Source", target:"Target", save:"Save Settings", saved:"✓ Toolbar saved", developer:"Developer",
      tool_copy:"Copy", tool_search:"Google Search", tool_ai:"AI Mode", tool_clipboard:"Clipboard History", tool_translate:"Translate", tool_youtube:"YouTube", tool_chatgpt:"ChatGPT", tool_settings:"Settings"
    }
  };
  const browserLang = (navigator.language || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
  const resolveLang = value => value === "tr" || value === "en" ? value : browserLang;
  const stored = await chrome.storage.local.get("sd_settings");
  let sd_settings = stored.sd_settings || {};
  let uiLangSetting = sd_settings.uiLang || "auto";
  let currentLang = resolveLang(uiLangSetting);
  const t = key => (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;

  const TOOL_META = {
    copy: { labelKey:"tool_copy", icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>` },
    search: { labelKey:"tool_search", icon:`<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>` },
    ai: { labelKey:"tool_ai", icon:`<svg viewBox="0 0 24 24" fill="#8b5cf6"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>` },
    clipboard: { labelKey:"tool_clipboard", icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect></svg>` },
    translate: { labelKey:"tool_translate", icon:`<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M5 8l6 6M4 14l6-6 2 2M2 5h12M7 2v3M22 22l-5-10-5 10M14 18h6"/></svg>` },
    youtube: { labelKey:"tool_youtube", icon:`<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>` },
    chatgpt: { labelKey:"tool_chatgpt", icon:`<svg viewBox="0 0 24 24" fill="none" stroke="#10a37f" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg>` },
    settings: { labelKey:"tool_settings", icon:`<svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>` }
  };
  const ALL_KEYS = ["search","ai","copy","clipboard","settings","translate","youtube","chatgpt"];
  const defaults = { copy:true, search:true, ai:true, clipboard:false, settings:false, translate:false, youtube:false, chatgpt:false };
  const defaultOrder = [...ALL_KEYS];
  const oldButtons = { ...defaults, ...(sd_settings.buttons || {}) };
  let order = Array.isArray(sd_settings.buttonOrder) ? sd_settings.buttonOrder.filter(k => ALL_KEYS.includes(k)) : defaultOrder.slice();
  for (const k of ALL_KEYS) if (!order.includes(k)) order.push(k);
  let buttons = oldButtons;

  const uiLangEl = document.getElementById("uiLang");
  uiLangEl.value = uiLangSetting;
  document.getElementById("themeSelect").value = sd_settings.theme || "light";
  document.getElementById("sourceLang").value = sd_settings.sourceLang || "auto";
  document.getElementById("targetLang").value = sd_settings.targetLang || "tr";
  document.getElementById("historyLimit").value = [10,25,50,100].includes(Number(sd_settings.historyLimit)) ? String(sd_settings.historyLimit) : "25";

  const toolList = document.getElementById("toolList");
  const preview = document.getElementById("toolbarPreview");
  const checks = {};
  const names = {};

  const applyLanguage = () => {
    currentLang = resolveLang(uiLangEl.value);
    document.documentElement.lang = currentLang;
    document.title = t("pageTitle");
    const set = (id,key) => { const el=document.getElementById(id); if(el) el.textContent=t(key); };
    set("appearanceTitle","appearance"); set("uiLangLabel","language"); set("uiAuto","auto"); set("themeLabel","theme"); set("themeLight","light"); set("themeDark","dark");
    set("toolbarTitle","toolbar"); set("toolbarHint","toolbarHint"); set("shortcutsTitle","shortcuts"); set("shortcutScreenshotLabel","screenshot"); set("shortcutSettingsLabel","openSettings"); set("shortcutHint","shortcutHint");
    set("historyTitle","history"); set("historyHint","historyHint"); set("historyLimitLabel","limit"); set("clearHistoryBtn","clearAll");
    set("translationTitle","translation"); set("sourceLangLabel","source"); set("targetLangLabel","target"); set("saveBtn","save"); set("developerLabel","developer");
    const languageNames = currentLang === "tr"
      ? { auto:"Otomatik", tr:"Türkçe", en:"İngilizce", de:"Almanca", fr:"Fransızca", es:"İspanyolca", ru:"Rusça" }
      : { auto:"Automatic", tr:"Turkish", en:"English", de:"German", fr:"French", es:"Spanish", ru:"Russian" };
    for (const selectId of ["sourceLang","targetLang"]) {
      const sel = document.getElementById(selectId);
      if (sel) for (const opt of sel.options) if (languageNames[opt.value]) opt.textContent = languageNames[opt.value];
    }
    for (const key of ALL_KEYS) if (names[key]) names[key].textContent = t(TOOL_META[key].labelKey);
    renderPreview(); renderHistory();
  };

  for (const key of ALL_KEYS) {
    const meta = TOOL_META[key];
    const item = document.createElement("label"); item.className = "tool-item";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = buttons[key] !== false; cb.dataset.key = key; checks[key] = cb;
    const mini = document.createElement("span"); mini.className = "mini"; mini.innerHTML = meta.icon;
    const name = document.createElement("span"); names[key] = name; name.textContent = t(meta.labelKey);
    item.append(cb, mini, name); toolList.appendChild(item);
    cb.addEventListener("change", () => {
      buttons[key] = cb.checked;
      if (cb.checked) {
        order = order.filter(k => k !== key);
        const activeKeys = order.filter(k => checks[k]?.checked);
        const inactiveKeys = order.filter(k => !checks[k]?.checked && k !== key);
        order = [...activeKeys, key, ...inactiveKeys.filter(k => k !== key)];
        for (const k of ALL_KEYS) if (!order.includes(k)) order.push(k);
      }
      renderPreview();
    });
  }

  const rowSizes = n => n<=0?[]:n<=3?[n]:n===4?[2,2]:n<=6?[3,n-3]:[4,n-4];
  let draggedKey = null;
  function renderPreview() {
    preview.innerHTML = "";
    const active = order.filter(k => buttons[k] !== false);
    let offset = 0;
    for (const size of rowSizes(active.length)) {
      const row = document.createElement("div"); row.className = "preview-row";
      for (const key of active.slice(offset, offset + size)) {
        const meta = TOOL_META[key];
        const chip = document.createElement("div"); chip.className = "tool-chip"; chip.title = t(meta.labelKey); chip.innerHTML = meta.icon; chip.draggable = true; chip.dataset.key = key;
        const num = document.createElement("span"); num.className = "num"; num.textContent = String(active.indexOf(key)+1); chip.appendChild(num);
        chip.addEventListener("dragstart", e => { draggedKey=key; chip.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; });
        chip.addEventListener("dragend", () => { draggedKey=null; chip.classList.remove("dragging"); });
        chip.addEventListener("dragover", e => e.preventDefault());
        chip.addEventListener("drop", e => {
          e.preventDefault(); if(!draggedKey || draggedKey===key) return;
          const activeNow=order.filter(k=>buttons[k]!==false); const from=activeNow.indexOf(draggedKey); const to=activeNow.indexOf(key);
          activeNow.splice(from,1); activeNow.splice(to,0,draggedKey); const inactive=order.filter(k=>buttons[k]===false); order=[...activeNow,...inactive]; renderPreview();
        });
        row.appendChild(chip);
      }
      preview.appendChild(row); offset += size;
    }
  }

  const historyListEl = document.getElementById("historyList");
  const historyLimitEl = document.getElementById("historyLimit");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const formatTime = ts => { try { return new Date(ts).toLocaleTimeString(currentLang === "tr" ? "tr-TR" : "en-GB", {hour:"2-digit",minute:"2-digit",hour12:false}); } catch { return ""; } };
  const dataUrlToBlob = dataUrl => {
    if(typeof dataUrl!=="string"||!dataUrl.startsWith("data:image/png;base64,")) return null;
    const raw=atob(dataUrl.slice("data:image/png;base64,".length));
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
    return new Blob([bytes],{type:"image/png"});
  };
  const copyHistoryItem = async (item,button) => {
    try { if(item.type==="image"&&item.data){const blob=dataUrlToBlob(item.data);if(!blob) throw new Error("Invalid image history entry");await navigator.clipboard.write([new ClipboardItem({[blob.type]:blob})]);} else if(item.text) await navigator.clipboard.writeText(item.text); const old=button.textContent; button.textContent="✓"; setTimeout(()=>button.textContent=old,700); } catch(e){ console.warn("Clipboard history copy error:",e); }
  };
  async function renderHistory() {
    const { sd_clipboard_history=[] } = await chrome.storage.local.get("sd_clipboard_history");
    historyListEl.innerHTML="";
    if(!sd_clipboard_history.length){const empty=document.createElement("div");empty.className="history-empty";empty.textContent=t("emptyHistory");historyListEl.appendChild(empty);return;}
    sd_clipboard_history.forEach((item,index)=>{
      const row=document.createElement("div");row.className="history-item";
      if(item.type==="image"&&typeof item.data==="string"&&item.data.startsWith("data:image/png;base64,")){const img=document.createElement("img");img.className="history-preview";img.src=item.data;row.appendChild(img);}
      const textBox=document.createElement("div");textBox.className="history-text";const main=document.createElement("div");main.className="history-main";main.textContent=item.type==="image"?(item.name||t("image")):(item.text||"");main.title=main.textContent;
      const meta=document.createElement("div");meta.className="history-meta";meta.textContent=`${index+1}. ${t("record")} · ${formatTime(item.timestamp)}`;textBox.append(main,meta);
      const actions=document.createElement("div");actions.className="history-actions";
      const copyBtn=document.createElement("button");copyBtn.type="button";copyBtn.className="history-action";copyBtn.textContent="⧉";copyBtn.title=t("copyAgain");copyBtn.addEventListener("click",()=>copyHistoryItem(item,copyBtn));
      const delBtn=document.createElement("button");delBtn.type="button";delBtn.className="history-action delete";delBtn.textContent="×";delBtn.title=t("deleteRecord");delBtn.addEventListener("click",async()=>{const {sd_clipboard_history:current=[]}=await chrome.storage.local.get("sd_clipboard_history");const filtered=current.filter(x=>(x.id||`${x.type}_${x.timestamp}`)!==(item.id||`${item.type}_${item.timestamp}`));await chrome.storage.local.set({sd_clipboard_history:filtered});});
      actions.append(copyBtn,delBtn);row.append(textBox,actions);historyListEl.appendChild(row);
    });
  }
  clearHistoryBtn.addEventListener("click",async()=>{await chrome.storage.local.set({sd_clipboard_history:[]});});
  historyLimitEl.addEventListener("change",async()=>{const limit=Number(historyLimitEl.value)||25;const current=await chrome.storage.local.get(["sd_settings","sd_clipboard_history"]);const settingsNow=current.sd_settings||{};const trimmed=(current.sd_clipboard_history||[]).slice(0,limit);await chrome.storage.local.set({sd_settings:{...settingsNow,historyLimit:limit},sd_clipboard_history:trimmed});});
  chrome.storage.onChanged.addListener((changes,areaName)=>{if(areaName==="local"&&changes.sd_clipboard_history)renderHistory();});

  uiLangEl.addEventListener("change", applyLanguage);
  applyLanguage();

  try {
    const commands=await chrome.commands.getAll(); const shot=commands.find(c=>c.name==="take-screenshot"); const opts=commands.find(c=>c.name==="open-settings");
    const shotEl=document.getElementById("shortcutScreenshot"); const optsEl=document.getElementById("shortcutSettings");
    if(shotEl) shotEl.textContent=shot?.shortcut||t("unassigned"); if(optsEl) optsEl.textContent=opts?.shortcut||t("unassigned");
  } catch(e){console.warn("Shortcut read error:",e);}

  document.getElementById("saveBtn").addEventListener("click",async()=>{
    const cleanOrder=order.filter(k=>ALL_KEYS.includes(k));for(const k of ALL_KEYS)if(!cleanOrder.includes(k))cleanOrder.push(k);
    const newSettings={ uiLang:uiLangEl.value, theme:document.getElementById("themeSelect").value, sourceLang:document.getElementById("sourceLang").value, targetLang:document.getElementById("targetLang").value, historyLimit:Number(historyLimitEl.value)||25, buttons:Object.fromEntries(ALL_KEYS.map(k=>[k,checks[k].checked])), buttonOrder:cleanOrder, layoutVersion:5 };
    await chrome.storage.local.set({sd_settings:newSettings}); sd_settings=newSettings; uiLangSetting=newSettings.uiLang; currentLang=resolveLang(uiLangSetting);
    const status=document.getElementById("status");status.textContent=t("saved");setTimeout(()=>status.textContent="",1800);
  });
});
