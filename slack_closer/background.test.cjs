const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup() {
  let navigationListener;
  let messageListener;
  const removedTabs = [];
  const chrome = {
    webNavigation: {
      onBeforeNavigate: {
        addListener(callback) { navigationListener = callback; }
      }
    },
    runtime: {
      onMessage: {
        addListener(callback) { messageListener = callback; }
      }
    },
    tabs: {
      async remove(tabId) { removedTabs.push(tabId); }
    }
  };

  const source = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');
  vm.runInNewContext(source, { chrome, URL, console });

  return {
    navigate: details => navigationListener(details),
    sendMessage: (message, sender) => messageListener(message, sender),
    removedTabs
  };
}

test('closes the tab for a top-level Slack desktop protocol handoff', async () => {
  const app = setup();
  app.navigate({ tabId: 12, frameId: 0, url: 'slack://channel?team=T123&id=C456' });
  await Promise.resolve();
  assert.deepEqual(app.removedTabs, [12]);
});

test('does not close tabs for Slack web URLs or other protocols', async () => {
  const app = setup();
  app.navigate({ tabId: 3, frameId: 0, url: 'https://app.slack.com/client/T123/C456' });
  app.navigate({ tabId: 4, frameId: 0, url: 'zoommtg://join' });
  await Promise.resolve();
  assert.deepEqual(app.removedTabs, []);
});

test('closes the originating tab when a subframe hands off to Slack', async () => {
  const app = setup();
  app.navigate({ tabId: 5, frameId: 1, url: 'slack://channel?id=C456' });
  await Promise.resolve();
  assert.deepEqual(app.removedTabs, [5]);
});

test('ignores protocol navigations that have no browser tab', async () => {
  const app = setup();
  app.navigate({ tabId: -1, frameId: 0, url: 'slack://channel?id=C456' });
  await Promise.resolve();
  assert.deepEqual(app.removedTabs, []);
});

test('closes a Slack tab when its content script reports the redirect notice', async () => {
  const app = setup();
  const url = 'https://applied-stackplatform.slack.com/archives/C0BF43XG9FA/p1792436121282459';
  app.sendMessage(
    { type: 'close-tab-after-slack-desktop-redirect' },
    { tab: { id: 24, url }, url, frameId: 0 }
  );
  await Promise.resolve();
  assert.deepEqual(app.removedTabs, [24]);
});

test('ignores redirect messages from non-Slack pages', async () => {
  const app = setup();
  const url = 'https://example.com/';
  app.sendMessage(
    { type: 'close-tab-after-slack-desktop-redirect' },
    { tab: { id: 25, url }, url, frameId: 0 }
  );
  await Promise.resolve();
  assert.deepEqual(app.removedTabs, []);
});
