(() => {
  const form = document.getElementById('settings-form');
  const input = document.getElementById('server-url');
  const saveButton = document.getElementById('save-button');
  const status = document.getElementById('status');

  function showStatus(message, state = 'saved') {
    status.textContent = message;
    status.dataset.state = state;
  }

  function normalizeServerUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
      const server = new URL(value.trim());
      if (!['http:', 'https:'].includes(server.protocol)) return null;
      if (server.username || server.password || server.search || server.hash) return null;
      server.pathname = `${server.pathname.replace(/\/+$/, '')}/`;
      return server.href;
    } catch {
      return null;
    }
  }

  chrome.storage.local.get({ serverUrl: '' }, settings => {
    if (chrome.runtime.lastError) {
      showStatus('Could not load settings.', 'error');
      return;
    }
    input.value = settings.serverUrl || '';
    showStatus(settings.serverUrl ? 'Settings saved on this browser.' : 'Enter your go-link server to get started.');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const serverUrl = normalizeServerUrl(input.value);
    if (!serverUrl) {
      showStatus('Enter a valid HTTP or HTTPS server URL without a query or fragment.', 'error');
      return;
    }

    saveButton.disabled = true;
    showStatus('Saving…');
    chrome.storage.local.set({ serverUrl }, () => {
      saveButton.disabled = false;
      if (chrome.runtime.lastError) {
        showStatus('Could not save settings.', 'error');
        return;
      }
      input.value = serverUrl;
      showStatus('Settings saved on this browser.');
    });
  });
})();
