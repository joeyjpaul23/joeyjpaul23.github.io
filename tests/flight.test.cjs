const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');

function createFlight({ reduced = false, width = 1280, height = 800 } = {}) {
  let time = 0;
  const listeners = {}, storage = {}, timers = [];
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (['moveTo', 'lineTo', 'arc', 'fillRect', 'translate'].includes(key)) {
        return (...args) => args.slice(0, 2).forEach(v => assert(Number.isFinite(v), `${key} got a non-finite coordinate`));
      }
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  function element(id) {
    const classes = new Set(id === 'fcard' ? ['hide'] : []), attributes = {};
    const el = {
      id, hidden: true, style: {}, innerHTML: '', attributes,
      classList: {
        add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c),
        toggle: (c, on) => (on === undefined ? !classes.has(c) : on) ? classes.add(c) : classes.delete(c),
      },
      children: id === 'fhull' ? [{}, {}, {}] : [],
      setAttribute(name, value) { attributes[name] = value; }, getAttribute: name => attributes[name] ?? null,
      addEventListener(name, fn) { listeners[id + ':' + name] = fn; },
      getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0 }),
      focus() {}, contains: () => false, querySelector: () => null, setPointerCapture() {},
    };
    return el;
  }
  const elements = {};
  const tokens = { '--bg': '#f2f4f6', '--fg': '#101319', '--dim': '#586070', '--accent': '#2a44ff', '--hostile': '#d8402f',
    '--ship-body': '#a1a5ab', '--ship-shield': '#41464e', '--ship-edge': '#d6d9de' };
  const sandbox = {
    Math, JSON, String, Object, Array, Number, isFinite, parseInt,
    innerWidth: width, innerHeight: height, devicePixelRatio: 1,
    performance: { now: () => time },
    document: { documentElement: { dataset: {} }, hidden: false, activeElement: null,
      getElementById: id => elements[id] ||= element(id), addEventListener(name, fn) { listeners['document:' + name] = fn; } },
    matchMedia: query => ({ matches: reduced && /reduce/.test(query), addEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: key => tokens[key] }),
    localStorage: { getItem: key => storage[key] ?? null, setItem: (key, value) => { storage[key] = String(value); } },
    addEventListener(name, fn) { listeners[name] = fn; },
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const flight = sandbox.Flight, debug = flight.debug;
  const key = (name, type = 'keydown') => listeners[type]({ key: name, preventDefault() {}, target: null });
  return {
    flight, debug, elements, storage, key,
    get state() { return debug.state(); },
    step(seconds, dt = 1 / 60) { for (let t = 0; t < seconds; t += dt) { time += dt * 1000; debug.tick(dt); } },
    flushTimers() { timers.splice(0).forEach(fn => fn()); },
    cardVisible() { return !elements.fcard.classList.contains('hide'); },
  };
}

function rockAt(game, x, y, z, big = false) {
  game.state.rocks.push({ x, y, z, r: big ? .7 : .3, big, hp: big ? 3 : 1, m: { v: [[0, 0, 0]], f: [] },
    rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, vx: 0, vy: 0, tint: 0, flash: 0 });
}

test('launching drops the camera onto the ship, then waits on the start card', () => {
  const game = createFlight();
  let exited = null;
  game.flight.start({ heading: .7, onExit: page => { exited = page; } });
  assert.equal(game.state.mode, 'intro');
  game.step(2); game.flushTimers();
  assert.equal(game.state.mode, 'ready');
  assert(game.cardVisible(), 'the start card is shown');
  game.key(' ');
  assert.equal(game.state.mode, 'play');
  assert(!game.cardVisible(), 'the card hides during play');
  game.key('Escape'); assert.equal(game.state.mode, 'paused');
  game.key('Escape'); assert.equal(game.state.mode, 'play');
  game.key('Escape'); game.flight.close(-1);
  assert.equal(exited, -1);
  assert.equal(game.flight.active, false);
});

test('reduced motion skips the camera swing', () => {
  const game = createFlight({ reduced: true });
  game.flight.start({});
  assert.equal(game.state.mode, 'ready');
});

test('a long flight with steering and firing stays finite on phone and desktop', () => {
  for (const [width, height] of [[390, 844], [1280, 800], [667, 375]]) {
    const game = createFlight({ width, height });
    game.flight.start({}); game.step(2); game.key(' ');
    game.state.hull = 99;
    game.debug.fire(true);
    for (let second = 0; second < 40; second++) {
      const dir = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'][second % 4];
      game.debug.key(dir, true); if (second % 5 === 0) game.debug.key('shift', true);
      game.step(1);
      game.debug.key(dir, false); game.debug.key('shift', false);
      const { ship } = game.state, lane = game.debug.bounds();
      assert(ship.x >= lane.x0 && ship.x <= lane.x1 && ship.y >= lane.y0 && ship.y <= lane.y1, 'the ship stays inside its lane');
    }
    assert(game.state.sector >= 1 || game.state.mode === 'arrive', 'a sector is reachable in forty seconds');
    assert(game.state.score > 400);
  }
});

test('lasers break a rock that sits in the line of fire', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  const before = game.state.score;
  rockAt(game, game.state.ship.x, game.state.ship.y + .03, 14);
  game.key(' '); game.step(.4); game.key(' ', 'keyup');
  assert.equal(game.state.rocks.filter(r => r.z > 5).length, 0, 'the rock was destroyed');
  assert(game.state.score - before >= 40);
});

test('a big rock splits into two small ones', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  rockAt(game, 0, .03, 30, true);
  const target = game.state.rocks[0];
  target.hp = 1;
  game.debug.fire(true);
  for (let i = 0; i < 60 && !target.dead; i++) game.step(1 / 60);
  game.debug.fire(false);
  assert(target.dead, 'the rock broke');
  assert.equal(game.state.rocks.filter(r => !r.big).length, 2, 'into two fragments');
});

test('collisions cost hull, give a moment of grace, and end the run at zero', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  const hit = () => { rockAt(game, game.state.ship.x, game.state.ship.y, .8); game.step(1 / 60); };
  hit(); assert.equal(game.state.hull, 2);
  hit(); assert.equal(game.state.hull, 2, 'no damage while recovering');
  game.step(1.5); hit(); assert.equal(game.state.hull, 1);
  game.step(1.5); hit();
  assert.equal(game.state.mode, 'over');
  assert.equal(game.state.ship.alive, false);
  assert.equal(game.storage['flight-best'], String(Math.round(game.state.score)));
  game.key(' ');
  assert.equal(game.state.mode, 'play'); assert.equal(game.state.hull, 3);
});

test('rings refill the boost and repair cells restore hull', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  game.state.boost = .2;
  game.state.rings.push({ x: game.state.ship.x, y: game.state.ship.y, z: 3, r: .62, hit: -1, missed: false });
  game.step(.5);
  assert(game.state.boost > .55);
  game.state.hull = 2;
  game.state.cells.push({ x: game.state.ship.x, y: game.state.ship.y, z: 2, ry: 0, s: .16 });
  game.step(.3);
  assert.equal(game.state.hull, 3);
});

test('reaching a world pays a bonus, and the player can keep flying or land there', () => {
  const game = createFlight();
  let landed = null;
  game.flight.start({ onExit: page => { landed = page; } }); game.step(2); game.key(' ');
  game.state.dist = 1e6; game.step(1 / 60);
  assert.equal(game.state.mode, 'arrive');
  assert(game.state.bonus >= 500);
  game.key(' ');
  assert.equal(game.state.mode, 'play'); assert.equal(game.state.sector, 1);
  game.state.dist = 1e6; game.step(1 / 60);
  game.key('l');
  assert.equal(landed, 1, 'landing opens the matching page');
});

test('drones only appear after the first world and fire back', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  game.state.hull = 99;
  game.step(20);
  assert.equal(game.state.aliens.length, 0, 'the first sector teaches rocks and rings only');
  game.state.sector = 2; game.state.dist = 0; game.state.gap.alien = 0;
  let fired = false;
  for (let i = 0; i < 12 && !fired; i++) { game.step(1); fired = game.state.shots.length > 0; }
  assert(fired, 'a drone opened fire');
});

test('the lane grows with the screen and reaches most of it', () => {
  const sizes = [[390, 844], [1280, 800], [1920, 1080]].map(([width, height]) => {
    const game = createFlight({ width, height }); game.flight.start({});
    const lane = { ...game.debug.bounds() };
    /* The ship's middle can reach within a tenth of each side and well up the page. */
    assert(lane.sx + lane.kx * lane.x1 > width * .78, `${width}px: the lane reaches the right side`);
    assert(lane.sy + lane.ky * lane.y1 < height * .3, `${width}px: the lane reaches the upper part of the page`);
    return lane.x1;
  });
  assert(sizes[0] < sizes[1] && sizes[1] < sizes[2], 'wider screens get a wider lane');
});

test('only what is lined up with the ship is marked as a threat', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  const { ship } = game.state;
  assert(game.debug.threat({ x: ship.x + .1, y: ship.y - .1, z: 20, r: .4 }));
  assert(!game.debug.threat({ x: ship.x + 1.2, y: ship.y, z: 20, r: .4 }), 'off to the side');
  assert(!game.debug.threat({ x: ship.x, y: ship.y + 1.2, z: 20, r: .4 }), 'level in x but well above');
  assert(!game.debug.threat({ x: ship.x, y: ship.y, z: -.5, r: .4 }), 'already behind');
});

test('a hull hit freezes the next frames, and reduced motion does not', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  rockAt(game, game.state.ship.x, game.state.ship.y, .8);
  game.debug.frame(1 / 60);
  assert.equal(game.state.hull, 2);
  assert.equal(game.state.hitstop, 4, 'a hull hit holds four frames');
  const dist = game.state.dist;
  game.debug.frame(1 / 60);
  assert.equal(game.state.dist, dist, 'the next frame is drawn without simulating');
  assert.equal(game.state.hitstop, 3);

  const calm = createFlight({ reduced: true });
  calm.flight.start({}); calm.step(2); calm.key(' ');
  rockAt(calm, calm.state.ship.x, calm.state.ship.y, .8);
  calm.debug.frame(1 / 60);
  assert.equal(calm.state.hull, 2);
  assert.equal(calm.state.hitstop, 0, 'reduced motion skips the freeze');
});

test('destroying a rock freezes the sim for two frames', () => {
  const game = createFlight();
  game.flight.start({}); game.step(2); game.key(' ');
  game.debug.god(true);
  rockAt(game, game.state.ship.x, game.state.ship.y + .03, 8);
  const rock = game.state.rocks[game.state.rocks.length - 1];
  rock.hp = 1;
  game.debug.fire(true);
  for (let i = 0; i < 60 && !rock.dead; i++) game.debug.frame(1 / 60);
  assert(rock.dead, 'the rock broke');
  assert.equal(game.state.hitstop, 2);
});

test('a run starts at the page after the one Starship left from', () => {
  for (const [from, first] of [[undefined, 'To About'], [-1, 'To About'], [0, 'To Projects'], [1, 'To Experience'], [4, 'To About']]) {
    const game = createFlight();
    game.flight.start({ from });
    assert.equal(game.elements.fname.textContent, first, `launched from ${from}`);
  }
  const game = createFlight();
  let landed = null;
  game.flight.start({ from: 0, onExit: page => { landed = page; } }); game.step(2); game.key(' ');
  game.state.dist = 1e6; game.step(1 / 60);
  game.key('l');
  assert.equal(landed, 1, 'launched from About, the first world is Projects');
});
