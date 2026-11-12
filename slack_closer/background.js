function isSlackDesktopUrl(url) {
  if (typeof url !== 'string') return false;

  try {
    return new URL(url).protocol.toLowerCase() === 'slack:';
  } catch {
    return false;
  }
}

function isSlackWebUrl(url) {
  if (typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      (parsed.hostname === 'slack.com' || parsed.hostname.endsWith('.slack.com'));
  } catch {
    return false;
  }
}

function closeTab(tabId) {
  void chrome.tabs.remove(tabId).catch(() => {
    // The tab may have been closed already by the user or another extension.
  });
}

function closeTabIfDesktopAppMode(tabId) {
  chrome.storage.local.get({ redirectMode: 'app' }, settings => {
    if (settings.redirectMode !== 'browser') closeTab(tabId);
  });
}

chrome.webNavigation.onBeforeNavigate.addListener(({ tabId, url }) => {
  // Slack may start its desktop-app handoff from a hidden frame, so watch all frames.
  if (tabId < 0 || !isSlackDesktopUrl(url)) return;
  closeTabIfDesktopAppMode(tabId);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'close-tab-after-slack-desktop-redirect') return;

  const tabId = sender.tab?.id;
  const pageUrl = sender.url || sender.tab?.url;
  if (!Number.isInteger(tabId) || tabId < 0 || !isSlackWebUrl(pageUrl)) return;

  closeTabIfDesktopAppMode(tabId);
});
