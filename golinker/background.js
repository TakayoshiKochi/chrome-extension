const DEFAULT_SETTINGS = { serverUrl: '' };

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

function resolveGoUrl(url, serverUrl) {
  if (typeof url !== 'string') return null;

  try {
    const source = new URL(url);
    if (!['http:', 'https:'].includes(source.protocol) || source.hostname !== 'go') return null;

    const keyword = source.pathname.slice(1);
    if (!keyword) return null;

    const normalizedServerUrl = normalizeServerUrl(serverUrl);
    if (!normalizedServerUrl) return null;

    const target = new URL(normalizedServerUrl);
    target.pathname = `${target.pathname}${keyword}`;
    target.search = source.search;
    target.hash = source.hash;
    return target.href;
  } catch {
    return null;
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(({ tabId, frameId, url }) => {
  if (tabId < 0 || frameId !== 0) return;

  chrome.storage.local.get(DEFAULT_SETTINGS, settings => {
    const targetUrl = resolveGoUrl(url, settings.serverUrl);
    if (!targetUrl) return;

    void chrome.tabs.update(tabId, { url: targetUrl }).catch(() => {
      // The tab may have been closed or navigated elsewhere already.
    });
  });
});
