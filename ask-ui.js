/* The Ask Joey panel on the About page.
 *
 * Renders a conversation as a printed interview rather than as chat bubbles: the question in
 * --dim above the answer, a hairline between exchanges, no cards and no backgrounds. The
 * answer arrives through the same .r entrance the rest of the site uses.
 *
 * Answers come from ask.js. If a model proxy is configured (see Ask.remote) the panel waits
 * for it and quietly falls back to the local model when it is slow, rate-limited or wrong.
 */
(function () {
  "use strict";
  var d = document, form = d.getElementById("askform");
  if (!form || typeof Ask === "undefined") return;

  var field = d.getElementById("askq"), log = d.getElementById("asklog"),
      cues = d.getElementById("askcues"),
      rm = matchMedia("(prefers-reduced-motion: reduce)").matches,
      busy = false;

  /* Answers may carry [label](url) for an outside link or [label](#page:N) to send the orbit
     to another planet. Built as nodes, never as innerHTML. */
  var LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

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

  /* A destination is named, not numbered: the orbit's page order has changed before and a
     stale index would send someone to the wrong planet. Unknown name, plain text. */
  function pageIndex(name) {
    if (typeof Orbit === "undefined" || !Orbit.pages) return -1;
    var names = Orbit.pages(), want = String(name).toLowerCase(), found = -1;
    names.forEach(function (n, i) { if (String(n).toLowerCase() === want) found = i; });
    return found;
  }

  function link(label, href) {
    var page = /^#page:(.+)$/.exec(href);
    if (page) {
      var to = pageIndex(page[1]);
      if (to < 0) return d.createTextNode(label);
      var button = d.createElement("button");
      button.type = "button";
      button.className = "jump";
      button.textContent = label;
      button.addEventListener("click", function () { Orbit.go(to); });
      return button;
    }
    var a = d.createElement("a");
    a.href = href; a.textContent = label;
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }

  function el(tag, cls, text) {
    var node = d.createElement(tag);
    if (cls) node.className = cls;
    if (text) into(node, text);
    return node;
  }

  /* New turns glide into view rather than jumping the log to its end. */
  function scroll() {
    if (!rm && log.scrollTo) log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    else log.scrollTop = log.scrollHeight;
  }

  /* The question, then a placeholder the answer replaces once the model has it. */
  function exchange(question) {
    var turn = el("div", "turn");
    turn.appendChild(el("p", "q r", question));
    var body = el("div", "a");
    turn.appendChild(body);
    log.appendChild(turn);
    scroll();
    return body;
  }

  /* A one-pixel accent line that fills left to right — the same figure the game uses for
     its boost and route meters, rather than a spinner borrowed from somewhere else. */
  function thinking(body) {
    var wrap = el("i", "wait"), bar = d.createElement("b");
    wrap.appendChild(bar);
    body.appendChild(wrap);
    if (!rm && bar.animate) bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: 900, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
    return wrap;
  }

  function render(body, reply) {
    body.textContent = "";
    reply.blocks.forEach(function (block, i) {
      if (block.kind === "list") {
        var ul = el("ul", "pts");
        block.items.forEach(function (item, j) {
          var li = el("li", "r", item);
          li.style.setProperty("--i", j);
          ul.appendChild(li);
        });
        ul.className = "pts r";
        ul.style.setProperty("--i", i);
        body.appendChild(ul);
        return;
      }
      if (!block.text) return;
      var p = el("p", "r" + (block.soft ? " dim" : ""), block.text);
      p.style.setProperty("--i", i);
      body.appendChild(p);
    });
    suggest(reply.related);
    scroll();
    keepAsking();
  }

  /* On a narrow screen the whole section scrolls, and a long answer can push the input out of
     sight behind the fold. Bring it back, so the next question is always one tap away. */
  function keepAsking() {
    var section = form.parentNode && form.parentNode.parentNode;
    if (!section || !section.getBoundingClientRect) return;
    if (section.scrollHeight <= section.clientHeight) return;
    var f = form.getBoundingClientRect(), s = section.getBoundingClientRect();
    if (f.bottom <= s.bottom) return;
    var by = f.bottom - s.bottom + 8;
    if (!rm && section.scrollBy) section.scrollBy({ top: by, behavior: "smooth" });
    else section.scrollTop += by;
  }

  /* Suggestions are a promise that the model can answer them, so an unanswered fact never
     appears here — ask.js filters those out before they reach us. */
  function suggest(list) {
    cues.textContent = "";
    (list || []).forEach(function (cue) {
      var li = d.createElement("li"), button = d.createElement("button");
      button.type = "button";
      button.textContent = cue.q;
      button.addEventListener("click", function () {
        if (busy) return;
        var body = exchange(cue.q), wait = thinking(body);
        settle(body, wait, function () { return Ask.follow(cue); });
      });
      li.appendChild(button);
      cues.appendChild(li);
    });
    cues.classList.toggle("open", !log.children.length);
  }

  /* One place decides how long a reply is allowed to take, so the local model does not
     answer so fast that it reads as canned and a model cannot hang the panel. */
  function settle(body, wait, produce) {
    busy = true;
    var started = Date.now();
    Promise.resolve().then(produce).then(function (reply) {
      var held = Math.max(0, (rm ? 0 : 420) - (Date.now() - started));
      setTimeout(function () {
        if (wait && wait.parentNode) wait.parentNode.removeChild(wait);
        render(body, reply);
        busy = false;
      }, held);
    }).catch(function () {
      if (wait && wait.parentNode) wait.parentNode.removeChild(wait);
      render(body, { blocks: [{ kind: "p", text: "Something went wrong reading that. Try again?" }], related: [] });
      busy = false;
    });
  }

  function put(question) {
    question = String(question || "").trim();
    if (!question || busy) return;
    field.value = "";
    var body = exchange(question), wait = thinking(body);
    /* The on-device model's words are only shown once ask.js has checked them; a whole reply
       takes well under a second, so nothing is gained by showing unverified text first. */
    settle(body, wait, function () { return Ask.respond(question); });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); put(field.value); });

  /* Opening a new page clears the conversation, so returning to About starts fresh rather
     than resuming a thread the visitor has since forgotten. */
  addEventListener("orbit:page", function (e) {
    if (e.detail === 0) { wake(); return; }
    Ask.reset(); log.textContent = ""; field.value = ""; suggest(Ask.cues([]).slice(0, 5));
  });

  /* ── The on-device model (ask-llm.js) ──────────────────────────────────────────────
     One quiet line under the description. It offers the model once, shows the download as
     the same one-pixel accent line the panel uses for thinking, then names what is answering.
     A visitor who downloaded it before gets it back on arriving here, without being asked. */
  var device = d.getElementById("askdevice"), offered = false, returning = false;

  function line(parts) {
    device.textContent = "";
    parts.forEach(function (part) { device.appendChild(typeof part === "string" ? d.createTextNode(part) : part); });
    device.hidden = false;
  }

  function show(status) {
    if (status.state === "loading") {
      var pct = Math.round((status.progress || 0) * 100), meter = el("i", "wait"), bar = d.createElement("b");
      meter.appendChild(bar); bar.style.transform = "scaleX(" + (status.progress || 0) + ")";
      line([(returning ? "Waking " : "Downloading ") + AskDevice.NAME + (pct ? " · " + pct + "%" : "\u2026"), meter]);
      device.setAttribute("aria-busy", "true");
    } else if (status.state === "ready") {
      device.removeAttribute("aria-busy");
      line(["Answers worded by " + AskDevice.NAME + ", running on this device. Nothing you type leaves it."]);
    } else if (status.state === "failed") {
      device.removeAttribute("aria-busy");
      line(["The on-device model couldn\u2019t start here, so the built-in one is answering."]);
    } else if (offered) {
      var go = d.createElement("button");
      go.type = "button"; go.className = "jump";
      go.textContent = "Use a language model on this device";
      go.addEventListener("click", function () { AskDevice.load().catch(function () {}); });
      line([go, " (" + AskDevice.SIZE + ", once; runs privately)"]);
    }
  }

  function wake() {
    if (returning && AskDevice.status().state === "idle") AskDevice.load().catch(function () {});
  }

  if (device && typeof AskDevice !== "undefined") {
    AskDevice.supported().then(function (ok) {
      if (!ok) return;
      return AskDevice.cached().then(function (has) {
        returning = has; offered = !has;
        AskDevice.on(show);
        if (has && d.querySelector("#about.on")) wake();
      });
    });
  }

  suggest(Ask.cues([]).slice(0, 5));
})();
