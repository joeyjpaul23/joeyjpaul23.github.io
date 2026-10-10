const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

function createScene(reduced = false) {
  let time = 0, scheduled = 0;
  const viewport = { width: 1280, height: 850 };
  const listeners = {}, terrainCanvases = [];
  const sky = context(), mini = context();
  function context() {
    let matrix = [1, 0, 0, 1, 0, 0], stack = [], clip = [-Infinity, -Infinity, Infinity, Infinity], pendingRect;
    const ctx = { globalAlpha: 1, bounds: [], fillCount: 0, clipRects: [] };
    function point(x, y) {
      const p = [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
      assert(p.every(Number.isFinite), 'drawing coordinates must be finite');
      ctx.bounds.push([Math.max(clip[0], Math.min(clip[2], p[0])), Math.max(clip[1], Math.min(clip[3], p[1]))]);
    }
    Object.assign(ctx, {
      setTransform(...value) { matrix = value; },
      save() { stack.push({ matrix: matrix.slice(), clip: clip.slice() }); },
      restore() { const saved = stack.pop(); matrix = saved.matrix; clip = saved.clip; },
      rect(x, y, w, h) { pendingRect = [x, y, x + w, y + h]; },
      clip() { clip = [Math.max(clip[0], pendingRect[0]), Math.max(clip[1], pendingRect[1]), Math.min(clip[2], pendingRect[2]), Math.min(clip[3], pendingRect[3])]; ctx.clipRects.push(clip.slice()); },
      translate(x, y) { matrix[4] += matrix[0] * x + matrix[2] * y; matrix[5] += matrix[1] * x + matrix[3] * y; },
      scale(x, y) { matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; },
      rotate(a) {
        const [a0, b, c, d, e, f] = matrix, co = Math.cos(a), si = Math.sin(a);
        matrix = [a0 * co + c * si, b * co + d * si, c * co - a0 * si, d * co - b * si, e, f];
      },
      moveTo: point, lineTo: point,
      bezierCurveTo(...points) { for (let i = 0; i < points.length; i += 2) point(points[i], points[i + 1]); },
      quadraticCurveTo(...points) { for (let i = 0; i < points.length; i += 2) point(points[i], points[i + 1]); },
      arc(x, y, r) { point(x - r, y - r); point(x + r, y + r); },
      fillRect(x, y, w, h) { point(x, y); point(x + w, y + h); },
      drawImage(image, x, y, w, h) { point(x, y); point(x + w, y + h); },
      measureText(text) { return { width: text.length * 8 }; },
      fillText(text, x, y) { point(x, y - 15); point(x + text.length * 8, y + 3); },
      createLinearGradient() { return { addColorStop() {} }; },
      clearRect() { ctx.bounds = []; }, beginPath() {}, closePath() {}, fill() { ctx.fillCount++; }, stroke() {}, ellipse() {},
    });
    return ctx;
  }
  function rect(id) {
    const W = viewport.width, H = viewport.height, wide = W >= 820 || (W >= 650 && H <= 550);
    if (id === 'intro') return { right: W * .45, bottom: wide && H < 550 ? 230 : 260 };
    if (id === 'panel') return { right: wide ? Math.min(480, W * .4) + Math.min(64, W * .05) : W - 22, bottom: wide ? H - 72 : H - 232 };
    return { left: 0, top: 0, right: W, bottom: H };
  }
  function element(id) {
    const attributes = {};
    return { classList: { toggle() {} }, style: {}, clientWidth: 300, clientHeight: 120, attributes,
      getContext: () => id === 'mini' ? mini : sky,
      getBoundingClientRect: () => rect(id), setPointerCapture() {},
      setAttribute(name, value) { attributes[name] = value; },
      getAttribute(name) { return name in attributes ? attributes[name] : null; },
      addEventListener(name, fn) { listeners[id + ':' + name] = fn; },
      animate: () => ({ finished: new Promise(() => {}), cancel() {} }) };
  }
  const elements = {};
  const sandbox = { Math, performance: { now: () => time }, devicePixelRatio: 1,
    innerWidth: viewport.width, innerHeight: viewport.height,
    document: { documentElement: { dataset: {}, classList: { add() {}, remove() {} } }, createElement: () => { const ctx = context(), canvas = { ctx, getContext: () => ctx }; terrainCanvases.push(canvas); return canvas; }, getElementById: id => elements[id] ||= element(id), querySelectorAll: () => Array.from({ length: 5 }, () => element('section')) },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: value => value }),
    addEventListener(name, fn) { listeners[name] = fn; }, setInterval() {}, setTimeout(fn) { fn(); },
    requestAnimationFrame() { scheduled++; }, resetBounds() { sky.bounds = []; },
  };
  vm.createContext(sandbox);
  const hooks = `
    globalThis.sceneTest={go,frame,ship,world,view,hit,landOn,getLanding:()=>landing,getSite:()=>landingSite,getPlanets:()=>M,getTime:()=>tt,getLabels:()=>labels,
      setView:(a,b,z)=>{yaw=a;pit=b;zoom=tz=z;vy=vp=0},
      getMeteor:()=>meteor};
    var originalDrawShip=drawShip;
    drawShip=function(p,length,heading,burn){globalThis.lastBurn=burn;globalThis.lastHeading=heading;globalThis.lastShip=[p[0],p[1],length];originalDrawShip(p,length,heading,burn)};
    rs();frame(1);`;
  vm.runInContext(source.replace('shootingStar();', 'shootingStar();globalThis.resetBounds();').replace('rs();frame(1);', hooks), sandbox);
  return { state: sandbox.sceneTest, sandbox, sky, listeners, terrainCanvases,
    get scheduled() { return scheduled; },
    resize(width, height) { viewport.width = sandbox.innerWidth = width; viewport.height = sandbox.innerHeight = height; listeners.resize(); },
    step(count = 1) { for (let i = 0; i < count; i++) { time += 1000 / 60; sandbox.sceneTest.frame(0); } },
    assertVisible() { for (const [x, y] of sky.bounds) assert(x >= 0 && x <= viewport.width && y >= 0 && y <= viewport.height, `point ${x},${y} escaped ${viewport.width}x${viewport.height}`); },
  };
}

test('the engine burns throughout a transfer and stops on arrival', () => {
  const scene = createScene();
  scene.state.go(0); scene.step(170);
  scene.state.go(1);
  for (let i = 0; i < 150; i++) { scene.step(); assert.equal(scene.sandbox.lastBurn, 1); }
  scene.step(15); assert.equal(scene.sandbox.lastBurn, 0);
});

test('orbit radius is stable after resizing and zooming', () => {
  const scene = createScene(); scene.state.go(3); scene.step(170);
  for (const [width, height] of [[390, 844], [1440, 900], [667, 375]]) {
    scene.resize(width, height); scene.state.setView(2, .8, 1.6); scene.step(10);
    const m = scene.state.getPlanets()[3], center = scene.state.world(Math.cos(m.a) * m.r, 0, Math.sin(m.a) * m.r, m.i, m.o);
    const radius = Math.hypot(...scene.state.ship.position.map((v, i) => v - center[i]));
    assert(Math.abs(radius - .28) < 1e-8);
  }
});

test('scene, labels and full flame stay on-screen through navigation, rotation and zoom', () => {
  const scene = createScene();
  for (const [width, height] of [[320, 568], [390, 844], [667, 375], [820, 600], [1280, 850], [1920, 1080]]) {
    scene.resize(width, height);
    for (const page of [-1, 0, 1, 2, 3, 4, -1]) {
      scene.state.go(page);
      for (let i = 0; i < 100; i++) {
        scene.state.setView(i * .17, Math.sin(i * .13) * 1.25, i % 2 ? 1.6 : .7);
        scene.step(); scene.assertVisible();
        const labels = scene.state.getLabels();
        for (let a = 0; a < labels.length; a++) for (let b = a + 1; b < labels.length; b++) {
          const first = labels[a], second = labels[b];
          assert(first.x + first.w <= second.x || second.x + second.w <= first.x || Math.abs(first.y - second.y) >= 18, 'destination labels overlap');
        }
      }
    }
  }
});

test('reduced-motion navigation keeps Starship parked without flames or animation', () => {
  const scene = createScene(true); scene.state.go(2);
  assert.equal(scene.scheduled, 0); assert.equal(scene.sandbox.lastBurn, 0);
  assert.equal(scene.state.ship.from, null); assert.equal(scene.state.getMeteor(), null);
  scene.assertVisible();
});

test('landing leaves the other destinations clickable in the sky and Back to orbit restores all five', () => {
  const scene = createScene();
  for (const page of [0, 1, 2, 3, 4]) {
    scene.state.go(page); scene.step(175);
    assert.equal(scene.state.view.amount, 1);
    assert.equal(scene.state.view.planet, page);
    const labels = scene.state.getLabels();
    assert.equal(labels.length, 4);
    assert(labels.every(label => label.i !== page));
    for (const label of labels) assert.equal(scene.state.hit(label.x + label.w / 2, label.y - 4), label.i);
    scene.assertVisible();
  }
  scene.listeners['top:click'](); scene.step(175);
  assert.equal(scene.state.view.amount, 0);
  assert.equal(scene.state.getLabels().length, 5);
});

test('reduced-motion landscape switches and returns without an animated approach', () => {
  const scene = createScene(true);
  for (const page of [0, 2, 3, 4]) {
    scene.state.go(page);
    assert.equal(scene.state.view.amount, 1); assert.equal(scene.state.view.planet, page);
    assert.equal(scene.state.getLabels().length, 4); scene.assertVisible();
  }
  scene.state.go(-1);
  assert.equal(scene.state.view.amount, 0); assert.equal(scene.state.getLabels().length, 5);
  assert.equal(scene.scheduled, 0);
});

test('the Experience landscape paints its frozen lake, trees and snowfall without escaping the viewport', () => {
  const scene = createScene(); scene.state.go(4); scene.step(180);
  assert.equal(scene.state.view.planet, 4);
  const terrain = scene.terrainCanvases[0].ctx;
  assert(terrain.fillCount > 500, 'terrain should be painted');
  scene.step(30); scene.assertVisible();
});

test('terrain spans the viewport and reuses its rendering until the camera changes', () => {
  const scene = createScene(); scene.state.go(1); scene.step(180);
  assert.equal(scene.terrainCanvases.length, 1);
  const terrain = scene.terrainCanvases[0].ctx;
  assert(terrain.clipRects.every(rect => rect[0] === 0 && rect[1] === 0 && rect[2] === 1280 && rect[3] === 850), 'terrain must not be cropped to the right-hand panel');
  const fills = terrain.fillCount;
  scene.step(60);
  assert.equal(terrain.fillCount, fills, 'ship and star animations should reuse settled terrain');
  scene.state.view.pan += .4; scene.step();
  assert(terrain.fillCount > fills, 'dragging must update terrain perspective');
});

test('catching Starship opens Flight, holds the orbit still, and can land on a page', () => {
  const scene = createScene(); scene.step(30);
  const flights = []; scene.sandbox.Flight = { start: options => flights.push(options) };
  const at = { clientX: scene.state.ship.screen[0] * 1280, clientY: scene.state.ship.screen[1] * 850, pointerId: 1 };
  assert.equal(scene.state.hit(at.clientX, at.clientY), -1, 'no label sits over the ship in this frame');
  scene.listeners['sky:pointerdown'](at); scene.listeners['sky:pointerup'](at);
  assert.equal(flights.length, 1);
  assert.equal(typeof flights[0].heading, 'number');
  const frozen = scene.state.getTime(); scene.step(30);
  assert.equal(scene.state.getTime(), frozen, 'the orbit stops drawing while the game runs');
  scene.listeners.keydown({ key: '2' });
  assert.equal(scene.state.view.target, 0, 'orbit keys are ignored during flight');
  flights[0].onExit(2); scene.step(175);
  assert(scene.state.getTime() > frozen);
  assert.equal(scene.state.view.planet, 2); assert.equal(scene.state.view.amount, 1);
  scene.listeners.keydown({ key: 'f' });
  assert.equal(flights.length, 2, 'F opens Flight from the keyboard');
});

test('Land here belly-flops Starship onto a flat pad, and leaving lifts it off first', () => {
  const scene = createScene();
  scene.state.landOn(1);
  const burns = new Set();
  for (let i = 0; i < 420; i++) {
    scene.step(); scene.assertVisible();
    if (scene.state.getLanding().state === 'descent') burns.add(scene.sandbox.lastBurn > 0 ? 'lit' : 'dark');
  }
  assert(burns.has('dark') && burns.has('lit'), 'falls unlit, then relights to land');
  assert.equal(scene.state.getLanding().state, 'landed');
  assert.equal(scene.sandbox.lastBurn, 0);
  const lean = scene.sandbox.lastHeading + Math.PI / 2;
  assert(Math.abs(Math.atan2(Math.sin(lean), Math.cos(lean))) < 1e-6, 'standing upright');
  const [sx, sy, length] = scene.sandbox.lastShip, site = scene.state.getSite().at;
  assert(Math.abs(sx - site[0]) < 1 && Math.abs(sy + length / 2 - site[1]) < 1, 'resting on the pad');
  assert(site[0] > 520, 'the pad is right of the text');
  scene.state.go(3); scene.step(20);
  assert.equal(scene.state.getLanding().state, 'takeoff');
  assert.equal(scene.sandbox.lastBurn, 1);
  assert(scene.sandbox.lastShip[1] < sy, 'rising off the pad');
  for (let i = 0; i < 200; i++) { scene.step(); scene.assertVisible(); }
  assert.equal(scene.state.getLanding().state, null);
  assert.equal(scene.state.view.planet, 3);
});

test('reduced motion lands and leaves without an animation', () => {
  const scene = createScene(true);
  scene.state.landOn(2);
  assert.equal(scene.state.getLanding().state, 'landed');
  assert.equal(scene.sandbox.lastBurn, 0);
  scene.state.go(0);
  assert.equal(scene.state.getLanding().state, null);
  assert.equal(scene.scheduled, 0);
});

test('every world offers a dry pad right of the text', () => {
  const scene = createScene(true);
  for (let n = 0; n < scene.state.getPlanets().length; n++) {
    scene.state.landOn(n);
    assert.equal(scene.state.getLanding().state, 'landed', `landed on world ${n}`);
    assert.equal(scene.state.getSite().planet, n);
    assert(scene.state.getSite().at[0] > 520);
  }
});

test('pages run About, Projects, Experience, Skills, Contact, and each keeps its own landscape', () => {
  const scene = createScene();
  assert.equal(JSON.stringify(scene.state.getPlanets().map(m => m.n)), JSON.stringify(['About', 'Projects', 'Experience', 'Skills', 'Contact']));
  assert.equal(JSON.stringify(scene.state.getPlanets().map(m => m.k)), '[0,1,4,2,3]', 'art ids stay with their planets');
});

test('the landing moves without a hitch', () => {
  const scene = createScene();
  scene.state.landOn(3);
  let last = null, step = null, heading = null, worstSpeed = 0, worstTurn = 0;
  for (let i = 0; i < 430; i++) {
    scene.step();
    const [px, py] = scene.sandbox.lastShip, h = scene.sandbox.lastHeading;
    if (scene.state.getLanding().state !== 'descent') { last = null; continue; }
    if (last) {
      const d = [px - last[0], py - last[1]];
      if (step) worstSpeed = Math.max(worstSpeed, Math.hypot(d[0] - step[0], d[1] - step[1]));
      worstTurn = Math.max(worstTurn, Math.abs(Math.atan2(Math.sin(h - heading), Math.cos(h - heading))));
      step = d;
    }
    last = [px, py]; heading = h;
  }
  assert.equal(scene.state.getLanding().state, 'landed');
  assert(worstSpeed < 1.5, `speed changes by at most 1.5px per frame (was ${worstSpeed.toFixed(2)})`);
  assert(worstTurn < .09, `heading turns at most .09 rad per frame (was ${worstTurn.toFixed(3)})`);
});
