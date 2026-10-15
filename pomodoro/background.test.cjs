const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup(saved) {
  let now = 1000000;
  const data = saved ? { timer: structuredClone(saved) } : {};
  const alarms = new Map();
  const notifications = [];
  let badge;
  const event = () => ({ addListener() {} });
  const chrome = {
    storage: { local: { async get() { return structuredClone(data); }, async set(value) { Object.assign(data, structuredClone(value)); } } },
    action: { async setBadgeText(value) { badge = value.text; }, async setBadgeBackgroundColor() {}, async setTitle() {} },
    alarms: { async create(name, options) { alarms.set(name, options); }, async get(name) { return alarms.get(name); }, async clear(name) { alarms.delete(name); }, onAlarm: event() },
    notifications: { async create(...args) { notifications.push(args); } },
    runtime: { id: 'test', onMessage: event(), onStartup: event(), onInstalled: event() }
  };
  const context = vm.createContext({ chrome, console, Date: { now: () => now } });
  vm.runInContext(fs.readFileSync(`${__dirname}/background.js`, 'utf8'), context);
  return { run: message => context.dispatch(message), advance: ms => { now += ms; }, alarms, notifications, data, badge: () => badge };
}
test('start, pause, resume and reset retain the correct remaining time', async () => {
  const app = setup();
  assert.equal((await app.run()).status, 'idle');
  assert.equal(app.badge(), '');
  await app.run({ type: 'start' });
  app.advance(65000);
  let state = await app.run({ type: 'pause' });
  assert.equal(state.remaining, 1435000);
  assert.equal(app.alarms.size, 0);
  app.advance(100000);
  state = await app.run({ type: 'start' });
  assert.equal(state.endAt - 1165000, 1435000);
  assert.equal(app.badge(), '24');
  state = await app.run({ type: 'reset' });
  assert.equal(state.remaining, 1500000);
  assert.equal(state.status, 'idle');
});
test('a restarted worker restores alarms and completes an overdue timer only once', async () => {
  const original = setup();
  const started = await original.run({ type: 'start' });
  const restored = setup(started);
  await restored.run();
  assert.equal(restored.alarms.get('finish').when, started.endAt);
  restored.advance(1600000);
  const state = await restored.run();
  assert.equal(state.status, 'done');
  assert.equal(state.completed, 1);
  assert.equal(restored.badge(), '✓');
  await restored.run();
  assert.equal(restored.notifications.length, 1);
  assert.equal(restored.alarms.size, 0);
});
test('mode changes cancel the active timer and breaks do not count as focus sessions', async () => {
  const app = setup();
  await app.run({ type: 'start' });
  let state = await app.run({ type: 'mode', mode: 'short' });
  assert.equal(state.duration, 300000);
  assert.equal(state.status, 'idle');
  assert.equal(app.alarms.size, 0);
  await app.run({ type: 'start' });
  app.advance(300000);
  state = await app.run();
  assert.equal(state.completed, 0);
  await assert.rejects(app.run({ type: 'mode', mode: 'invalid' }));
});
