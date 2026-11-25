/* The ASCII sky for the reworked site (next/).
 *
 * One 2D canvas, drawn as a grid of monospace characters. Every cell gets its own colour, and
 * shading runs through a 22-step density ramp, so a planet reads as a lit sphere with terrain,
 * clouds, ice, craters or bands rather than as a ring of symbols. Each world's surface is baked
 * once into a small equirectangular texture; a frame only rotates, lights and looks it up.
 *
 *   orbit  the home view: a large sun off the right edge, the five worlds on dotted orbits,
 *          each lit from the sun's side
 *   world  a page: that page's world large on the right, the other four small in its sky
 *   sats   the Projects figure: an Earth with real satellites around it (from engine/sats.js)
 *
 * Labels are real links laid over the canvas. The scene redraws about eight times a second,
 * stops when the tab is hidden, and draws a single still frame under reduced motion.
 */
(function () {
  "use strict";

  var PI = Math.PI, TAU = PI * 2, HP = PI / 2;
  var RAMP = " .',:;-~=+*ixoeO0%#&8@";
  var NR = RAMP.length, RC = [], CS = [];
  for (var ri = 0; ri < NR; ri++) RC.push(RAMP.charCodeAt(ri));
  for (var ci = 0; ci < 128; ci++) CS.push(String.fromCharCode(ci));

  /* ── Noise ─────────────────────────────────────────────────────────────────────────── */
  var P = new Uint8Array(512);
  (function () {
    var a = [], s = 20261125;
    for (var i = 0; i < 256; i++) a.push(i);
    for (var j = 255; j > 0; j--) { s = (s * 16807) % 2147483647; var k = s % (j + 1), tmp = a[j]; a[j] = a[k]; a[k] = tmp; }
    for (var m = 0; m < 512; m++) P[m] = a[m & 255];
  })();
  function vn(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var X = xi & 255, Y = yi & 255, Z = zi & 255;
    var A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    var x1 = P[AA] + (P[BA] - P[AA]) * u, x2 = P[AB] + (P[BB] - P[AB]) * u;
    var x3 = P[AA + 1] + (P[BA + 1] - P[AA + 1]) * u, x4 = P[AB + 1] + (P[BB + 1] - P[AB + 1]) * u;
    var y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
    return (y1 + (y2 - y1) * w) / 255;
  }
  function fbm(x, y, z, o) { var s = 0, a = 0.5, f = 1, n = 0; for (var i = 0; i < o; i++) { s += a * vn(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.02; } return s / n; }
  function hash(n) { var s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
  function sm(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function mix(a, b, t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* ── Palettes ──────────────────────────────────────────────────────────────────────── */
  var C = {
    deep: [20, 58, 92], shallow: [58, 134, 166], sand: [196, 182, 138], lowg: [82, 124, 68], highg: [142, 162, 96], rock: [148, 136, 112], snow: [236, 240, 236],
    rustd: [104, 42, 22], rustl: [224, 132, 78], canyon: [66, 26, 16], basin: [86, 40, 28], rim: [242, 176, 126], floor: [98, 44, 26],
    iced: [118, 156, 188], icel: [238, 246, 252], frozen: [92, 146, 188], crack: [58, 116, 166], pine: [44, 84, 72],
    teald: [14, 74, 70], teall: [126, 212, 194], slate: [62, 108, 118], storm: [210, 252, 238],
    vsead: [28, 24, 66], vseal: [60, 56, 118], vlow: [90, 64, 126], vmid: [148, 108, 188], vhigh: [212, 182, 234],
    moond: [70, 72, 78], moonl: [196, 196, 200], mrim: [226, 226, 230], mfloor: [60, 62, 68]
  };
  var WARM = [255, 207, 138], SUN_CORE = [255, 246, 214], SUN_EDGE = [242, 140, 52];
  var STN = [214, 224, 232], STW = [255, 222, 186], STB = [186, 204, 255];
  var ATM = { about: [130, 190, 255], projects: [255, 168, 112], experience: [196, 228, 255], skills: [136, 236, 216], contact: [186, 146, 255] };
  var LIT = { about: [255, 212, 150], projects: [255, 200, 140], experience: [255, 196, 120], skills: [210, 255, 240], contact: [226, 208, 255] };
  var TILT = { about: 0.41, projects: 0.25, experience: -0.3, skills: 0.28, contact: 0.35, moon: 0.1, sun: 0.12 };
  var NUM = { about: "1", projects: "2", experience: "3", skills: "4", contact: "5" };
  var IDS = ["about", "projects", "experience", "skills", "contact"];
  var WL = (function () { var x = -0.55, y = -0.42, z = 0.72, l = Math.sqrt(x * x + y * y + z * z); return [x / l, y / l, z / l]; })();

  /* ── Surfaces, baked once per world ────────────────────────────────────────────────── */
  function craters(n, seed, rmin, rmax) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var u = hash(seed + i * 3.1) * 2 - 1, th = hash(seed + i * 7.7) * TAU, s = Math.sqrt(1 - u * u);
      out.push([s * Math.cos(th), u, s * Math.sin(th), rmin + (rmax - rmin) * Math.pow(hash(seed + i * 1.3), 2)]);
    }
    return out;
  }
  function craterMix(c, x, y, z, cr, hh, rimC, floorC) {
    for (var q = 0; q < cr.length; q++) {
      var k = cr[q], dot = x * k[0] + y * k[1] + z * k[2];
      if (dot < 1 - k[3] * k[3] * 0.5) continue;
      var f = Math.sqrt(Math.max(0, 2 - 2 * dot)) / k[3];
      if (f >= 1) continue;
      if (f > 0.78) { c = mix(c, rimC, 0.55); hh += 0.14; }
      else { c = mix(c, floorC, 0.5 - f * 0.25); hh -= 0.1; }
    }
    return [c, hh];
  }

  /* Each returns [r, g, b, water, lights, height]. Lights 255 marks the one warm window. */
  var MAT = {
    about: function (x, y, z, lat) {
      var e = fbm(x * 1.7 + 3.1, y * 1.7 - 1.3, z * 1.7 + 0.4, 5);
      if (Math.abs(lat) > 1.16 + (vn(x * 6, y * 6, z * 6) - 0.5) * 0.3) return [234, 240, 240, 0, 0, 190];
      if (e < 0.5) { var c = mix(C.shallow, C.deep, (0.5 - e) / 0.12); return [c[0], c[1], c[2], 1, 0, 70]; }
      var a = (e - 0.5) / 0.2;
      if (a > 0.1 && a < 0.6 && vn(x * 9 + 2, y * 9, z * 9) < 0.2) return [C.shallow[0], C.shallow[1], C.shallow[2], 1, 0, 80];
      var c2 = a < 0.07 ? C.sand : a < 0.5 ? mix(C.lowg, C.highg, a / 0.5) : a < 0.85 ? mix(C.highg, C.rock, (a - 0.5) / 0.35) : mix(C.rock, C.snow, (a - 0.85) / 0.25);
      var li = a < 0.45 && vn(x * 38, y * 38, z * 38) > 0.8 ? 190 : 0;
      return [c2[0], c2[1], c2[2], 0, li, 140 + a * 110];
    },
    projects: function (x, y, z, lat, cr) {
      var e = fbm(x * 2.1 + 7, y * 2.1, z * 2.1 - 3, 5);
      var c = mix(C.rustd, C.rustl, sm((e - 0.32) / 0.4));
      var cn = Math.abs(fbm(x * 2.4 + 1.7, y * 2.4, z * 2.4, 3) - 0.5);
      c = mix(c, C.canyon, sm((0.02 - cn) / 0.012) * 0.75);
      if (e < 0.42) c = mix(c, C.basin, (0.42 - e) / 0.12 * 0.7);
      var res = craterMix(c, x, y, z, cr, e, C.rim, C.floor);
      c = res[0];
      if (Math.abs(lat) > 1.32) c = mix(c, [236, 204, 176], 0.65);
      return [c[0], c[1], c[2], 0, 0, res[1] * 255];
    },
    experience: function (x, y, z, lat) {
      var e = fbm(x * 1.9 + 11, y * 1.9, z * 1.9 + 5, 5);
      var c = mix(C.iced, C.icel, sm((e - 0.36) / 0.3)), water = 0;
      if (e < 0.43) { c = mix(C.frozen, c, sm((e - 0.36) / 0.07) * 0.5); water = 1; }
      var cn = Math.abs(fbm(x * 3.4 + 2, y * 3.4, z * 3.4, 3) - 0.5);
      c = mix(c, C.crack, sm((0.018 - cn) / 0.012) * 0.8);
      var forest = Math.abs(lat) < 0.75 && e > 0.5 && vn(x * 20, y * 20, z * 20) > 0.7;
      if (forest) c = mix(c, C.pine, 0.55);
      var li = forest && vn(x * 64, y * 64, z * 64) > 0.86 ? 230 : 0;
      return [c[0], c[1], c[2], water, li, 128 + (e - 0.5) * 300];
    },
    skills: function (x, y, z, lat) {
      var tb = fbm(x * 2.4 + 5, y * 2.4, z * 2.4, 4) - 0.5;
      var b = Math.sin(lat * 12 + tb * 6), b2 = Math.sin(lat * 29 + tb * 10);
      var c = mix(C.teald, C.teall, b * 0.5 + 0.5);
      c = mix(c, C.slate, (b2 * 0.5 + 0.5) * 0.35);
      var dx = x - 0.55, dy = (y + 0.38) * 1.9, dz = z - 0.74, sd = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (sd < 0.28) { var f = sd / 0.28, sw = Math.sin(f * 16 + Math.atan2(dy, dx) * 2); c = mix(c, C.storm, (1 - f) * 0.75 + sw * 0.08); }
      return [c[0], c[1], c[2], 0, 0, 128 + b * 50];
    },
    contact: function (x, y, z) {
      var e = fbm(x * 2 + 17, y * 2, z * 2 - 9, 5);
      if (e < 0.48) { var c = mix(C.vseal, C.vsead, (0.48 - e) / 0.12); return [c[0], c[1], c[2], 1, 0, 70]; }
      var a = (e - 0.48) / 0.2;
      var c2 = a < 0.5 ? mix(C.vlow, C.vmid, a / 0.5) : mix(C.vmid, C.vhigh, (a - 0.5) / 0.5);
      var li = a < 0.6 && vn(x * 34, y * 34, z * 34) > 0.8 ? 150 : 0;
      return [c2[0], c2[1], c2[2], 0, li, 140 + a * 110];
    },
    moon: function (x, y, z, lat, cr) {
      var e = fbm(x * 3 + 2, y * 3, z * 3, 4);
      var res = craterMix(mix(C.moond, C.moonl, sm((e - 0.3) / 0.4)), x, y, z, cr, e, C.mrim, C.mfloor);
      return [res[0][0], res[0][1], res[0][2], 0, 0, res[1] * 255];
    },
    sun: function (x, y, z) {
      var g = sm((fbm(x * 6 + 1, y * 6, z * 6, 4) - 0.3) / 0.4);
      return [g * 255, 0, 0, 0, 0, 128];
    }
  };
  function cloudAt(kind, x, y, z) {
    var c = fbm(x * 2.6 + 20, y * 4.2, z * 2.6 - 4, 5), thr = kind === "experience" ? 0.6 : 0.55;
    return (c - thr) / 0.12 * 255;
  }
  function makeTex(kind, tw, th) {
    var n = tw * th;
    var T = { w: tw, h: th, r: new Uint8ClampedArray(n), g: new Uint8ClampedArray(n), b: new Uint8ClampedArray(n),
      water: new Uint8Array(n), lights: new Uint8ClampedArray(n), hgt: new Uint8ClampedArray(n), cloud: null };
    var cr = kind === "projects" ? craters(22, 7, 0.05, 0.2) : kind === "moon" ? craters(30, 31, 0.05, 0.26) : null;
    var f = MAT[kind], cloudy = kind === "about" || kind === "contact" || kind === "experience";
    if (cloudy) T.cloud = new Uint8ClampedArray(n);
    for (var j = 0; j < th; j++) {
      var lat = HP - (j + 0.5) / th * PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (var i = 0; i < tw; i++) {
        var lon = (i + 0.5) / tw * TAU - PI, x = cl * Math.sin(lon), y = sl, z = cl * Math.cos(lon);
        var m = f(x, y, z, lat, cr), k = j * tw + i;
        T.r[k] = m[0]; T.g[k] = m[1]; T.b[k] = m[2]; T.water[k] = m[3] ? 1 : 0; T.lights[k] = m[4]; T.hgt[k] = m[5];
        if (cloudy) T.cloud[k] = cloudAt(kind, x, y, z);
      }
    }
    if (kind === "contact") {
      var iu = Math.floor(tw * 0.62), iv = Math.floor(th * 0.38);
      for (var p = 0; p < 2; p++) for (var q = 0; q < 2; q++) T.lights[(iv + q) * tw + iu + p] = 255;
    }
    return T;
  }
  var TEXC = {};
  function tex(kind, w, h) { var key = kind + ":" + w; if (!TEXC[key]) TEXC[key] = makeTex(kind, w, h); return TEXC[key]; }
  var RING = (function () {
    var a = new Uint8ClampedArray(160);
    for (var i = 0; i < 160; i++) {
      var rr = 1.28 + i / 159 * 1.02;
      var d = 0.55 + 0.25 * Math.sin(rr * 41) + 0.2 * Math.sin(rr * 97 + 1.3);
      if (rr > 1.74 && rr < 1.8) d *= 0.08;
      if (rr < 1.36) d *= (rr - 1.28) / 0.08;
      if (rr > 2.2) d *= (2.3 - rr) / 0.1;
      a[i] = d * 255;
    }
    return a;
  })();

  /* ── The character grid ────────────────────────────────────────────────────────────── */
  function plot(S, i, col, lum, R, G, B, code) {
    var f = S.fade[col];
    lum *= f;
    if (!code) {
      if (lum < 0.035) { S.ch[i] = 0; return; }
      var gi = Math.round(lum * (NR - 1));
      if (gi < 1) gi = 1; else if (gi > NR - 1) gi = NR - 1;
      code = RC[gi];
    }
    var m = 0.3 + 0.7 * f;
    if (S.paper) { R = (R * 0.5 + 12) * m + 231 * (1 - m); G = (G * 0.5 + 21) * m + 231 * (1 - m); B = (B * 0.5 + 22) * m + 220 * (1 - m); }
    else { m *= 1.18; R *= m; G *= m; B *= m; }
    S.ch[i] = code; S.cr[i] = R; S.cg[i] = G; S.cb[i] = B;
  }
  function cellAt(S, x, y) {
    var c = Math.floor(x / S.cw), r = Math.floor(y / S.chh);
    if (c < 0 || r < 0 || c >= S.cols || r >= S.rows) return -1;
    return r * S.cols + c;
  }
  function ringPlot(S, i, col, rh) { var m = 0.35 + 0.65 * rh; plot(S, i, col, rh * 0.72, 206 * m, 230 * m, 220 * m, 0); }

  /* One body: a lit, textured sphere with optional atmosphere, ring and night lights, or the
     sun (emit) and its corona. Drawn far to near, so a later body covers an earlier one. */
  function body(S, o) {
    var cw = S.cw, chh = S.chh, cols = S.cols, rows = S.rows, r = o.r;
    if (r < 2) return;
    var corona = o.part === "corona";
    var ex = corona ? 1.7 : o.ring ? 2.32 : o.atm ? 1.15 : 1.01;
    var ey = corona ? 1.7 : o.ring ? 1.45 : ex;
    var c0 = Math.max(0, Math.floor((o.x - r * ex) / cw)), c1 = Math.min(cols - 1, Math.ceil((o.x + r * ex) / cw));
    var r0 = Math.max(0, Math.floor((o.y - r * ey) / chh)), r1 = Math.min(rows - 1, Math.ceil((o.y + r * ey) / chh));
    if (c0 > c1 || r0 > r1) return;
    var L = o.L || WL, L0 = L[0], L1 = L[1], L2 = L[2];
    var hx = L0, hy = L1, hz = L2 + 1, hl = Math.sqrt(hx * hx + hy * hy + hz * hz);
    hx /= hl; hy /= hl; hz /= hl;
    var cT = Math.cos(o.tilt || 0), sT = Math.sin(o.tilt || 0), cS = Math.cos(o.spin || 0), sS = Math.sin(o.spin || 0);
    var T = o.tex, tw = T ? T.w : 1, th = T ? T.h : 1;
    var atm = o.atm, aw = 0.14, aw2 = (1 + aw) * (1 + aw);
    var ring = o.ring, sI = 0.33, cP = Math.cos(-0.28), sP = Math.sin(-0.28);
    var csh = Math.floor(((((o.cloud || 0) % 1) + 1) % 1) * tw);
    var lc = o.lightCol || WARM, tt = o.t || 0;
    for (var row = r0; row <= r1; row++) {
      var dy = ((row + 0.5) * chh - o.y) / r;
      for (var col = c0; col <= c1; col++) {
        var dx = ((col + 0.5) * cw - o.x) / r, d2 = dx * dx + dy * dy, i = row * cols + col;
        if (corona) {
          if (d2 <= 1 || d2 >= 2.89) continue;
          var dc = Math.sqrt(d2), an = Math.atan2(dy, dx);
          var nv = vn(Math.cos(an) * 2.4 + tt * 0.04, Math.sin(an) * 2.4, dc * 1.8 - tt * 0.1);
          var fl = Math.pow(1 - (dc - 1) / 0.7, 2.4) * (0.35 + 0.95 * nv);
          if (fl * 0.8 > 0.04) {
            var mc = (fl > 1 ? 1 : fl) * 0.7;
            plot(S, i, col, fl * 0.8, SUN_EDGE[0] + (SUN_CORE[0] - SUN_EDGE[0]) * mc, SUN_EDGE[1] + (SUN_CORE[1] - SUN_EDGE[1]) * mc, SUN_EDGE[2] + (SUN_CORE[2] - SUN_EDGE[2]) * mc, 0);
          }
          continue;
        }
        var rh = 0, front = false;
        if (ring) {
          var u = dx * cP + dy * sP, v = (dy * cP - dx * sP) / sI, rr = Math.sqrt(u * u + v * v);
          if (rr > 1.28 && rr < 2.3) { rh = ring[Math.min(ring.length - 1, Math.floor((rr - 1.28) / 1.02 * ring.length))] / 255; front = v > 0; }
        }
        if (d2 <= 1) {
          if (rh > 0.25 && front) { ringPlot(S, i, col, rh); continue; }
          var nz = Math.sqrt(1 - d2);
          var x1 = dx * cT - dy * sT, y1 = dx * sT + dy * cT;
          var x2 = x1 * cS + nz * sS, z2 = nz * cS - x1 * sS;
          var lat = Math.asin(y1 > 1 ? -1 : y1 < -1 ? 1 : -y1), lon = Math.atan2(x2, z2);
          var tu = Math.floor((lon + PI) / TAU * tw); if (tu >= tw) tu = tw - 1; else if (tu < 0) tu = 0;
          var tv = Math.floor((HP - lat) / PI * th); if (tv >= th) tv = th - 1; else if (tv < 0) tv = 0;
          var k = tv * tw + tu;
          if (o.emit) {
            var g = T.r[k] / 255, limb = Math.pow(nz, 0.45), br = (0.55 + 0.6 * g) * (0.45 + 0.55 * limb), mb = br > 1 ? 1 : br;
            plot(S, i, col, 0.3 + 0.7 * mb, SUN_EDGE[0] + (SUN_CORE[0] - SUN_EDGE[0]) * mb, SUN_EDGE[1] + (SUN_CORE[1] - SUN_EDGE[1]) * mb, SUN_EDGE[2] + (SUN_CORE[2] - SUN_EDGE[2]) * mb, 0);
            continue;
          }
          var lamR = dx * L0 + dy * L1 + nz * L2, diff = lamR > 0 ? lamR : 0;
          var day = (lamR + 0.12) / 0.34;
          day = day < 0 ? 0 : day > 1 ? 1 : day * day * (3 - 2 * day);
          /* Density follows the surface as well as the light: dark seas, canyons and crater
             floors thin out, ice and crater rims fill in, so terrain reads at a glance. */
          var R = T.r[k], G = T.g[k], B = T.b[k];
          var lum = (0.08 + 0.92 * Math.pow(diff, 0.7)) * (0.55 + 0.75 * (R * 0.3 + G * 0.59 + B * 0.11) / 255);
          if (T.cloud) {
            var cl = T.cloud[tv * tw + ((tu + csh) % tw)] / 255;
            if (cl > 0) {
              R += (240 - R) * cl; G += (244 - G) * cl; B += (248 - B) * cl;
              var cdl = 0.12 + 0.95 * diff;
              if (cdl > lum) lum += (cdl - lum) * cl;
            }
          }
          var sh = 0.2 + 1.05 * diff;
          R *= sh; G *= sh; B *= sh;
          if (T.water[k] && diff > 0) {
            var sp = dx * hx + dy * hy + nz * hz;
            if (sp > 0.9) { sp = Math.pow(sp, 40) * 0.85; R += 255 * sp; G += 245 * sp; B += 225 * sp; lum += sp * 0.5; }
          }
          if (atm) {
            var rim = 1 - nz;
            rim = rim * rim * rim * (0.2 + 0.8 * day) * 0.85;
            R += (atm[0] - R) * rim; G += (atm[1] - G) * rim; B += (atm[2] - B) * rim;
            if (rim * 0.7 > lum) lum = rim * 0.7;
          }
          var code = 0, li = T.lights[k];
          if (li && day < 0.45) {
            var e = (1 - day / 0.45) * li / 255, c3 = li === 255 ? WARM : lc;
            R += (c3[0] - R) * e; G += (c3[1] - G) * e; B += (c3[2] - B) * e;
            var ll = 0.3 + 0.45 * e;
            if (ll > lum) lum = ll;
            if (li === 255 && e > 0.4) code = 42;
          }
          lum += (T.hgt[k] - 128) / 128 * 0.07 * diff;
          plot(S, i, col, lum, R, G, B, code);
          continue;
        }
        if (rh > 0.1) { ringPlot(S, i, col, rh); continue; }
        if (atm && d2 < aw2) {
          var dd = Math.sqrt(d2), ga = 1 - (dd - 1) / aw;
          ga *= ga;
          var la = (dx * L0 + dy * L1) / dd + 0.2;
          la = la < 0 ? 0 : la > 1 ? 1 : la;
          var al = ga * (0.15 + 0.85 * la) * 0.55;
          if (al > 0.045) { var am = 0.4 + 0.6 * ga; plot(S, i, col, al, atm[0] * am, atm[1] * am, atm[2] * am, 0); }
        }
      }
    }
  }

  /* A label sits just under its planet; the link box covers the planet too, so the planet
     itself is clickable. */
  function label(S, id, x, y, r) {
    var lw = (id.length + 2) * 7.2 + 16, aw = Math.max(2 * r, lw), ah = 2 * r + 30;
    return { id: id, ax: Math.round(Math.max(0, Math.min(S.W - aw, x - aw / 2))), ay: Math.round(Math.max(0, Math.min(S.H - ah, y - r))),
      aw: Math.round(aw), ah: Math.round(ah) };
  }

  /* ── Views ─────────────────────────────────────────────────────────────────────────── */
  /* id, orbit radius, angle from the sun's left, planet radius, spin. Sized so each world is
     a dozen or more character rows tall on a laptop screen. */
  var PLANETS = [["about", 420, -0.5, 64, 0.07], ["projects", 550, 0.55, 72, 0.05], ["experience", 680, -0.4, 78, 0.06], ["skills", 810, 0.28, 62, 0.09], ["contact", 940, -0.18, 62, 0.06]];

  function orbit(S, t, o, labels) {
    var W = S.W, H = S.H, ph = o.layout === "phone";
    var sc = ph ? W / 930 : Math.min(W / 1440, H / 900), ps = ph ? W / 630 : sc;
    var sx = ph ? W * 1.1 : W * 1.06, sy = ph ? H * 0.5 : H * 0.52, sr = ph ? H * 0.42 : 288 * sc;
    var tl = ph ? 0.55 : 0.3, ct = Math.sqrt(1 - tl * tl);
    var bodies = PLANETS.map(function (p, j) {
      var rx = p[1] * sc, a = PI + p[2] + 0.05 * Math.sin(t * 0.04 + j * 1.7), sa = Math.sin(a), ca = Math.cos(a);
      /* Half from the sun, half a soft fill from the viewer's upper left, so each face is mostly
         lit and still brightest on the side toward the sun. */
      var lx = -ca * 0.55 - 0.09, ly = -sa * tl * 0.55 - 0.135, lz = -sa * ct * 0.55 + 0.42, ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
      return { id: p[0], rx: rx, x: sx + ca * rx, y: sy + sa * rx * tl, z: sa, r: p[3] * ps * (1 + 0.16 * sa), L: [lx / ll, ly / ll, lz / ll], spin: t * p[4] + j * 1.3 };
    });
    function dots(far) {
      bodies.forEach(function (b) {
        var n = Math.max(60, Math.round(b.rx * TAU / 9));
        for (var s = 0; s < n; s++) {
          var a = s / n * TAU, sa = Math.sin(a);
          if ((sa < 0) !== far) continue;
          var i = cellAt(S, sx + Math.cos(a) * b.rx, sy + sa * b.rx * tl);
          if (i < 0 || S.ch[i]) continue;
          plot(S, i, i % S.cols, 0.1, far ? 70 : 96, far ? 92 : 124, far ? 98 : 130, 46);
        }
      });
    }
    function drawP(b) {
      body(S, { x: b.x, y: b.y, r: b.r, tex: tex(b.id, 256, 128), spin: b.spin, tilt: TILT[b.id], L: b.L, atm: ATM[b.id],
        ring: b.id === "skills" ? RING : null, cloud: t * 0.003, lightCol: LIT[b.id] });
    }
    body(S, { x: sx, y: sy, r: sr, part: "corona", t: t });
    dots(true);
    bodies.filter(function (b) { return b.z < 0; }).sort(function (a, b) { return a.z - b.z; }).forEach(drawP);
    body(S, { x: sx, y: sy, r: sr, tex: tex("sun", 256, 128), emit: true, spin: t * 0.01, tilt: TILT.sun });
    dots(false);
    bodies.filter(function (b) { return b.z >= 0; }).sort(function (a, b) { return a.z - b.z; }).forEach(drawP);
    bodies.forEach(function (b) { labels.push(label(S, b.id, b.x, b.y, b.r)); });
  }

  function world(S, t, o, labels) {
    var W = S.W, H = S.H, me = IDS.indexOf(o.page) >= 0 ? o.page : "about";
    var gx = W * o.gx, gy = H * o.gy, gr = H * o.gr, sr = Math.max(14, 26 * Math.min(W / 1440, H / 900));
    IDS.filter(function (id) { return id !== me; }).forEach(function (id, j) {
      var sp = o.spots[j] || [0.5, 0.1], x = W * sp[0], y = H * sp[1] + Math.sin(t * 0.25 + j) * 2;
      body(S, { x: x, y: y, r: sr, tex: tex(id, 128, 64), spin: t * 0.06 + j, tilt: TILT[id], L: WL, atm: ATM[id],
        ring: id === "skills" ? RING : null, cloud: t * 0.003, lightCol: LIT[id] });
      labels.push(label(S, id, x, y, sr));
    });
    if (me === "contact") {
      body(S, { x: gx + gr * 0.8, y: gy - gr * 0.9 + Math.sin(t * 0.1) * 4, r: gr * 0.13, tex: tex("moon", 160, 80), spin: t * 0.01, tilt: TILT.moon, L: WL });
    }
    body(S, { x: gx, y: gy, r: gr, tex: tex(me, 400, 200), spin: t * 0.02 + 1.2, tilt: TILT[me], L: WL, atm: ATM[me],
      ring: me === "skills" ? RING : null, cloud: t * 0.0025, lightCol: LIT[me] });
  }

  /* Real satellites when engine/sats.js has them; drawn four times higher than life, as the
     caption says. Until then (or if it cannot load) the orbits are illustrative. */
  var ILLUSTRATIVE = [["ISS", 1.32, 0.5, 0.4, 0.1], ["Hubble", 1.58, 0.42, 2.2, -0.16], ["Tiangong", 1.85, 0.36, 4.1, 0.22], ["Starlink", 2.2, 0.3, 5.3, -0.05]];
  function sats(S, t, o) {
    var W = S.W, H = S.H, ex = W / 2, ey = H / 2, er = H * 0.3;
    var hue = S.paper ? [135, 59, 25] : [255, 193, 135];
    var tracks = o.sats ? o.sats() : null;
    var paths;
    if (tracks && tracks.length) {
      var kpx = er / 6371, va = -0.35, cva = Math.cos(va), sva = Math.sin(va);
      paths = tracks.map(function (tr) {
        return { name: tr.name, pts: tr.pts.map(function (p) {
          var r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z), k = (6371 + (r - 6371) * 4) / r;
          var X = p.x * k, Y = p.y * k, Z = p.z * k, Y2 = Y * cva - Z * sva, Z2 = Y * sva + Z * cva;
          return [ex + X * kpx, ey - Z2 * kpx, Y2 > 0];
        }) };
      });
    } else {
      paths = ILLUSTRATIVE.map(function (s) {
        var pts = [], a0 = s[3] + t * s[2];
        for (var q = 24; q >= 0; q--) {
          var a = a0 - q * 0.055, rx = er * s[1], x0 = Math.cos(a) * rx, y0 = Math.sin(a) * rx * 0.34, tl = s[4];
          pts.push([ex + x0 * Math.cos(tl) - y0 * Math.sin(tl), ey + x0 * Math.sin(tl) + y0 * Math.cos(tl), Math.sin(a) < 0]);
        }
        return { name: s[0], pts: pts };
      });
    }
    function pass(far) {
      paths.forEach(function (s) {
        var n = s.pts.length;
        for (var q = 0; q < n - 1; q++) {
          var p = s.pts[q];
          if (p[2] !== far) continue;
          var i = cellAt(S, p[0], p[1]);
          if (i < 0) continue;
          var f = (q + 1) / n, m = 0.35 + 0.65 * f;
          plot(S, i, i % S.cols, 0.2 + 0.3 * f, hue[0] * m, hue[1] * m, hue[2] * m, 46);
        }
        var h = s.pts[n - 1];
        if (h[2] !== far) return;
        var hi = cellAt(S, h[0], h[1]);
        if (hi >= 0) plot(S, hi, hi % S.cols, 1, hue[0], hue[1], hue[2], 43);
        var nm = s.name, lx = h[0] < W * 0.66 ? h[0] + S.cw * 1.6 : h[0] - S.cw * (nm.length + 1.2);
        for (var c = 0; c < nm.length; c++) {
          var li = cellAt(S, lx + c * S.cw, h[1]);
          if (li >= 0) plot(S, li, li % S.cols, 1, 222, 232, 226, nm.charCodeAt(c));
        }
      });
    }
    pass(true);
    body(S, { x: ex, y: ey, r: er, tex: tex("about", 200, 100), spin: t * 0.06, tilt: 0.41, L: WL, atm: ATM.about, cloud: t * 0.004, lightCol: LIT.about });
    pass(false);
  }

  function stars(cols, rows, band) {
    var out = [];
    for (var i = 0; i < cols * rows; i++) {
      var c = i % cols, r = (i / cols) | 0, x = c / cols, y = r / rows;
      var bd = band ? Math.exp(-Math.pow((y - 0.12 - x * 0.5) / 0.1, 2)) : 0;
      var h = hash(i * 1.618 + 3), p = 0.006 + 0.022 * bd;
      if (h < p) out.push({ i: i, c: c, b: hash(i + 91.7), sp: 0.4 + hash(i + 7.3) * 1.8, ph: hash(i + 3.9) * 6.28, tn: hash(i + 5.1) });
      else if (h < p + 0.05 * bd) out.push({ i: i, c: c, hz: 1, b: hash(i + 11.3) });
    }
    return out;
  }

  function render(S) {
    var ctx = S.ctx;
    ctx.fillStyle = S.paper ? "#e7e7dc" : "#05090c";
    ctx.fillRect(0, 0, S.W, S.H);
    ctx.font = S.font;
    ctx.textBaseline = "top";
    var buckets = new Map(), N = S.cols * S.rows, ch = S.ch, cr = S.cr, cg = S.cg, cb = S.cb;
    for (var i = 0; i < N; i++) {
      if (!ch[i]) continue;
      var key = ((cr[i] >> 3) << 10) | ((cg[i] >> 3) << 5) | (cb[i] >> 3), arr = buckets.get(key);
      if (!arr) { arr = []; buckets.set(key, arr); }
      arr.push(i);
    }
    var cols = S.cols, cw = S.cw, chh = S.chh, yo = S.yo;
    buckets.forEach(function (arr, key) {
      ctx.fillStyle = "rgb(" + (((key >> 10) & 31) * 8 + 4) + "," + (((key >> 5) & 31) * 8 + 4) + "," + ((key & 31) * 8 + 4) + ")";
      for (var q = 0; q < arr.length; q++) { var j = arr[q]; ctx.fillText(CS[ch[j]], (j % cols) * cw, ((j / cols) | 0) * chh + yo); }
    });
  }

  function draw(S, t, o) {
    S.ch.fill(0);
    var labels = [], st = S.stars;
    for (var q = 0; q < st.length; q++) {
      var s = st[q];
      if (s.hz) { plot(S, s.i, s.c, 0.1, 58 + s.b * 30, 80 + s.b * 34, 92 + s.b * 36, s.b > 0.6 ? 44 : 46); continue; }
      var tw = 0.72 + 0.28 * Math.sin(t * s.sp + s.ph), l = (0.25 + 0.75 * s.b * s.b) * tw;
      var cc = s.tn < 0.12 ? STW : s.tn > 0.88 ? STB : STN;
      plot(S, s.i, s.c, l, cc[0] * l, cc[1] * l, cc[2] * l, l > 0.62 ? 42 : l > 0.38 ? 43 : 46);
    }
    if (o.mode === "world") world(S, t, o, labels);
    else if (o.mode === "sats") sats(S, t, o);
    else orbit(S, t, o, labels);
    render(S);
    return labels;
  }

  /* ── The scene object ──────────────────────────────────────────────────────────────── */
  function AsciiScene(box, opts) {
    var self = this;
    this.box = box;
    this.o = { mode: "orbit", page: "about", theme: "dark", layout: "desktop", cell: 7, fade: 0, gx: 0.7, gy: 0.57, gr: 0.47, spots: "", sats: null, labels: true };
    for (var k in opts) this.o[k] = opts[k];
    this.cv = document.createElement("canvas");
    this.cv.setAttribute("aria-hidden", "true");
    box.appendChild(this.cv);
    this.links = {};
    this.t = 0;
    this.still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(function () { self.resize(); }); this.ro.observe(box); }
    else addEventListener("resize", function () { self.resize(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.resize(); });
    var t0 = performance.now(), last = -1e9;
    function loop(now) {
      self.raf = requestAnimationFrame(loop);
      if (self.still || document.hidden || !self.box.offsetWidth || now - last < 120) return;
      last = now;
      self.frame((now - t0) / 1000);
    }
    this.raf = requestAnimationFrame(loop);
  }

  AsciiScene.prototype.set = function (opts) {
    var re = false;
    for (var k in opts) {
      if (this.o[k] === opts[k]) continue;
      if (k === "cell" || k === "fade" || k === "theme" || k === "mode") re = true;
      this.o[k] = opts[k];
    }
    if (re) this.resize(); else this.frame(this.t);
  };

  AsciiScene.prototype.resize = function () {
    var W = this.box.clientWidth, H = this.box.clientHeight;
    if (!W || !H) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(W * dpr);
    this.cv.height = Math.round(H * dpr);
    var ctx = this.cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var fs = this.o.cell || 7;
    var font = "500 " + fs + 'px "IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace';
    ctx.font = font;
    var cw = ctx.measureText("M").width || fs * 0.6, chh = Math.round(fs * 1.15);
    var cols = Math.ceil(W / cw), rows = Math.ceil(H / chh), N = cols * rows;
    var fx = this.o.fade || 0, fade = new Float32Array(cols);
    for (var c = 0; c < cols; c++) fade[c] = fx > 0 ? 0.22 + 0.78 * sm((c * cw - fx * 0.7) / (fx * 0.3)) : 1;
    this.S = { ctx: ctx, font: font, W: W, H: H, cw: cw, chh: chh, cols: cols, rows: rows, yo: (chh - fs) / 2,
      paper: this.o.theme === "paper", fade: fade,
      ch: new Uint8Array(N), cr: new Uint8ClampedArray(N), cg: new Uint8ClampedArray(N), cb: new Uint8ClampedArray(N),
      stars: stars(cols, rows, this.o.mode !== "sats") };
    this.frame(this.t);
  };

  AsciiScene.prototype.frame = function (t) {
    this.t = t;
    if (!this.S) return;
    var o = this.o, spots = [[0.47, 0.17], [0.62, 0.07], [0.42, 0.86], [0.975, 0.07]];
    if (o.spots) {
      var sp = String(o.spots).split(";").map(function (s) { return s.split(",").map(parseFloat); });
      if (sp.length >= 4) spots = sp;
    }
    var labels = draw(this.S, t, { mode: o.mode, page: o.page, layout: o.layout, gx: o.gx, gy: o.gy, gr: o.gr, spots: spots, sats: o.sats });
    if (o.labels) this.place(labels);
  };

  /* The labels are links to each page's address, so the router handles them like any link.
     They repeat the tab bar, so they stay out of the tab order. */
  AsciiScene.prototype.place = function (labels) {
    var seen = {}, self = this;
    labels.forEach(function (l) {
      var a = self.links[l.id];
      if (!a) {
        a = document.createElement("a");
        a.className = "wl";
        a.href = "#" + l.id;
        a.tabIndex = -1;
        var tag = document.createElement("span"), num = document.createElement("i");
        num.textContent = NUM[l.id];
        tag.appendChild(num);
        tag.appendChild(document.createTextNode(" " + l.id));
        a.appendChild(tag);
        a.dataset.world = l.id;
        self.box.appendChild(a);
        self.links[l.id] = a;
      }
      a.hidden = false;
      a.style.left = l.ax + "px"; a.style.top = l.ay + "px";
      a.style.width = l.aw + "px"; a.style.height = l.ah + "px";
      seen[l.id] = 1;
    });
    for (var id in this.links) if (!seen[id]) this.links[id].hidden = true;
  };

  window.AsciiScene = AsciiScene;
})();
