const DURATIONS = { focus: 25, short: 5, long: 15 };
const LABELS = { focus: '集中', short: '短い休憩', long: '長い休憩' };
const initial = () => ({ mode: 'focus', duration: 1500000, remaining: 1500000, endAt: null, status: 'idle', completed: 0 });
let queue = Promise.resolve();

async function updateBadge(state) {
  const remaining = state.status === 'running' ? Math.max(0, state.endAt - Date.now()) : state.remaining;
  const text = state.status === 'done' ? '✓' : state.status === 'idle' ? '' : String(Math.ceil(remaining / 60000));
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: state.status === 'paused' ? '#7c766d' : state.mode === 'focus' ? '#c94c39' : '#477c65' });
  await chrome.action.setTitle({ title: `Pomodoro · ${LABELS[state.mode]} · ${state.status === 'done' ? '終了' : `${Math.ceil(remaining / 1000)}秒`}` });
}

async function synchronize(state) {
  if (state.status === 'running' && state.endAt <= Date.now()) {
    state = { ...state, remaining: 0, endAt: null, status: 'done', completed: state.completed + (state.mode === 'focus' ? 1 : 0) };
    await chrome.storage.local.set({ timer: state });
    await chrome.alarms.clear('finish');
    await chrome.alarms.clear('badge');
    try {
      await chrome.notifications.create('pomodoro-finished', { type: 'basic', iconUrl: 'icons/tomato-128.png', title: `${LABELS[state.mode]}の時間が終了しました`, message: state.mode === 'focus' ? 'おつかれさまでした。ひと息つきましょう。' : '次の集中を始めましょう。' });
    } catch (error) { console.warn('Notification unavailable:', error); }
  }
  await updateBadge(state);
  return state;
}

async function handle(message = { type: 'get' }) {
  let state = await synchronize((await chrome.storage.local.get('timer')).timer || initial());
  switch (message.type) {
    case 'start':
      if (state.status !== 'running') {
        const remaining = state.status === 'paused' ? state.remaining : state.duration;
        state = { ...state, remaining, endAt: Date.now() + remaining, status: 'running' };
      }
      break;
    case 'pause':
      if (state.status === 'running') state = { ...state, remaining: Math.max(0, state.endAt - Date.now()), endAt: null, status: 'paused' };
      break;
    case 'reset': state = { ...state, remaining: state.duration, endAt: null, status: 'idle' }; break;
    case 'mode':
      if (!Object.hasOwn(DURATIONS, message.mode)) throw new Error('Unknown mode');
      state = { ...state, mode: message.mode, duration: DURATIONS[message.mode] * 60000, remaining: DURATIONS[message.mode] * 60000, endAt: null, status: 'idle' };
      break;
    case 'get': break;
    default: throw new Error('Unknown command');
  }
  await chrome.storage.local.set({ timer: state });
  if (state.status === 'running') {
    await chrome.alarms.create('finish', { when: state.endAt });
    if (!(await chrome.alarms.get('badge'))) await chrome.alarms.create('badge', { periodInMinutes: 0.5 });
  } else {
    await chrome.alarms.clear('finish');
    await chrome.alarms.clear('badge');
  }
  await updateBadge(state);
  return state;
}

function dispatch(message) {
  const result = queue.then(() => handle(message));
  queue = result.catch(error => console.error(error));
  return result;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return;
  dispatch(message).then(state => respond({ state }), error => respond({ error: error.message }));
  return true;
});
chrome.alarms.onAlarm.addListener(() => { void dispatch(); });
chrome.runtime.onInstalled.addListener(() => { void dispatch(); });
chrome.runtime.onStartup.addListener(() => { void dispatch(); });
