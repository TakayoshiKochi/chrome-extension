const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.example.json'), 'utf8'));

async function setup({ config = CONFIG, existingRules = [], unsupported = [] } = {}) {
  const listeners = {};
  const updates = [];
  const chrome = {
    runtime: {
      getURL: p => `chrome-extension://test/${p}`,
      onInstalled: { addListener(cb) { listeners.installed = cb; } },
      onStartup: { addListener(cb) { listeners.startup = cb; } }
    },
    declarativeNetRequest: {
      async getDynamicRules() { return existingRules; },
      async updateDynamicRules(options) { updates.push(options); },
      async isRegexSupported({ regex }) {
        return unsupported.includes(regex)
          ? { isSupported: false, reason: 'syntaxError' }
          : { isSupported: true };
      }
    }
  };
  const fetch = async () => ({ json: async () => config });
  const console = { info() {}, error() {} };

  const source = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');
  vm.runInNewContext(source, { chrome, fetch, console });

  listeners.installed();
  await new Promise(resolve => setTimeout(resolve, 0));
  return updates;
}

// Emulates DNR regexSubstitution: the first match is replaced, \N refers to groups.
function applyRules(rules, url) {
  for (const rule of rules) {
    const re = new RegExp(rule.condition.regexFilter);
    if (re.test(url)) {
      return url.replace(re, rule.action.redirect.regexSubstitution.replace(/\\(\d)/g, '$$$1'));
    }
  }
  return url;
}

test('installs config rules as dynamic redirect rules and clears old ones', async () => {
  const updates = await setup({ existingRules: [{ id: 1 }, { id: 9 }] });
  assert.equal(updates.length, 1);
  assert.deepEqual([...updates[0].removeRuleIds], [1, 9]);
  assert.equal(updates[0].addRules.length, CONFIG.rules.length);
  assert.equal(updates[0].addRules[0].id, 1);
  assert.equal(updates[0].addRules[0].action.type, 'redirect');
});

test('example rule redirects google.com to www.google.com keeping path and query', async () => {
  const [{ addRules }] = await setup();
  const cases = [
    ['https://google.com/', 'https://www.google.com/'],
    ['https://google.com/search?q=chrome+extension#top',
      'https://www.google.com/search?q=chrome+extension#top']
  ];
  for (const [from, to] of cases) assert.equal(applyRules(addRules, from), to);
});

test('example rule leaves unrelated URLs alone', async () => {
  const [{ addRules }] = await setup();
  for (const url of [
    'https://www.google.com/search?q=x',
    'http://google.com/',
    'https://google.com.example.com/',
    'https://googleXcom/'
  ]) {
    assert.equal(applyRules(addRules, url), url);
  }
});

test('invalid config disables all redirects', async () => {
  for (const config of [{}, { rules: [{ from: '' , to: 'x' }] }, { rules: [{ from: 'a' }] }]) {
    const [update] = await setup({ config, existingRules: [{ id: 1 }] });
    assert.deepEqual([...update.removeRuleIds], [1]);
    assert.equal(update.addRules.length, 0);
  }
});

test('unsupported regex disables all redirects', async () => {
  const [update] = await setup({ unsupported: [CONFIG.rules[0].from] });
  assert.equal(update.addRules.length, 0);
});
