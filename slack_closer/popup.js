(() => {
  const DEFAULT_MODE = 'app';
  const toggle = document.getElementById('mode-toggle');
  const title = document.getElementById('setting-title');
  const description = document.getElementById('setting-description');
  const note = document.getElementById('mode-note');
  const saveStatus = document.getElementById('save-status');
  const statusDot = document.getElementById('status-dot');
  let currentMode = DEFAULT_MODE;
  let saving = false;

  function render(mode, statusText = 'Saved on this browser', status = 'saved') {
    currentMode = mode === 'browser' ? 'browser' : 'app';
    document.body.dataset.mode = currentMode;
    toggle.setAttribute('aria-checked', String(currentMode === 'app'));
    toggle.setAttribute('aria-label', currentMode === 'app'
      ? 'Use Slack desktop app mode'
      : 'Keep Slack links in the browser');
    title.textContent = currentMode === 'app' ? 'Desktop app' : 'Browser';
    description.textContent = currentMode === 'app'
      ? 'Close this tab when Slack reports the desktop handoff.'
      : 'Keep this tab open in Chrome after Slack’s handoff notice.';
    note.textContent = currentMode === 'app'
      ? 'Slack opens the app; this extension closes the tab after the handoff notice.'
      : 'This keeps the tab open. Slack may still launch its desktop app.';
    saveStatus.textContent = statusText;
    statusDot.dataset.state = status;
  }

  toggle.addEventListener('click', () => {
    if (saving) return;

    const nextMode = currentMode === 'app' ? 'browser' : 'app';
    const previousMode = currentMode;
    saving = true;
    toggle.disabled = true;
    render(nextMode, 'Saving…', '');

    chrome.storage.local.set({ redirectMode: nextMode }, () => {
      saving = false;
      toggle.disabled = false;
      if (chrome.runtime.lastError) {
        render(previousMode, 'Could not save preference', 'error');
        return;
      }
      render(nextMode, 'Saved on this browser', 'saved');
    });
  });

  chrome.storage.local.get({ redirectMode: DEFAULT_MODE }, (settings) => {
    if (chrome.runtime.lastError) {
      render(DEFAULT_MODE, 'Could not load preference', 'error');
      return;
    }
    render(settings.redirectMode || DEFAULT_MODE);
  });
})();
