/* Joey's fact base — the data behind the Ask panel (ask.js).
 *
 * This file holds FACTS, not written answers. A fact is a subject and a set of slots
 * (value, why, when, where, who, how, more). ask.js works out what a visitor's question
 * is really asking for, picks the fact, and builds a sentence from the slot that fits.
 * One fact therefore answers "what's your favorite film", "do you like movies",
 * "why that one" and "tell me about films" without any of them being written out.
 *
 * To teach it something new: add a fact. `keys` is the vocabulary that should reach it —
 * write the words a stranger would use, not the words you would. Empty `value` means
 * unanswered, and the panel says so honestly rather than guessing.
 */
var Profile = (function () {
  "use strict";

  var me = {
    name: "Joey",
    full: "Joel Paul",
    email: "you@example.com",          /* TODO replace with your real address (also in index.html) */
    site: "this site"
  };

  /* ── Facts Joey has answered ─────────────────────────────────────────────────────────
     Sourced from the resume and the rest of the site. Keep every claim here checkable. */

  var answered = [
    {
      id: "who", kind: "identity", topic: "me", summary: 1,
      phrases: "about yourself|about you|about joey|who are you|introduce",
      keys: "who you name yourself introduce introduction about bio background story person",
      subject: "who I am",
      value: "Joel Paul — I go by Joey. I'm a computer science and math student who builds " +
             "iOS and React Native apps, and I spend most of my time on machine learning and quantitative research",
      where: "College Station, Texas",
      more: "Right now that splits three ways: a satellite collision-risk model, a portfolio manager seat at Sinn Fund, " +
            "and whatever I'm building on the side"
    },
    {
      id: "study", kind: "fact", topic: "school", summary: 1,
      intents: "what when where",
      phrases: "where do you study|what do you study|go to school|major in|your major|what year",
      keys: "study studying school college university degree major minor course class year graduate graduation " +
            "computer science cs math mathematics texas a&m aggie am academics education undergrad",
      subject: "what I study", frame: "I'm studying {value}.",
      value: "a B.S. in Computer Science with a minor in Mathematics at Texas A&M",
      when: "I'm expected to graduate in May 2029",
      where: "Texas A&M, in College Station",
      why: "Computer science is the part I build with and math is the part that makes the models honest — " +
           "the collision-risk work needs both"
    },
    {
      id: "where-live", kind: "place", topic: "location",
      intents: "where",
      keys: "live living based location city state where from place home located reside area",
      subject: "where I'm based",
      value: "College Station, Texas",
      more: "I spent the summer of 2026 in San Francisco working out of the Yale Hacker House"
    },
    {
      id: "looking", kind: "fact", topic: "hiring", summary: 1,
      phrases: "looking for|are you hiring|are you available|open to|after college|after graduation|after school|next for you",
      keys: "looking hiring job internship intern opportunity role research available work opening " +
            "recruit recruiting hire employ apply position seeking next",
      subject: "what I'm looking for", frame: "I'm looking for {value}.",
      value: "internships and research roles",
      why: "I want the kind of problem where the model actually has to hold up — research, quant, or ML infrastructure",
      more: "The fastest way to reach me is email"
    },

    /* Work. The Experience planet has the long version of each of these. */
    {
      id: "sinn", kind: "role", topic: "work", summary: 1,
      intents: "what where when who how",
      keys: "sinn fund portfolio manager current job now quant quantitative trading strategy strategies " +
            "backtest backtests backtesting asset assets aum finance investing investment",
      subject: "Sinn Fund",
      value: "I'm a portfolio manager at Sinn Fund, which manages $10–15M in assets",
      when: "May 2026 to now",
      where: "College Station, Texas",
      how: "My work is research — I study quantitative trading strategies and test them across multiple years of backtests",
      more: "I was selected after rigorous interview cycles and promoted to portfolio manager in my first semester. " +
            "[The full version is on the Experience planet](#page:Experience)"
    },
    {
      id: "pathlight", kind: "role", topic: "work", summary: 1,
      intents: "what where when who how why",
      phrases: "last summer|this summer|summer internship|where did you intern|at pathlight",
      keys: "pathlight path assistant voice blind low vision accessibility accessible calendar gmail outlook " +
            "icloud inbox summer sf san francisco startup internship hacker house yale llm fine tune tuning harness latency backend",
      subject: "Pathlight Project",
      value: "I was a machine learning and backend engineer at Pathlight Project, which builds PATH — " +
             "a voice-first assistant for blind and low-vision people",
      when: "May to August 2026",
      where: "San Francisco, out of the Yale Hacker House",
      who: "Pathlight was founded by Ariyan Patel of Yale, and Kushal Patel and Ronak Saramya of Stanford. " +
           "I spent the summer with the team in the Yale Hacker House",
      how: "I built the harness behind the assistant: the system that takes what someone says, works out the task, " +
           "and carries it through with low latency and high accuracy. I worked on its architecture and fine-tuned " +
           "the language models behind it",
      why: "Accuracy matters more when you can't check the screen — so PATH reads key details back before it sends " +
           "anything, and asks instead of guessing when a request is unclear",
      more: "I also built UI for the mobile and desktop apps, designed around a blind and low-vision audience. " +
            "The company is now being sold. [pathlightproj.com](https://www.pathlightproj.com/)"
    },
    {
      id: "maroon", kind: "role", topic: "work",
      intents: "what where when who how",
      keys: "maroon fund co-director director desk analyst analysts dip detection xgboost financial modeling " +
            "texas a&m student fund managed team leadership lead",
      subject: "Maroon Fund",
      value: "I was co-director of the quant trading desk at Maroon Fund, the fastest-growing investment fund at Texas A&M",
      when: "August 2025 to May 2026",
      where: "College Station, Texas",
      how: "I worked on models built on dip-detection strategies and machine learning, and as co-director I oversaw " +
           "the desk's analysts and made sure the models held up",
      more: "[The full version is on the Experience planet](#page:Experience)"
    },

    /* Projects. */
    {
      id: "satellite", kind: "project", topic: "projects", summary: 1,
      intents: "what how why when",
      phrases: "working on|work on|current project|these days|latest project|building now",
      keys: "satellite satellites collision conjunction risk space orbit orbital debris kelvins esa challenge " +
            "project building current now working model prediction predict machine learning python close approach",
      subject: "the satellite collision-risk model",
      value: "I'm predicting how the risk of a close approach between two objects in orbit evolves as the encounter gets nearer",
      how: "Python and machine learning, trained on ESA's Kelvins Collision Avoidance Challenge data",
      why: "A conjunction warning days out is mostly noise, and the useful question is whether the risk is going to " +
           "hold or fall away by the time you'd have to burn fuel to move",
      when: "It's what I'm working on now",
      more: "There's a live demo of the close-approach geometry on [the Projects planet](#page:Projects)"
    },
    {
      id: "site", kind: "project", topic: "projects",
      intents: "what how why",
      phrases: "this site|this website|this page|build this|built this|make this",
      keys: "site website portfolio page built build made make this orbit solar system planets canvas three " +
            "3d graphics javascript code source design landscape terrain",
      subject: "this site",
      value: "A single page with a small solar system you can fly around — each planet is a page, " +
             "and the landscape you're looking at is that planet's ground",
      how: "Hand-rolled 3D on one canvas. No Three.js, no framework, no build step — a projection function, " +
           "a painter's sort and a height field. The light follows your own clock, so it's lit for whatever hour you visit",
      why: "A portfolio that's a list of links is a résumé with extra steps. I wanted the navigation to be the thing worth seeing",
      more: "Catch the ship in orbit, or press F, and it turns into a small game"
    },
    {
      id: "flight", kind: "project", topic: "projects",
      phrases: "is there a game|hidden game|easter egg|secret|the ship|fly the ship|play the game",
      keys: "flight game ship starship fly flying play arcade rocket easter egg hidden secret asteroid drone laser",
      subject: "Flight",
      value: "A small game hidden in the site — catch Starship in the orbit, or press F, and you fly it out through " +
             "the belt toward each page's world",
      how: "Same 3D engine and the same colors as the rest of the site, so it looks like it belongs rather than " +
           "like an arcade cabinet dropped in",
      more: "Get to a world and you can land on that page"
    },

    /* Skills and how he works. */
    {
      id: "skills", kind: "list", topic: "skills", summary: 1,
      keys: "skill skills tech technology stack language languages programming code coding tool tools framework " +
            "good at proficient swift react native typescript python javascript pandas",
      subject: "what I work in", frame: "I work mostly in {value}.",
      list: ["Swift — iOS native modules and app code",
             "React Native and TypeScript — cross-platform mobile",
             "Python — experiments, data work and model training",
             "Machine learning — prediction models, currently applied to collision risk",
             "XGBoost and backtesting, from the trading desks",
             "AI-assisted development — I'm still working out where it actually helps"],
      value: "Swift, React Native, TypeScript, Python, and machine learning",
      more: "The finance work added XGBoost, backtesting and a lot of time in pandas"
    },
    {
      id: "ai-view", kind: "opinion", topic: "ai",
      intents: "what how why",
      phrases: "think about ai|about ai|use ai|feel about ai",
      keys: "ai artificial intelligence llm llms model models chatgpt claude copilot cursor agent vibe coding " +
            "think opinion view take future replace developer",
      subject: "AI in how software gets built",
      value: "I use AI constantly, and I'm still working out where it actually helps",
      why: "It's very good at the parts I already understand and can check, and least trustworthy exactly where " +
           "I'd most like to lean on it. Fine-tuning the models behind PATH made that concrete — the failure modes " +
           "are confident, not obvious",
      more: "This site's Ask panel is the small version of that thought: no API key, no model call, " +
            "just a retrieval model that admits when it doesn't know"
    },
    {
      id: "interests", kind: "list", topic: "interests", summary: 1,
      keys: "interested interest interests care about passionate passion curious curiosity into like love " +
            "excited field domain area subject topic",
      subject: "what I'm interested in", frame: "I'm interested in {value}.",
      list: ["Orbital mechanics and space — enough to spend this year on collision risk and build a solar system to navigate a website",
             "Quantitative research and markets — two trading desks so far",
             "Accessibility and assistive tech — a summer of it at Pathlight changed how I think about interfaces",
             "How AI changes the way software actually gets written"],
      value: "space and orbital mechanics, quantitative research, accessibility, and where AI fits into building software",
      why: "They're all the same shape of problem: a messy signal, a decision that costs something, " +
           "and no credit for a model that only looks right"
    },
    {
      id: "contact", kind: "contact", topic: "contact",
      intents: "how where who",
      phrases: "get in touch|reach you|contact you|your email|email you|hire you",
      keys: "contact email reach message get in touch hire talk connect linkedin github social dm mail write",
      subject: "how to reach me",
      value: "Email is best — " + me.email,
      more: "GitHub and LinkedIn are on [the Contact planet](#page:Contact)"
    }
  ];

  /* ── Unanswered ──────────────────────────────────────────────────────────────────────
     Joey: fill in `value` (and `why` if you want a second sentence) and the question starts
     working — the panel picks it up automatically and starts suggesting it. Leave one empty
     and the panel says he hasn't answered it rather than inventing something. Nothing else
     to change. */

  var pending = [
    { id: "film",      topic: "film",     subject: "my favorite film",
      keys: "movie film flick cinema watch watching favorite best show series tv netflix",
      value: "", why: "" },
    { id: "book",      topic: "book",     subject: "my favorite book",
      keys: "book books read reading novel author write writer literature favorite best reads",
      value: "", why: "" },
    { id: "song",      topic: "music",    subject: "my favorite song",
      keys: "song music listen listening artist band album track tune playlist spotify genre favorite",
      value: "", why: "" },
    { id: "freetime",  topic: "freetime", subject: "what I do in my free time",
      phrases: "free time|spare time|for fun|outside of work|outside work|off the clock",
      keys: "free spare hobby hobbies fun weekend relax unwind downtime enjoy",
      value: "", why: "" },
    { id: "studyspot", topic: "freetime", subject: "where I like to study",
      phrases: "like to study|study spot|studying spot|where do you like",
      keys: "study studying spot place library cafe coffee shop desk like favorite best usually",
      value: "", why: "" },
    { id: "food",      topic: "food",     subject: "my favorite food",
      keys: "food eat eating meal restaurant dish cook cooking cuisine favorite hungry",
      value: "", why: "" },
    { id: "coffee",    topic: "food",     subject: "my coffee order",
      keys: "coffee order drink tea espresso latte caffeine",
      value: "", why: "" },
    { id: "game",      topic: "games",    subject: "the game I play most",
      keys: "game games gaming video console pc steam favorite",
      value: "", why: "" },
    { id: "sport",     topic: "sport",    subject: "the sport I follow",
      keys: "sport sports team follow watch football basketball soccer f1 racing play athletic gym run running",
      value: "", why: "" },
    { id: "hometown",  topic: "location", subject: "where I grew up", intents: "where",
      keys: "hometown grew grow up raised born childhood originally from home town",
      value: "", why: "" },
    { id: "morning",   topic: "routine",  subject: "my morning",
      keys: "morning routine wake early schedule night owl sleep bedtime",
      value: "", why: "" },
    { id: "reading",   topic: "book",     subject: "what I'm reading right now",
      keys: "reading right now currently book current lately recently",
      value: "", why: "" }
  ];

  pending.forEach(function (f) { f.kind = "preference"; f.pending = 1; });

  /* Questions the panel offers. Ones whose fact is still unanswered are filtered out by
     ask.js, so the suggestions always lead somewhere. */
  var cues = [
    { q: "What are you working on right now?", fact: "satellite" },
    { q: "What are you interested in?",        fact: "interests" },
    { q: "Where do you study?",                fact: "study" },
    { q: "What did you do at Pathlight?",      fact: "pathlight" },
    { q: "What do you do in your free time?",  fact: "freetime" },
    { q: "What's your favorite book?",         fact: "book" },
    { q: "What's your favorite film?",         fact: "film" },
    { q: "Where do you like to study?",        fact: "studyspot" },
    { q: "What are you looking for?",          fact: "looking" },
    { q: "What do you think about AI?",        fact: "ai-view" },
    { q: "How did you build this site?",       fact: "site" },
    { q: "What music do you listen to?",       fact: "song" },
    { q: "How do I reach you?",                fact: "contact" }
  ];

  return { me: me, facts: answered.concat(pending), cues: cues };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Profile;
