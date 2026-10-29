(() => {
  // SD Seçim'in kendi açılır panelleri içinde yapılan kaydırmaların,
  // content.js içindeki genel "scroll = menüyü kapat" dinleyicisine
  // ulaşmasını engeller. Sayfanın normal kaydırması etkilenmez.
  window.addEventListener("scroll", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest?.('[data-sd-element="true"]')) {
      event.stopImmediatePropagation();
    }
  }, true);
})();
