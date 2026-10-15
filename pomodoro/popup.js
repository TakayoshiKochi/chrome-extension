let state;
let busy = false;
const $ = id => document.getElementById(id);
const fills = Array.from({ length: 30 }, () => {
  const segment = document.createElement('div'); segment.className = 'segment';
  const fill = document.createElement('div'); fill.className = 'fill';
  segment.append(fill); $('segments').append(segment); return fill;
});
function render() {
  if (!state) return;
  const remaining = state.status === 'running' ? Math.max(0, state.endAt - Date.now()) : state.remaining;
  const seconds = Math.ceil(remaining / 1000);
  const progress = Math.max(0, Math.min(1, 1 - remaining / state.duration));
  $('time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  fills.forEach((fill, i) => { fill.style.width = `${Math.max(0, Math.min(1, progress * 30 - i)) * 100}%`; });
  $('percent').textContent = `${Math.floor(progress * 100)}%`;
  $('bar').setAttribute('aria-valuenow', Math.floor(progress * 100));
  document.documentElement.style.setProperty('--accent', state.mode === 'focus' ? '#c94c39' : '#477c65');
  $('status').textContent = { idle: '準備できました', running: '計測中', paused: '一時停止中', done: '完了しました' }[state.status];
  $('mode-label').textContent = state.mode === 'focus' ? 'FOCUS SESSION' : 'TAKE A BREAK';
  $('toggle').replaceChildren(document.createTextNode(state.status === 'running' ? '一時停止' : state.status === 'paused' ? 'つづける' : state.status === 'done' ? 'もう一度' : 'はじめる'));
  const symbol = document.createElement('span'); symbol.textContent = state.status === 'running' ? 'Ⅱ' : '▶'; $('toggle').append(symbol);
  $('toggle').disabled = busy; $('reset').disabled = busy;
  $('hint').textContent = state.status === 'done' ? (state.mode === 'focus' ? 'おつかれさまでした。休憩を選んでひと息。' : '次の集中に向けて、準備できました。') : state.status === 'paused' ? '自分のペースで、つづけよう。' : state.mode === 'focus' ? 'ひとつのことに、集中しよう。' : '画面から目を離して、ひと休み。';
  $('completed').textContent = state.completed;
  document.querySelectorAll('[data-mode]').forEach(button => { button.setAttribute('aria-pressed', button.dataset.mode === state.mode); button.disabled = busy; });
  const minutes = state.duration / 60000;
  $('quarter').textContent = minutes / 4; $('half').textContent = minutes / 2; $('three-quarter').textContent = minutes * .75; $('end').textContent = `${minutes} min`;
}
async function command(type, extra = {}) {
  if (busy) return;
  busy = true; render();
  try {
    const response = await chrome.runtime.sendMessage({ type, ...extra });
    if (response.error) throw new Error(response.error);
    state = response.state;
  } catch (error) { $('hint').textContent = `読み込みに失敗しました。開き直してください。`; console.error(error); }
  finally { busy = false; render(); }
}
$('toggle').addEventListener('click', () => command(state.status === 'running' ? 'pause' : 'start'));
$('reset').addEventListener('click', () => command('reset'));
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => command('mode', { mode: button.dataset.mode })));
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.timer) { state = changes.timer.newValue; render(); } });
setInterval(() => { render(); if (state?.status === 'running' && state.endAt <= Date.now()) void command('get'); }, 200);
void command('get');
