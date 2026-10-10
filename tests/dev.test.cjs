const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dev.js'), 'utf8');

function load({ search = '', flag } = {}) {
  const appended = [], listeners = {}, calls = [];
  const el = () => ({ style: {}, hidden: false, addEventListener() {}, set textContent(v) {}, set innerHTML(v) {} });
  const sandbox = {
    location: { search }, performance: { now: () => 0 }, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    document: { createElement: el, getElementById: () => null, body: { appendChild: e => appended.push(e) }, head: { appendChild: e => appended.push(e) } },
    addEventListener(name, fn) { listeners[name] = fn; },
    Flight: { active: true, debug: { god: () => { calls.push('god'); return true; }, play() {}, worlds: () => [], speed() {} } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(flag === undefined ? source : source.replace('var DEV=true;', `var DEV=${flag};`), sandbox);
  const press = (code, alt = true) => listeners.keydown({ code, altKey: alt, metaKey: false, ctrlKey: false, shiftKey: false, preventDefault() {}, stopImmediatePropagation() {} });
  return { appended, listeners, calls, press, sandbox };
}

test('with the flag off, dev.js adds nothing and listens to nothing', () => {
  for (const env of [{ flag: false }, { search: '?dev=0' }]) {
    const dev = load(env);
    assert.equal(dev.appended.length, 0);
    assert.equal(Object.keys(dev.listeners).length, 0);
  }
});

test('with the flag on, shortcuts reach the game', () => {
  const dev = load();
  assert(dev.appended.length > 0, 'the badge and panel are added');
  dev.press('KeyG');
  assert.deepEqual(dev.calls, ['god']);
  dev.press('KeyG', false);
  assert.equal(dev.calls.length, 1, 'plain G without Option is left to the game');
});

test('?dev=1 turns shortcuts on even when the flag is off', () => {
  assert(load({ flag: false, search: '?dev=1' }).appended.length > 0);
});
