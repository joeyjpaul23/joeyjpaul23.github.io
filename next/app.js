/* The reworked site (next/): routing, the scene's camera per page, theme, Ask Joey, the
 * Experience reader, the live satellites, and the Contact signature.
 *
 * Every page has its own address (#about, #projects, …), so Back, Forward and shared links
 * work. 1–5 open the pages, ← and → step between them, Esc or 0 returns to the orbit.
 * Ask Joey and the satellites are the site's own engines (../engine/ask.js, ../engine/sats.js).
 */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var PAGES = ["orbit", "about", "projects", "experience", "skills", "contact"];
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrowQ = matchMedia("(max-width: 819px) and (orientation: portrait), (max-width: 649px)");

  /* Where each world sits on a wide screen: centre and radius as fractions of the screen, the
     other four worlds' spots in its sky, and how far the text column dims the scene. */
  var WIDE = {
    about: { gx: 1.0, gy: 0.6, gr: 0.42, spots: "0.7,0.1;0.82,0.2;0.94,0.08;0.76,0.86", fade: 980 },
    projects: {},
    experience: {},
    skills: { gx: 0.76, gy: 0.55, gr: 0.34, spots: "0.5,0.12;0.66,0.07;0.88,0.13;0.975,0.84" },
    contact: { spots: "0.47,0.17;0.62,0.07;0.42,0.86;0.97,0.86" }
  };

  function theme() { return root.dataset.theme === "paper" ? "paper" : "dark"; }

  function sceneFor(page) {
    var narrow = narrowQ.matches;
    var o = { theme: theme(), layout: narrow ? "phone" : "desktop", cell: narrow ? 6 : 7, page: page };
    if (page === "orbit") { o.mode = "orbit"; o.fade = narrow ? 0 : 560; return o; }
    var w = WIDE[page] || {};
    o.mode = "world";
    o.gx = narrow ? 0.62 : (w.gx || 0.7);
    o.gy = narrow ? 0.98 : (w.gy || 0.57);
    o.gr = narrow ? 0.62 : (w.gr || 0.47);
    o.spots = narrow ? "0.1,0.25;0.3,0.1;0.88,0.12;0.96,0.45" : (w.spots || "");
    o.fade = narrow ? 0 : (w.fade || 640);
    return o;
  }

  function pageFromHash() {
    var h = location.hash.slice(1).toLowerCase();
    return PAGES.indexOf(h) > 0 ? h : "orbit";
  }

  var sky = new AsciiScene(d.getElementById("sky"), sceneFor(pageFromHash()));
  var tabs = [].slice.call(d.querySelectorAll(".tabs a"));
  var current = null;

  function show(page) {
    if (page === current) return;
    current = page;
    root.dataset.page = page;
    PAGES.forEach(function (p) {
      var s = d.getElementById(p);
      s.hidden = p !== page;
      s.classList.toggle("on", p === page);
    });
    d.getElementById("where").textContent = page;
    tabs.forEach(function (a) {
      if (a.dataset.to === page) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    d.title = page === "orbit" ? "Joel Paul — Computer Science & Math" : page.charAt(0).toUpperCase() + page.slice(1) + " — Joel Paul";
    sky.set(sceneFor(page));
    if (page === "projects") startSats();
    if (page === "contact") sign();
    if (page === "about") resetAsk();
  }

  function route() { show(pageFromHash()); }

  function go(page) {
    var target = page === "orbit" ? "" : "#" + page;
    if (location.hash === target || (!target && !location.hash)) return;
    if (target) location.hash = target;
    else { history.pushState(null, "", location.pathname + location.search); route(); }
  }

  addEventListener("hashchange", route);
  addEventListener("popstate", route);
  var onNarrow = function () { sky.set(sceneFor(current)); };
  if (narrowQ.addEventListener) narrowQ.addEventListener("change", onNarrow); else narrowQ.addListener(onNarrow);

  /* Keys never fire while typing in the Ask box or with a modifier held. */
  addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = (t && t.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) {
      if (e.key === "Escape") t.blur();
      return;
    }
    var i = PAGES.indexOf(current);
    if (e.key === "Escape" || e.key === "0") go("orbit");
    else if (/^[1-5]$/.test(e.key)) go(PAGES[+e.key]);
    else if (e.key === "ArrowRight") go(PAGES[(i + 1) % PAGES.length]);
    else if (e.key === "ArrowLeft") go(PAGES[(i + PAGES.length - 1) % PAGES.length]);
    else return;
    e.preventDefault();
  });

  /* ── Theme ─────────────────────────────────────────────────────────────────────────── */
  var themeBtn = d.getElementById("theme");
  function paintTheme() {
    var paper = theme() === "paper";
    themeBtn.textContent = paper ? "[o]" : "[*]";
    themeBtn.setAttribute("aria-label", paper ? "Switch to the dark theme" : "Switch to the paper theme");
  }
  themeBtn.addEventListener("click", function () {
    var next = theme() === "paper" ? "dark" : "paper";
    root.dataset.theme = next;
    try { localStorage.setItem("next-theme", next); } catch (e) {}
    paintTheme();
    sky.set({ theme: next });
    if (satScene) satScene.set({ theme: next });
  });

  /* ── Experience: the list picks which write-up is open ─────────────────────────────── */
  function pickRole(id, scroll) {
    [].forEach.call(d.querySelectorAll(".roles button"), function (b) {
      b.setAttribute("aria-pressed", b.dataset.role === id ? "true" : "false");
    });
    ["sinn", "pathlight", "maroon"].forEach(function (r) { d.getElementById("role-" + r).hidden = r !== id; });
    if (scroll) d.getElementById("role-" + id).scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }
  [].forEach.call(d.querySelectorAll("[data-role]"), function (b) {
    b.addEventListener("click", function () { pickRole(b.dataset.role, b.classList.contains("next")); });
  });

  /* ── Projects: four real satellites ────────────────────────────────────────────────── */
  var satScene = null, satState = "idle";
  var satNote = d.getElementById("satnote"), satLive = satNote.querySelector(".live");

  /* The last twelve minutes of each track, sampled every 30 s, oldest first. */
  function satTracks() {
    if (typeof Sats === "undefined" || !Sats.ready()) return null;
    var now = Date.now(), by = {}, order = [];
    for (var k = 24; k >= 0; k--) {
      Sats.at(new Date(now - k * 30000)).forEach(function (s) {
        if (!by[s.name]) { by[s.name] = []; order.push(s.name); }
        by[s.name].push(s.eci);
      });
    }
    return order.map(function (n) { return { name: n === "Starlink-1008" ? "Starlink" : n, pts: by[n] }; });
  }

  function startSats() {
    if (!satScene) satScene = new AsciiScene(d.getElementById("satbox"), { mode: "sats", cell: 6, theme: theme(), labels: false, sats: satTracks });
    if (satState !== "idle") return;
    if (typeof Sats === "undefined") { satFailed(); return; }
    satState = "loading";
    satLive.textContent = "Loading:";
    Sats.load().then(function () { satState = "ready"; satLive.textContent = "Live:"; }, satFailed);
  }
  function satFailed() {
    satState = "failed";
    satNote.textContent = "The satellite data couldn\u2019t load here, so these four orbits are illustrative.";
  }

  /* ── Contact ───────────────────────────────────────────────────────────────────────── */
  var SIG = [
    "      _  ___   ___  __   __",
    "     | |/ _ \\ / _ \\ \\ \\ / /",
    "  _  | | (_) |  __/  \\ V /",
    " | |_| |\\___/ \\___|   | |",
    "  \\___/               |_|",
    "  ------------------------"
  ];
  var sigArt = d.getElementById("sigart"), sigTimer = null;
  sigArt.textContent = SIG.join("\n");
  function sign() {
    clearInterval(sigTimer);
    if (reduce) { sigArt.textContent = SIG.join("\n"); return; }
    var n = 0;
    sigTimer = setInterval(function () {
      n += 1;
      sigArt.textContent = SIG.map(function (l) { return l.slice(0, n); }).join("\n");
      if (n >= 27) clearInterval(sigTimer);
    }, 24);
  }
  d.getElementById("sig").addEventListener("click", sign);

  var copyBtn = d.getElementById("copy"), copyTimer = null;
  if (!navigator.clipboard || !navigator.clipboard.writeText) copyBtn.hidden = true;
  copyBtn.addEventListener("click", function () {
    navigator.clipboard.writeText("joeyjpaul@tamu.edu").then(function () {
      copyBtn.textContent = "[copied]";
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () { copyBtn.textContent = "[copy]"; }, 1600);
    }, function () {});
  });

  /* ── Ask Joey: a printed interview, answered by engine/ask.js ──────────────────────── */
  var askLog = d.getElementById("asklog"), askCues = d.getElementById("askcues"),
      askForm = d.getElementById("askform"), askQ = d.getElementById("askq"), busy = false;
  var hasAsk = typeof Ask !== "undefined";
  if (!hasAsk) d.querySelector(".ask").hidden = true;

  var LINK = /\[([^\]]+)\]\(([^)]+)\)/g, OLD_ORDER = ["about", "projects", "experience", "skills", "contact"];
  function link(label, href) {
    var m = /^#page:(.+)$/.exec(href);
    if (m) {
      var to = String(m[1]).toLowerCase();
      if (/^\d+$/.test(to)) to = OLD_ORDER[+to] || "";
      if (PAGES.indexOf(to) < 1) return d.createTextNode(label);
      var b = d.createElement("button");
      b.type = "button"; b.className = "jump"; b.textContent = label;
      b.addEventListener("click", function () { go(to); });
      return b;
    }
    var a = d.createElement("a");
    a.href = href; a.textContent = label;
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  function into(parent, text) {
    var at = 0, m;
    LINK.lastIndex = 0;
    while ((m = LINK.exec(text))) {
      if (m.index > at) parent.appendChild(d.createTextNode(text.slice(at, m.index)));
      parent.appendChild(link(m[1], m[2]));
      at = m.index + m[0].length;
    }
    if (at < text.length) parent.appendChild(d.createTextNode(text.slice(at)));
  }
  function exchange(question) {
    var turn = d.createElement("div"), q = d.createElement("p"), body = d.createElement("div");
    turn.className = "turn"; q.className = "q"; body.className = "a";
    q.textContent = question;
    turn.appendChild(q); turn.appendChild(body); askLog.appendChild(turn);
    return body;
  }
  function render(body, reply) {
    body.textContent = "";
    (reply.blocks || []).forEach(function (block) {
      if (block.kind === "list") {
        var ul = d.createElement("ul");
        ul.className = "pts";
        block.items.forEach(function (item) { var li = d.createElement("li"); into(li, item); ul.appendChild(li); });
        body.appendChild(ul);
        return;
      }
      if (!block.text) return;
      var p = d.createElement("p");
      if (block.soft) p.className = "dim";
      into(p, block.text);
      body.appendChild(p);
    });
    suggest(reply.related, true);
    body.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }
  function suggest(list, follow) {
    askCues.textContent = "";
    askCues.classList.toggle("follow", !!follow);
    (list || []).forEach(function (cue) {
      var li = d.createElement("li"), b = d.createElement("button");
      b.type = "button"; b.textContent = cue.q;
      b.addEventListener("click", function () {
        if (busy) return;
        var body = exchange(cue.q);
        settle(body, function () { return Ask.follow(cue); });
      });
      li.appendChild(b); askCues.appendChild(li);
    });
  }
  /* A reply is held for a moment so the local model doesn't read as canned. */
  function settle(body, produce) {
    busy = true;
    var wait = d.createElement("i"), bar = d.createElement("b"), started = Date.now();
    wait.className = "wait"; wait.appendChild(bar); body.appendChild(wait);
    Promise.resolve().then(produce).then(function (reply) {
      setTimeout(function () { render(body, reply); busy = false; }, Math.max(0, (reduce ? 0 : 420) - (Date.now() - started)));
    }).catch(function () {
      render(body, { blocks: [{ kind: "p", text: "Something went wrong reading that. Try again?" }], related: [] });
      busy = false;
    });
  }
  function resetAsk() {
    if (!hasAsk) return;
    Ask.reset();
    askLog.textContent = "";
    askQ.value = "";
    suggest(Ask.cues([]).slice(0, 5), false);
  }
  askForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = askQ.value.trim();
    if (!q || busy || !hasAsk) return;
    askQ.value = "";
    settle(exchange(q), function () { return Ask.respond(q); });
  });

  paintTheme();
  route();
})();
