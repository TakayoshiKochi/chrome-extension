const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup(initialText = '') {
  let mutationListener;
  let pendingTimer;
  const messages = [];
  const document = { body: { innerText: initialText }, documentElement: {} };

  class MockMutationObserver {
    constructor(callback) { mutationListener = callback; }
    observe() {}
    disconnect() {}
  }

  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        messages.push(message);
        if (callback) callback();
      }
    }
  };
  const source = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
  vm.runInNewContext(source, {
    document,
    chrome,
    MutationObserver: MockMutationObserver,
    setTimeout(callback) { pendingTimer = callback; return 1; },
    clearTimeout() { pendingTimer = undefined; }
  });

  return {
    document,
    messages,
    show(text) {
      document.body.innerText = text;
      mutationListener();
      const runTimer = pendingTimer;
      pendingTimer = undefined;
      if (runTimer) runTimer();
    }
  };
}

test('closes when the visible Slack redirect notice appears', () => {
  const app = setup('Loading Slack…');
  app.show('We’ve redirected you to the desktop app.');
  assert.equal(app.messages.length, 1);
  assert.equal(app.messages[0].type, 'close-tab-after-slack-desktop-redirect');
});

test('does not close for ordinary Slack page content', () => {
  const app = setup('Welcome to Slack');
  app.show('A message says the desktop app is available.');
  assert.equal(app.messages.length, 0);
});
