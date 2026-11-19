const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup(serverUrl = '') {
  let navigationListener;
  const redirectedTabs = [];
  const chrome = {
    storage: {
      local: {
        get(defaults, callback) {
          callback({ ...defaults, serverUrl });
        }
      }
    },
    webNavigation: {
      onBeforeNavigate: {
        addListener(callback) { navigationListener = callback; }
      }
    },
    tabs: {
      async update(tabId, properties) {
        redirectedTabs.push({ tabId, url: properties.url });
      }
    }
  };

  const source = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');
  vm.runInNewContext(source, { chrome, URL });

  return {
    navigate: details => navigationListener(details),
    redirectedTabs
  };
}

test('expands a go/ path onto the configured server and keeps query and fragment', () => {
  const app = setup('https://links.example.com/shortcuts');
  app.navigate({
    tabId: 7,
    frameId: 0,
    url: 'http://go/team/docs?view=full#intro'
  });

  assert.equal(app.redirectedTabs.length, 1);
  assert.equal(app.redirectedTabs[0].tabId, 7);
  assert.equal(app.redirectedTabs[0].url, 'https://links.example.com/shortcuts/team/docs?view=full#intro');
});

test('does not redirect when no server is configured', () => {
  const app = setup();
  app.navigate({ tabId: 3, frameId: 0, url: 'http://go/docs' });
  assert.equal(app.redirectedTabs.length, 0);
});

test('ignores other hosts, empty shortcuts, and subframe navigations', () => {
  const app = setup('https://links.example.com/');
  app.navigate({ tabId: 1, frameId: 0, url: 'https://example.com/go/docs' });
  app.navigate({ tabId: 2, frameId: 0, url: 'http://go/' });
  app.navigate({ tabId: 3, frameId: 2, url: 'http://go/docs' });
  app.navigate({ tabId: -1, frameId: 0, url: 'http://go/docs' });
  assert.equal(app.redirectedTabs.length, 0);
});

test('rejects unsupported or malformed server URLs', () => {
  const app = setup('javascript:alert(1)');
  app.navigate({ tabId: 3, frameId: 0, url: 'http://go/docs' });
  assert.equal(app.redirectedTabs.length, 0);
});
