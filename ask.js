/* Ask Joey — the model behind the About page.
 *
 * Not an LLM and no network call: a retrieval model over profile.js that runs in the tab.
 * It answers in four stages, and each is small enough to read.
 *
 *   1. Normalise   slang, contractions and plurals collapse, so "whats ur fav flick"
 *                  and "What is your favourite film?" become the same handful of stems.
 *   2. Intent      what the question wants back — a value, a place, a time, a reason,
 *                  a yes/no, a list, or a description. This is the part that decides
 *                  which slot of a fact gets read.
 *   3. Retrieve    TF-IDF over the fact base, scored as half cosine similarity and half
 *                  coverage (how much of the question's meaning the fact accounts for),
 *                  plus small bonuses for intent fit and for staying on topic in a follow-up.
 *   4. Realise     build a sentence from the slot the intent asked for. One fact therefore
 *                  answers "what's your favourite film", "do you like films", "why that one"
 *                  and "tell me about films" without any of them being written down.
 *
 * Below a confidence floor it says so instead of guessing, and a fact with no value yet
 * is reported as unanswered rather than filled in. Both are the point, not a shortfall.
 */
var Ask = (function (Profile) {
  "use strict";

  /* ── Turn the hosted model on ──────────────────────────────────────────────────────
     Empty means everything runs in this tab: no key, no network, no build step. Put the
     deployed worker's URL here and a hosted model takes over the phrasing, with everything
     below it acting as the retriever and the fallback. See worker/README.md.

         var PROXY = "https://joey-ask.<your-subdomain>.workers.dev";
  */
  var PROXY = "", TIMEOUT = 6000;

  /* ── 1. Normalise ──────────────────────────────────────────────────────────────── */

  /* Written-down-fast spellings, expanded before anything else looks at the words. */
  var SLANG = {
    whats: "what is", whos: "who is", wheres: "where is", hows: "how is", whens: "when is",
    thats: "that is", youre: "you are", yall: "you all", dont: "do not", doesnt: "does not",
    didnt: "did not", cant: "can not", wont: "will not", isnt: "is not", arent: "are not",
    ive: "i have", im: "i am", id: "i would", ur: "your", u: "you", r: "are",
    fav: "favorite", favs: "favorite", favourite: "favorite", favourites: "favorite",
    pls: "please", plz: "please", thx: "thanks", abt: "about", rn: "now", tho: "though",
    cuz: "because", bc: "because", wanna: "want to", gonna: "going to", kinda: "kind of",
    lemme: "let me", gimme: "give me", info: "information", uni: "university",
    bio: "background", vs: "versus", n: "and", ya: "you", em: "them"
  };

  /* Different words for one idea, collapsed after stemming so the fact base only has to
     spell each idea once. Conservative on purpose — merging two ideas is worse than missing
     a synonym, because a wrong confident answer is worse than an honest miss. */
  var SYN = {
    film: "movie", flick: "movie", cinema: "movie",
    song: "music", tune: "music", track: "music", playlist: "music", spotify: "music",
    novel: "book", literature: "book",
    university: "college", school: "college", campus: "college",
    job: "work", position: "work", career: "work", employment: "work", gig: "work",
    create: "build", make: "build", made: "build", built: "build",
    enjoy: "like", love: "like", prefer: "like",
    pastime: "hobby", photo: "picture", pic: "picture"
  };

  var STOP = ("a an the is are am was were be been being do does did done you your yours " +
    "yourself i me my mine we us our he him his she hers it its they them their of to in on " +
    "at for with and or but if so as that this these those there then than from by about " +
    "what which who whom whose when where why how tell say talk describe explain give show " +
    "please hey hi hello would could can will shall may might just really actually some any " +
    "all much many got get know think want kind sort thing things stuff lot lots very too " +
    "also into out up down over under again more most other another each own same s t " +
    "use used uses using go goes going went come comes like-to there here now well").split(" ");

  function words(text) {
    var flat = String(text || "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9&+#. ]+/g, " ");
    var out = [];
    flat.split(/[\s.]+/).forEach(function (w) {
      if (!w) return;
      (SLANG[w] || w).split(" ").forEach(function (piece) { if (piece) out.push(piece); });
    });
    return out;
  }

  /* Enough of a stemmer to make plurals and tenses agree. Applied to the fact base and to
     the question with the same rules, so consistency matters more than linguistic truth. */
  function stem(w) {
    if (w.length < 4) return w;
    if (/ies$/.test(w)) w = w.slice(0, -3) + "y";
    else if (/(sses|shes|ches|xes)$/.test(w)) w = w.slice(0, -2);
    else if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (/ing$/.test(w) && w.length > 5) w = w.slice(0, -3);
    else if (/ed$/.test(w) && w.length > 4) w = w.slice(0, -2);
    if (/ly$/.test(w) && w.length > 4) w = w.slice(0, -2);
    if (/e$/.test(w) && w.length > 4) w = w.slice(0, -1);
    if (/y$/.test(w) && w.length > 3) w = w.slice(0, -1) + "i";
    return w;
  }

  /* Both sides of the map get stemmed, or an entry silently never fires. */
  var SYNS = {};
  Object.keys(SYN).forEach(function (k) { SYNS[stem(k)] = stem(SYN[k]); });

  function canon(w) { var s = stem(w); return SYNS[s] || s; }

  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[canon(w)] = 1; });

  function terms(text) {
    var out = [];
    words(text).forEach(function (w) { var c = canon(w); if (c && !STOPSET[c]) out.push(c); });
    return out;
  }

  /* ── 2. Intent ─────────────────────────────────────────────────────────────────────
     Which slot of a fact the question is reaching for. Read off the question words, which
     are short and exact, so this runs on the normalised words before stemming touches them. */

  var META = /\b(are you (a |an )?(bot|robot|ai|llm|human|real|person|chatbot)\b|who (made|built|wrote) you\b|what are you\s*\??$|how (do you|does this) work\b|are you (chatgpt|claude|gpt)\b|is this (an? )?(ai|llm|language model)\b)/;
  var TASK = /^(write|code|build|make|generate|create|translate|solve|calculate|compute|summarize|summarise|fix|debug|draw|convert)\b/;
  var MORE = /^(more|tell me more|go on|anything else|what else|continue|and|and\?|ok|okay|cool|nice|next)$/;

  function intentOf(list, raw) {
    var w0 = list[0] || "", has = function (t) { return list.indexOf(t) >= 0; };
    if (/^(hi|hello|hey|yo|sup|howdy|greetings|morning)$/.test(w0) && list.length <= 3) return "greet";
    if (META.test(raw)) return "meta";
    if (has("why")) return "why";
    if (has("when")) return "when";
    if (has("where")) return "where";
    if (has("who")) return "who";
    if (w0 === "how" && list[1] === "long") return "when";
    if (w0 === "how" && (list[1] === "many" || list[1] === "much")) return "bool" && "quantity";
    if (has("how")) return "how";
    if (has("favorite") || has("best")) return "what";
    if (/^(what|which)$/.test(w0)) return "what";
    if (/^(do|does|did|are|is|am|have|has|can|could|would|will|were|was|any|ever)$/.test(w0)) return "bool";
    if (/^(list|name)$/.test(w0)) return "list";
    if (/^(tell|describe|explain|talk|say|whats)$/.test(w0)) return "describe";
    if (has("what") || has("which")) return "what";
    return "describe";
  }

  /* ── 3. Retrieve ───────────────────────────────────────────────────────────────────
     A TF-IDF index over the facts. `keys` carries the most weight because it is the
     vocabulary a stranger would use; the written slots carry less. */

  var facts = Profile.facts, idf = {}, docs = [];

  facts.forEach(function (f) {
    var bag = {};
    function add(text, weight) {
      terms(text).forEach(function (t) { bag[t] = (bag[t] || 0) + weight; });
    }
    add(f.keys, 4); add(f.topic, 3); add(f.subject, 2); add(f.value, 1);
    add(f.why, .5); add(f.how, .5); add(f.when, .5); add(f.where, .5); add(f.more, .25);
    (f.list || []).forEach(function (item) { add(item, 1); });
    docs.push(bag);
    Object.keys(bag).forEach(function (t) { idf[t] = (idf[t] || 0) + 1; });
  });

  Object.keys(idf).forEach(function (t) { idf[t] = Math.log(1 + facts.length / idf[t]); });

  var norms = docs.map(function (bag) {
    var sum = 0;
    Object.keys(bag).forEach(function (t) { var v = bag[t] * idf[t]; sum += v * v; });
    return Math.sqrt(sum) || 1;
  });

  /* Half cosine, half coverage. Cosine alone under-scores a three-word question against a
     long fact; coverage alone rewards any fact that happens to contain a common word. */
  function score(index, query) {
    var bag = docs[index], dot = 0, qn = 0, got = 0, all = 0;
    Object.keys(query).forEach(function (t) {
      var weight = idf[t] || Math.log(1 + facts.length), q = query[t] * weight;
      qn += q * q; all += weight;
      if (bag[t]) { dot += q * bag[t] * weight; got += weight * Math.min(1, bag[t] / 3); }
    });
    if (!all) return 0;
    var cosine = dot / ((Math.sqrt(qn) || 1) * norms[index]);
    return .5 * cosine + .5 * (got / all);
  }

  var STRONG = .34, WEAK = .22;

  function rank(text, raw, intent, state) {
    var query = {}, list = terms(text);
    list.forEach(function (t) { query[t] = (query[t] || 0) + 1; });
    var thin = Object.keys(query).length < 2;
    var scored = facts.map(function (f, i) {
      var s = score(i, query), bag = docs[i];
      if (thin && !Object.keys(query).some(function (t) { return (bag[t] || 0) >= 3; })) s *= .4;
      if (f.phrases) f.phrases.split("|").forEach(function (p) { if (p && raw.indexOf(p) >= 0) s += .30; });
      if (f.intents && f.intents.split(" ").indexOf(intent) >= 0) s += .10;
      if (state.topic && f.topic === state.topic) s += .06;
      if (f.pending) s -= .02;   /* a tie goes to something answerable */
      return { fact: f, score: s };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored;
  }

  /* ── 4. Realise ────────────────────────────────────────────────────────────────────
     Build the answer from the slot the intent asked for, falling back along a chain so a
     fact that has no `when` still says something true rather than nothing. */

  function sentence(text) {
    if (!text) return "";
    text = String(text).trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return /[.!?]$/.test(text) ? text : text + ".";
  }

  function lower(text) {
    text = String(text || "").trim();
    return /^I\b|^I'm\b/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
  }

  function primary(f) {
    if (f.frame) return f.frame.replace("{value}", f.value);
    return sentence(f.value);
  }

  var PENDING = [
    "That one's still blank — {subject} isn't something Joey has written down here yet. Ask him and he'll tell you: {email}.",
    "Joey hasn't answered that yet. {Subject} is one of the gaps in what he's given me — {email} reaches him directly.",
    "Not yet, sorry. {Subject} isn't in here, and I'd rather say so than make something up. Try him at {email}."
  ];

  function pendingLine(f) {
    var n = 0, i;
    for (i = 0; i < f.id.length; i++) n += f.id.charCodeAt(i);
    var subject = f.subject || "that";
    return PENDING[n % PENDING.length]
      .replace("{subject}", subject)
      .replace("{Subject}", subject.charAt(0).toUpperCase() + subject.slice(1))
      .replace("{email}", Profile.me.email);
  }

  /* The slot each intent reads first, then what it settles for. */
  var CHAIN = {
    why: ["why"], when: ["when"], where: ["where"], who: ["who"], how: ["how"], quantity: ["when"],
    what: [], list: [], bool: [], describe: [], greet: [], meta: []
  };

  /* Is the thing being asked about actually among this fact's claims? `keys` does not count:
     it is search vocabulary and includes words the fact mentions only to deny. */
  function affirms(f, content) {
    if (!content || !content.length) return false;
    var claimed = {};
    terms([f.value, (f.list || []).join(" ")].join(" ")).forEach(function (t) { claimed[t] = 1; });
    return content.some(function (t) { return claimed[t]; });
  }

  function realize(f, intent, state, content, raw) {
    var blocks = [];
    if (f.pending) return [{ kind: "p", text: pendingLine(f) }];

    var chain = CHAIN[intent] || [], slot = null, i;
    for (i = 0; i < chain.length; i++) if (f[chain[i]]) { slot = chain[i]; break; }

    if (slot) {
      /* A direct hit on where/when/why reads better on its own than bolted to the headline. */
      blocks.push({ kind: "p", text: sentence(f[slot]) });
      if (slot !== "why" && f.value && intent !== "where") blocks.push({ kind: "p", text: primary(f), soft: 1 });
      return blocks;
    }

    if (intent === "bool") {
      var either = / or /.test(raw || "");
      blocks.push({ kind: "p", text: (!either && affirms(f, content) ? "Yes. " : "") + primary(f) });
      var support = f.how || f.why || f.more;
      if (support && !f.list) blocks.push({ kind: "p", text: sentence(support), soft: 1 });
    } else if ((intent === "list" || f.list) && f.list) {
      if (f.subject) blocks.push({ kind: "p", text: f.subject.charAt(0).toUpperCase() + f.subject.slice(1) + ":" });
      blocks.push({ kind: "list", items: f.list.slice() });
    } else {
      blocks.push({ kind: "p", text: primary(f) });
    }

    if (intent !== "bool") {
      var tail = f.list ? f.more : (f.why || f.how || f.more);
      if (tail) blocks.push({ kind: "p", text: sentence(tail), soft: 1 });
    }
    return blocks;
  }

  /* "Tell me about yourself" is not one fact — it is the handful marked `summary`. */
  function overview() {
    var picked = ["who", "study", "sinn", "satellite", "looking"].map(byId).filter(Boolean);
    return picked.map(function (f, i) {
      return { kind: "p", text: primary(f), soft: i > 1 };
    });
  }

  function byId(id) {
    var hit = null;
    facts.forEach(function (f) { if (f.id === id) hit = f; });
    return hit;
  }

  /* ── Suggestions ───────────────────────────────────────────────────────────────────
     Only ever offer a question the model can actually answer, so a suggestion is a promise.
     An unanswered fact drops out of the list until Joey fills it in. */

  function cueList(exclude) {
    return Profile.cues.filter(function (c) {
      var f = byId(c.fact);
      return f && !f.pending && (!exclude || exclude.indexOf(c.fact) < 0);
    });
  }

  function related(f, intent, state) {
    var out = [];
    if (f && !f.pending) {
      if (f.why && intent !== "why") out.push({ q: "Why?", fact: f.id, slot: "why" });
      else if (f.how && intent !== "how") out.push({ q: "How?", fact: f.id, slot: "how" });
      if (f.more && out.length < 2) out.push({ q: "Tell me more", fact: f.id, slot: "more" });
    }
    cueList(state.asked).forEach(function (c) {
      if (out.length < 3 && (!f || c.fact !== f.id)) out.push(c);
    });
    return out.slice(0, 3);
  }

  /* ── The model ─────────────────────────────────────────────────────────────────── */

  var state = { topic: null, fact: null, asked: [] };

  function reply(blocks, extra) {
    var out = { blocks: blocks, related: extra && extra.related || [], fact: extra && extra.fact || null,
      confidence: extra && extra.confidence || 0 };
    return out;
  }

  function answer(text) {
    var raw = String(text || "").toLowerCase().replace(/['’]/g, "").trim();
    var list = words(text);
    if (!list.length) return reply([{ kind: "p", text: "Ask me something about Joey." }],
      { related: cueList([]).slice(0, 3) });

    var intent = intentOf(list, raw), content = terms(text);
    var selfRef = /\b(you|your|yourself|yourselves|joey|joel|he|him|his)\b/.test(raw);

    /* "Tell me about yourself" carries no searchable term at all — every word is a stopword.
       Broad and self-referential means the overview, not a failed search. */
    if (!content.length && selfRef && intent !== "meta") {
      state.topic = "me"; state.fact = "who";
      return reply(overview(), { fact: "who", confidence: 1, related: cueList(state.asked).slice(0, 3) });
    }

    if (intent === "greet") {
      state.asked = [];
      return reply([{ kind: "p", text: "Hi. Ask me anything about Joey — what he's building, where he's " +
        "worked, or what he does when he isn't." }], { related: cueList([]).slice(0, 3) });
    }

    if (intent === "meta") {
      return reply(PROXY ? [
        { kind: "p", text: "Two models, and the small one is in charge. A few hundred lines of " +
          "JavaScript in this tab read your question, pick the facts Joey wrote that cover it, and " +
          "hand just those to a hosted language model to word the reply." },
        { kind: "p", soft: 1, text: "It never sees a question he hasn't answered, it never gets more " +
          "than the few facts retrieved, and if it returns a figure that isn't in them you get the " +
          "locally written answer instead. Same if it's slow or down." }
      ] : [
        { kind: "p", text: "I'm a small retrieval model, not a language model. No API key, no server, no " +
          "call going anywhere — a few hundred lines of JavaScript and a file of facts Joey wrote, " +
          "running in this tab." },
        { kind: "p", soft: 1, text: "I work out what your question is asking for, find the fact that " +
          "covers it, and build a sentence from the part that fits. When nothing scores well enough, " +
          "I say so rather than guess." }
      ], { related: cueList(state.asked).slice(0, 3) });
    }

    /* A follow-up carries the previous fact rather than starting a new search. */
    if (MORE.test(raw) && state.fact) {
      var last = byId(state.fact);
      if (last) {
        var extra = last.more || last.why || last.how;
        return reply(extra ? [{ kind: "p", text: sentence(extra) }]
                           : [{ kind: "p", text: "That's all I have on that one." }],
          { fact: last.id, related: cueList(state.asked).slice(0, 3), confidence: 1 });
      }
    }
    if (/^(what|how) about\b/.test(raw)) {
      raw = raw.replace(/^(what|how) about\s*/, "");
      list = words(raw); content = terms(raw);
      intent = content.length ? "what" : "describe";
    }

    if (TASK.test(raw) && !selfRef) {
      return reply([{ kind: "p", text: "I'm not that kind of model — I only know about Joey. " +
        "Ask me what he's built, where he's worked, or what he's like outside of it." }],
        { related: cueList(state.asked).slice(0, 3) });
    }

    var ranked = rank(content.join(" "), raw, intent, state), top = ranked[0];

    if (!content.length && state.fact && (CHAIN[intent] || []).length) {
      var prev = byId(state.fact), slot = CHAIN[intent][0];
      if (prev && prev[slot]) return reply([{ kind: "p", text: sentence(prev[slot]) }],
        { fact: prev.id, confidence: 1, related: related(prev, intent, state) });
    }

    if (!content.length) return reply([{ kind: "p", text: "Ask me something about Joey — what he's " +
      "building, where he's worked, or what he's like outside of it." }],
      { related: cueList(state.asked).slice(0, 3) });

    if (!top || top.score < WEAK) {
      return reply([{ kind: "p", text: selfRef
        ? "That's about Joey, but it isn't something he's written down here. Email him and he'll " +
          "answer it himself: " + Profile.me.email + "."
        : "I only know about Joey, so that one's outside what I have. Try asking about his work, " +
          "what he's building, or what he does outside of it." }],
        { related: cueList(state.asked).slice(0, 3) });
    }

    var f = top.fact;

    /* Broad openers resolve to the overview rather than to the one fact about his name. */
    var broad = f.id === "who" && (intent === "describe" || intent === "what") && content.length <= 2;
    var blocks = broad ? overview() : realize(f, intent, state, content, raw);

    state.topic = f.topic; state.fact = f.id;
    if (state.asked.indexOf(f.id) < 0) state.asked.push(f.id);

    /* A near-tie is worth naming — it is cheaper than answering the wrong question. */
    if (top.score < STRONG && !f.pending) {
      var second = ranked[1];
      if (second && second.score > WEAK && second.fact.topic !== f.topic && !second.fact.pending) {
        blocks = blocks.concat([{ kind: "p", soft: 1, text: "If you meant something else, I also have " +
          (second.fact.subject || second.fact.topic) + "." }]);
      }
    }

    return reply(blocks, { fact: f.id, confidence: top.score, related: related(f, intent, state) });
  }

  /* A suggestion chip with a slot answers from that slot directly, so "Why?" is not a search. */
  function follow(cue) {
    var f = byId(cue.fact);
    if (!f) return answer(cue.q);
    if (!cue.slot) return answer(cue.q);
    state.topic = f.topic; state.fact = f.id;
    if (state.asked.indexOf(f.id) < 0) state.asked.push(f.id);
    return reply([{ kind: "p", text: sentence(f[cue.slot] || f.value) }],
      { fact: f.id, confidence: 1, related: related(f, cue.slot, state) });
  }

  function reset() { state = { topic: null, fact: null, asked: [] }; }

  function all() { return facts; }

  /* ── Optional hosted model ─────────────────────────────────────────────────────────
     Point PROXY at the deployed worker (see worker/README.md) and a hosted model takes over
     understanding and phrasing, with everything above it acting as the retriever. Left empty,
     the page needs no network at all and behaves exactly as it does offline.

     Three rules keep a remote answer as trustworthy as a local one:
       · it only ever runs on facts Joey has actually written — an unanswered or unmatched
         question never reaches it, so the model is never in a position to fill a gap;
       · it is given only the few facts that were retrieved, never the whole profile;
       · any figure it returns that is not in those facts is treated as invented, and the
         locally built answer is used instead.
     Anything slow, failed, rate-limited or ungrounded falls back silently. */

  function configure(options) {
    if (options && typeof options.proxy === "string") PROXY = options.proxy;
    if (options && options.timeout) TIMEOUT = options.timeout;
    return PROXY;
  }

  function digits(text) { return String(text || "").match(/\d+(?:[.,]\d+)*/g) || []; }

  /* A number the model produced that is nowhere in its source is the failure mode that
     matters on a page about a real person, and it is the one we can actually detect. */
  function grounded(reply, source) {
    var have = digits(source).join(" ");
    return digits(reply).every(function (n) { return have.indexOf(n) >= 0; });
  }

  function context(f) {
    var parts = [f.subject, f.value, f.when && "When: " + f.when, f.where && "Where: " + f.where,
      f.who && "Who: " + f.who, f.how && "How: " + f.how, f.why && "Why: " + f.why,
      (f.list || []).join("; "), f.more].filter(Boolean).join(". ");
    /* Hand it prose. Left as markup, "[the Experience planet](#page:Experience)" comes back
       verbatim in the answer, where it means nothing. */
    return parts.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)")
      .replace(/\[([^\]]+)\]\(#[^)]*\)/g, "$1");
  }

  function remote(question, picked) {
    if (typeof fetch === "undefined") return Promise.reject();
    var source = picked.map(context).join("\n\n");
    var stop = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (stop) stop.abort(); }, TIMEOUT);
    return fetch(PROXY, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: question, facts: source }),
      signal: stop && stop.signal
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (data) {
      var text = data && typeof data.answer === "string" ? data.answer.trim() : "";
      if (text.length < 8 || text.length > 900) throw new Error("length");
      if (!grounded(text, source)) throw new Error("ungrounded");
      return text;
    });
  }

  /* What the panel calls. Resolves to a reply whether or not a proxy is configured. */
  function respond(question) {
    var local = answer(question), f = local.fact && byId(local.fact);
    if (!PROXY || !f || f.pending) return Promise.resolve(local);
    var scored = rank(terms(question).join(" "), String(question).toLowerCase(), "describe", state);
    var floor = Math.max(WEAK, (scored[0] ? scored[0].score : 0) * .6);
    var picked = [f].concat(scored.filter(function (s) {
      return s.fact !== f && !s.fact.pending && s.score >= floor;
    }).slice(0, 2).map(function (s) { return s.fact; }));
    return remote(question, picked)
      .then(function (text) {
        return { blocks: [{ kind: "p", text: text }], related: local.related, fact: local.fact,
          confidence: local.confidence, source: "remote" };
      })
      .catch(function () { return local; });
  }

  return { answer: answer, respond: respond, follow: follow, reset: reset, cues: cueList,
    facts: all, configure: configure, grounded: grounded, proxy: function () { return PROXY; },
    _: { terms: terms, stem: stem, canon: canon, intentOf: intentOf, rank: rank, state: function () { return state; } } };
})(typeof Profile !== "undefined" ? Profile : require("./profile.js"));

if (typeof module !== "undefined" && module.exports) module.exports = Ask;
