/* Ask Joey — the model behind the About page.
 * These lock down the two things that actually matter: that a question reaches the fact a
 * person meant, however they phrased it, and that the model never invents an answer Joey
 * has not given it. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Profile = require('../profile.js');
const Ask = require('../ask.js');

function ask(question) { Ask.reset(); return Ask.answer(question); }
function text(reply) {
  return reply.blocks.map(b => b.kind === 'list' ? b.items.join(' ') : b.text).join(' ');
}

test('normalising collapses spelling, slang and plurals onto the same stems', () => {
  const { terms, canon } = Ask._;
  assert.deepEqual(terms('favourite films'), terms('fav flick'));
  assert.equal(canon('movies'), canon('film'));
  assert.equal(canon('songs'), canon('music'));
  assert.equal(canon('universities'), canon('school'));
  assert.equal(canon('college'), canon('university'));
  assert.equal(canon('studying'), canon('studies'));
  assert.deepEqual(terms('whats ur fav flick'), terms('What is your favourite film?'));
});

test('intent is read from the question word, not the topic', () => {
  const intent = q => Ask._.intentOf(q.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean), q.toLowerCase());
  assert.equal(intent('where do you live'), 'where');
  assert.equal(intent('when do you graduate'), 'when');
  assert.equal(intent('why that one'), 'why');
  assert.equal(intent('how did you build it'), 'how');
  assert.equal(intent('do you like python'), 'bool');
  assert.equal(intent('tell me about pathlight'), 'describe');
  assert.equal(intent('hey'), 'greet');
});

test('paraphrases of the same question reach the same fact', () => {
  const groups = [
    ['what are you working on', 'what are you working on right now', "what's your current project", 'what are you up to these days'],
    ['tell me about yourself', 'who are you', 'tell me about joey', 'introduce yourself'],
    ['what did you do at pathlight', 'tell me about pathlight', 'what was path', 'the voice assistant job'],
    ['what are your skills', 'what languages do you know', 'what tech do you use', 'what are you good at'],
    ['how do i reach you', 'how can i contact you', 'whats your email', 'how do i get in touch'],
    ['what are you interested in', 'what do you care about', 'what are you passionate about'],
  ];
  for (const group of groups) {
    const facts = group.map(q => ask(q).fact);
    assert.equal(new Set(facts).size, 1, `${group.join(' / ')} → ${facts.join(', ')}`);
    assert.ok(facts[0], `${group[0]} found nothing`);
  }
});

test('"where do you study" is the school; "where do you like to study" is the spot', () => {
  assert.equal(ask('Where do you study?').fact, 'study');
  assert.equal(ask('what school do you go to').fact, 'study');
  assert.equal(ask('where do you like to study').fact, 'studyspot');
  assert.equal(ask('whats your favorite study spot').fact, 'studyspot');
});

test('the intent picks the slot, so one fact answers several questions', () => {
  assert.match(text(ask('when do you graduate')), /May 2029/);
  assert.match(text(ask('where do you study')), /Texas A&M/);
  assert.match(text(ask('why computer science')), /honest/i);
  assert.match(text(ask('how did you build this site')), /canvas/i);
  assert.match(text(ask('do you know python')), /^Yes\./);
});

test('every answered fact is reachable, and no answer comes back empty', () => {
  for (const fact of Ask.facts().filter(f => !f.pending)) {
    const probe = fact.keys.split(' ').slice(0, 3).join(' ');
    const reply = ask(probe);
    assert.equal(reply.fact, fact.id, `"${probe}" should reach ${fact.id}`);
    const body = text(reply).trim();
    assert.ok(body.length > 10, `empty answer for ${fact.id}`);
    assert.doesNotMatch(body, /undefined|\{value\}|\[object/, `${fact.id} leaked a template`);
  }
});

test('an unanswered fact says so and never invents a value', () => {
  for (const fact of Ask.facts().filter(f => f.pending)) {
    assert.equal(fact.value, '', `${fact.id} is marked pending but has a value`);
  }
  for (const question of ['whats your favorite movie', 'what music do you listen to',
    'whats your favorite book', 'whats your coffee order']) {
    const reply = ask(question);
    const body = text(reply);
    assert.ok(Ask.facts().find(f => f.id === reply.fact).pending, `${question} hit an answered fact`);
    assert.match(body, /hasn't|still blank|Not yet/i, `${question} → ${body}`);
    assert.match(body, new RegExp(Profile.me.email.replace('.', '\\.')));
  }
});

test('suggestions only ever offer questions the model can answer', () => {
  const cues = Ask.cues([]);
  assert.ok(cues.length >= 4);
  for (const cue of cues) {
    const fact = Ask.facts().find(f => f.id === cue.fact);
    assert.ok(fact && !fact.pending, `suggested "${cue.q}" but ${cue.fact} is unanswered`);
    assert.equal(ask(cue.q).fact, cue.fact, `suggested "${cue.q}" does not route to ${cue.fact}`);
  }
});

test('off-topic questions and commands are declined rather than answered', () => {
  for (const question of ['whats the capital of france', 'what time is it', 'who won the world cup']) {
    assert.equal(ask(question).fact, null, question);
    assert.match(text(ask(question)), /only know about Joey/);
  }
  for (const command of ['write me a python script', 'build me a website', 'translate this to french']) {
    assert.equal(ask(command).fact, null, command);
    assert.match(text(ask(command)), /not that kind of model/);
  }
});

test('a question about Joey with no fact behind it admits the gap', () => {
  const reply = ask('what is your shoe size');
  assert.equal(reply.fact, null);
  assert.match(text(reply), /isn't something he's written down/);
  assert.match(text(reply), new RegExp(Profile.me.email.replace('.', '\\.')));
});

test('the model asks itself honestly what it is', () => {
  const reply = ask('are you an llm');
  assert.match(text(reply), /not a language model/);
  assert.match(text(reply), /no server|no API key/);
  assert.equal(ask('who made you').blocks.length > 0, true);
});

test('follow-ups carry the previous fact instead of starting a new search', () => {
  Ask.reset();
  const first = Ask.answer('what did you do at pathlight');
  assert.equal(first.fact, 'pathlight');
  const why = Ask.answer('why?');
  assert.equal(why.fact, 'pathlight');
  assert.match(text(why), /can't check the screen/);
  const more = Ask.answer('tell me more');
  assert.equal(more.fact, 'pathlight');
  assert.notEqual(text(more), text(why));
  const shift = Ask.answer('what about maroon');
  assert.equal(shift.fact, 'maroon');
});

test('a broad opener answers with the overview, not one fact', () => {
  const reply = ask('tell me about yourself');
  assert.ok(reply.blocks.length >= 4, 'overview should draw on several facts');
  const body = text(reply);
  assert.match(body, /Joey/);
  assert.match(body, /Texas A&M/);
  assert.match(body, /Sinn Fund/);
});

test('an empty or unreadable question asks for one instead of throwing', () => {
  for (const junk of ['', '   ', '???', '!!!', 'asdfghjkl']) {
    const reply = Ask.answer(junk);
    assert.ok(text(reply).length > 0, JSON.stringify(junk));
  }
});

test('every suggestion after an answer leads somewhere', () => {
  Ask.reset();
  const reply = Ask.answer('what did you do at pathlight');
  assert.ok(reply.related.length > 0);
  for (const cue of reply.related) {
    const next = Ask.follow(cue);
    assert.ok(text(next).trim().length > 10, `${cue.q} came back empty`);
  }
});
