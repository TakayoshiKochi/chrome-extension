(() => {
  const REDIRECT_NOTICE = "we've redirected you to the desktop app.";
  const MESSAGE_TYPE = 'close-tab-after-slack-desktop-redirect';
  let closeRequested = false;
  let scanTimer;

  function normalize(text) {
    return text
      .normalize('NFKC')
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function closeIfRedirectNoticeIsVisible() {
    scanTimer = undefined;
    if (closeRequested || !document.body) return;

    const visibleText = normalize(document.body.innerText || '');
    if (!visibleText.includes(REDIRECT_NOTICE)) return;

    closeRequested = true;
    observer.disconnect();
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE }, () => {
      // Read lastError to suppress an expected warning if the tab is already closing.
      void chrome.runtime.lastError;
    });
  }

  const observer = new MutationObserver(() => {
    if (scanTimer === undefined) {
      scanTimer = setTimeout(closeIfRedirectNoticeIsVisible, 150);
    }
  });

  closeIfRedirectNoticeIsVisible();
  if (!closeRequested && document.documentElement) {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }
})();
