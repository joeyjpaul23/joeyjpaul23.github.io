/* The command line. Press / (or ⌘K / Ctrl K, or the button by the theme toggle) anywhere.
 *
 * Commands move around the site by name (about, skills, sinn, fly…), answer a couple of live
 * questions (iss, sats), and anything that isn't a command goes to Ask Joey, so the About
 * page's model is reachable from every page. A few commands are only for the curious.
 *
 * Built like a combobox: suggestions narrow as you type, ↑↓ picks, Tab completes, Enter runs,
 * Esc closes, and ↑ on an empty line brings back what you ran before. Commands that go
 * somewhere close the line so you see the move; commands that answer leave it open.
 */
(function () {
  "use strict";
  var d = document, root = d.documentElement,
      rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof Orbit === "undefined") return;

  var EMAIL = "joeyjpaul@tamu.edu", GITHUB = "https://github.com/joeyjpaul23",
      LINKEDIN = "https://www.linkedin.com/in/joeyjosephpaul23/";

  function page(name) { var i = Orbit.pages().map(function (n) { return n.toLowerCase(); }).indexOf(name); return i; }
  function go(name) { return function () { close(); Orbit.go(name === "home" ? -1 : page(name)); }; }
  function role(id) { return function () { close(); Orbit.role(id); }; }
  function open_(url) { return function () { close(); window.open(url, "_blank", "noopener"); }; }

  /* name, what the suggestion says, what it does; `hidden` ones run but are never suggested. */
  var COMMANDS = [
    { name: "about", hint: "Who Joey is, and Ask Joey", run: go("about") },
    { name: "projects", hint: "Collision avoidance, live satellites, the HRT puzzles", run: go("projects") },
    { name: "experience", hint: "Sinn Fund, Pathlight, Maroon Fund", run: go("experience") },
    { name: "skills", hint: "What he works in", run: go("skills") },
    { name: "contact", hint: "Email, GitHub, LinkedIn", run: go("contact") },
    { name: "home", hint: "Back to the orbit", run: go("home") },
    { name: "sinn", hint: "Sinn Fund · Portfolio Manager", run: role("sinn") },
    { name: "pathlight", hint: "Pathlight Project · ML and backend", run: role("pathlight") },
    { name: "maroon", hint: "Maroon Fund · Quant desk co-director", run: role("maroon") },
    { name: "fly", hint: "Launch Flight, the hidden game", run: function () { close(); Orbit.launch(); } },
    { name: "iss", hint: "Where the ISS is right now", run: function () { return sats("ISS"); } },
    { name: "sats", hint: "Four real satellites, live", run: function () { return sats(); } },
    { name: "theme", hint: "Switch light and dark", run: function () { var t = d.getElementById("theme"); if (t) t.click(); return "Done."; } },
    { name: "email", hint: EMAIL, run: function () { close(); location.href = "mailto:" + EMAIL; } },
    { name: "github", hint: "github.com/joeyjpaul23", run: open_(GITHUB) },
    { name: "linkedin", hint: "in/joeyjosephpaul23", run: open_(LINKEDIN) },
    { name: "help", hint: "Everything this line can do", run: help },
    { name: "clear", hint: "Clear this line's answers", run: function () { out.textContent = ""; } },
    { name: "whoami", hidden: 1, run: function () { return "A visitor. Joey's the one with the satellites — try about."; } },
    { name: "sudo", hidden: 1, run: function () { return "Permission denied. Nice try."; } },
    { name: "ls", hidden: 1, run: function () { return Orbit.pages().map(function (n) { return n.toLowerCase(); }).join("   "); } },
    { name: "pwd", hidden: 1, run: function () { var p = Orbit.page; return p < 0 ? "/orbit" : "/orbit/" + Orbit.pages()[p].toLowerCase(); } },
    { name: "exit", hidden: 1, run: function () { close(); } },
    { name: ":q", hidden: 1, run: function () { close(); } },
    { name: "hello", hidden: 1, run: function () { return "Hi. Ask anything about Joey, or type help."; } },
    { name: "hi", hidden: 1, run: function () { return "Hi. Ask anything about Joey, or type help."; } },
    { name: "rm", hidden: 1, run: function () { return "This site has no files to remove. It's all one canvas."; } },
    { name: "vim", hidden: 1, run: function () { return "You're already in it. :q to leave."; } }
  ];
  /* Aliases, so "go skills" and "open pathlight" work as well. */
  var ALIAS = { go: 1, open: 1, cd: 1, show: 1 };

  /* ── The panel ─────────────────────────────────────────────────────────────────────── */
  var shell = d.createElement("div");
  shell.id = "cmd"; shell.hidden = true;
  shell.innerHTML =
    '<div class="cmd-veil"></div>' +
    '<div class="cmd-panel" role="dialog" aria-modal="true" aria-label="Command line">' +
      '<div class="cmd-row"><span class="cmd-caret" aria-hidden="true">›</span>' +
      '<input id="cmdq" type="text" autocomplete="off" spellcheck="false" maxlength="300" ' +
        'placeholder="Go somewhere, or ask about Joey" role="combobox" aria-autocomplete="list" ' +
        'aria-expanded="true" aria-controls="cmdlist"></div>' +
      '<ul id="cmdlist" role="listbox" aria-label="Suggestions"></ul>' +
      '<div class="cmd-out" aria-live="polite"></div>' +
      '<p class="cmd-keys" aria-hidden="true">↑↓ choose · Tab complete · Enter run · Esc close</p>' +
    '</div>';
  d.body.appendChild(shell);
  var field = shell.querySelector("#cmdq"), list = shell.querySelector("#cmdlist"),
      out = shell.querySelector(".cmd-out"), veil = shell.querySelector(".cmd-veil");

  var options = [], at = 0, past = [], back = -1, returnTo = null, closing = 0;

  function isOpen() { return !shell.hidden; }

  function open() {
    if (isOpen() || Orbit.flying) return;
    clearTimeout(closing);
    returnTo = d.activeElement;
    shell.hidden = false; shell.classList.remove("out");
    field.value = ""; back = -1; suggest();
    field.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen()) return;
    shell.classList.add("out");
    clearTimeout(closing);
    closing = setTimeout(function () { shell.hidden = true; shell.classList.remove("out"); }, rm ? 0 : 140);
    if (returnTo && returnTo.focus && d.contains(returnTo)) returnTo.focus({ preventScroll: true });
  }

  /* ── Suggestions ───────────────────────────────────────────────────────────────────── */
  var DEFAULTS = ["projects", "experience", "about", "iss", "fly", "help"];

  function find(name) { return COMMANDS.filter(function (c) { return c.name === name; })[0]; }

  function parse(text) {
    var words = text.trim().toLowerCase().split(/\s+/);
    if (ALIAS[words[0]] && words[1]) words.shift();
    return { name: words[0] || "", rest: words.slice(1).join(" ") };
  }

  function suggest() {
    var text = field.value.trim(), want = parse(text).name;
    options = [];
    /* A fresh line offers a few places to start; once there are answers, it waits for typing. */
    if (!text) { if (!out.children.length) DEFAULTS.forEach(function (n) { options.push({ cmd: find(n) }); }); }
    else {
      COMMANDS.forEach(function (c) { if (!c.hidden && c.name.indexOf(want) === 0) options.push({ cmd: c }); });
      COMMANDS.forEach(function (c) {
        if (!c.hidden && c.name.indexOf(want) > 0 && options.length < 6) options.push({ cmd: c });
      });
      options = options.slice(0, 5);
      var exact = find(want);
      if (!(exact && !parse(text).rest) && text.length > 1) options.push({ ask: text });
      if (exact && exact.hidden) options.unshift({ cmd: exact, quiet: 1 });
    }
    at = 0;
    draw();
  }

  function draw() {
    list.textContent = "";
    options.forEach(function (o, i) {
      var li = d.createElement("li");
      li.id = "cmdopt" + i; li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === at ? "true" : "false");
      if (o.ask) {
        li.className = "ask";
        li.appendChild(word("b", "Ask Joey"));
        li.appendChild(word("span", "“" + o.ask + "”"));
      } else {
        li.appendChild(word("b", o.cmd.name));
        if (!o.quiet) li.appendChild(word("span", o.cmd.hint));
      }
      li.addEventListener("mousedown", function (e) { e.preventDefault(); at = i; run(); });
      li.addEventListener("mousemove", function () { if (at !== i) { at = i; mark(); } });
      list.appendChild(li);
    });
    list.hidden = !options.length;
    field.setAttribute("aria-expanded", options.length ? "true" : "false");
    mark();
  }

  function mark() {
    [].forEach.call(list.children, function (li, i) { li.setAttribute("aria-selected", i === at ? "true" : "false"); });
    if (options.length) field.setAttribute("aria-activedescendant", "cmdopt" + at);
    else field.removeAttribute("aria-activedescendant");
  }

  function word(tag, text) { var n = d.createElement(tag); n.textContent = text; return n; }

  /* ── Running ───────────────────────────────────────────────────────────────────────── */
  function run() {
    var text = field.value.trim(), pick = options[at];
    if (!text && !pick) return;
    if (text) { past.unshift(text); past = past.slice(0, 20); }
    back = -1;
    if (pick && pick.ask) return ask(pick.ask);
    var c = pick ? pick.cmd : null, parsed = parse(text);
    /* An exact command typed out wins over whatever happens to be highlighted. */
    if (text && find(parsed.name)) c = find(parsed.name);
    if (!c) return ask(text);
    if (c.name === "theme" && /^(dark|light)$/.test(parsed.rest)) {
      var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      if ((parsed.rest === "dark") === dark) { say(text, "Already " + parsed.rest + "."); field.value = ""; suggest(); return; }
    }
    field.value = ""; suggest();
    var said = c.run(parsed.rest);
    if (said && typeof said.then === "function") {
      var line = say(text || c.name, "…");
      said.then(function (t) { fill(line, t); }, function () { fill(line, "Couldn't reach the satellites just now."); });
    } else if (typeof said === "string") say(text || c.name, said);
  }

  /* Anything that isn't a command is a question for Ask Joey (ask.js), with the same rules and
     the same on-device model, if one is running, as the About page. */
  function ask(question) {
    field.value = ""; suggest();
    if (typeof Ask === "undefined") return say(question, "Ask Joey isn't loaded here.");
    var line = say(question, "…");
    Promise.resolve(Ask.respond(question)).then(function (reply) {
      fill(line, reply.blocks.map(function (b) {
        return b.kind === "list" ? b.items.join("; ") : b.text;
      }).filter(Boolean).join(" "));
    }, function () { fill(line, "Something went wrong reading that. Try again?"); });
  }

  function say(question, answer) {
    var turn = d.createElement("div"); turn.className = "cmd-turn";
    turn.appendChild(word("p", "› " + question)).className = "q";
    var a = d.createElement("p"); a.className = "a"; turn.appendChild(a);
    fill(turn, answer);
    out.appendChild(turn);
    while (out.children.length > 4) out.removeChild(out.firstChild);
    return turn;
  }

  /* Answers may carry [label](#page:Name) or [label](https://…); built as nodes, never HTML. */
  function fill(turn, text) {
    var a = turn.querySelector(".a"), re = /\[([^\]]+)\]\(([^)]+)\)/g, from = 0, m;
    a.textContent = "";
    text = String(text || "");
    while ((m = re.exec(text))) {
      if (m.index > from) a.appendChild(d.createTextNode(text.slice(from, m.index)));
      a.appendChild(link(m[1], m[2]));
      from = m.index + m[0].length;
    }
    if (from < text.length) a.appendChild(d.createTextNode(text.slice(from)));
    if (out.scrollTo) out.scrollTo({ top: out.scrollHeight, behavior: rm ? "auto" : "smooth" });
    else out.scrollTop = out.scrollHeight;
  }

  function link(label, href) {
    var to = /^#page:(.+)$/.exec(href);
    if (to) {
      var b = d.createElement("button"); b.type = "button"; b.className = "jump"; b.textContent = label;
      b.addEventListener("click", function () { var n = page(to[1].toLowerCase()); if (n >= 0) { close(); Orbit.go(n); } });
      return b;
    }
    var a = d.createElement("a"); a.href = href; a.textContent = label;
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }

  function help() {
    return "Pages: about, projects, experience, skills, contact, home. Roles: sinn, pathlight, maroon. " +
      "Also fly, iss, sats, theme, email, github, linkedin, clear. Anything else is a question for Ask Joey.";
  }

  /* Live satellites (sats.js), loaded on first ask. */
  function sats(only) {
    if (typeof Sats === "undefined") return "The satellites aren't loaded here.";
    return Sats.load().then(function () {
      var now = Sats.at(), pick = only ? now.filter(function (s) { return s.name === only; }) : now;
      if (!pick.length) return "I couldn't place that one just now.";
      if (only) { var s = pick[0];
        return s.full.charAt(0).toUpperCase() + s.full.slice(1) + " is over " + Sats.place(s.lat, s.lon) + " right now, " +
          Math.round(s.height) + " km up, moving at " + s.speed.toFixed(2) + " km/s."; }
      var pair = Sats.closest(now);
      return pick.map(function (s) { return s.name + " " + Math.round(s.height) + " km over " + Sats.place(s.lat, s.lon); }).join(" · ") +
        (pair ? ". Closest pair: " + pair.a.name + " and " + pair.b.name + ", " + Math.round(pair.km).toLocaleString() + " km apart." : "");
    });
  }

  /* ── Keys ──────────────────────────────────────────────────────────────────────────── */
  field.addEventListener("input", function () { back = -1; suggest(); });
  field.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === "Enter") { e.preventDefault(); run(); return; }
    if (e.key === "Tab") {
      var o = options[at];
      if (o && o.cmd && !e.shiftKey) { e.preventDefault(); field.value = o.cmd.name + " "; suggest(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); if (options.length) { at = (at + 1) % options.length; mark(); } return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if ((!field.value || back >= 0) && past.length) {
        back = Math.min(past.length - 1, back + 1); field.value = past[back];
        options = []; draw(); return;
      }
      if (options.length) { at = (at - 1 + options.length) % options.length; mark(); }
    }
  });
  veil.addEventListener("mousedown", function (e) { e.preventDefault(); close(); });

  addEventListener("keydown", function (e) {
    var t = e.target, tag = t && t.tagName, typing = tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable);
    var chord = (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
    if (chord) { e.preventDefault(); if (isOpen()) close(); else open(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || Orbit.flying) return;
    if (e.key === "/" || e.key === ":") { e.preventDefault(); open(); }
  });

  var button = d.getElementById("cmdbtn");
  if (button) button.addEventListener("click", function () { if (isOpen()) close(); else open(); });

  window.Cmd = { open: open, close: close, commands: function () { return COMMANDS; } };
})();
