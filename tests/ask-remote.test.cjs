/* The hosted model is optional, and the page has to stay trustworthy whether or not it answers.
 * These cover the contract in ask.js: what is allowed to reach the model, what is rejected when
 * it comes back, and that every failure lands on the locally written answer instead of an error. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Ask = require('../ask.js');

const PROXY = 'https://joey-ask.test.workers.dev';
let calls = [];

function serve(handler) {
  calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), signal: options.signal });
    return handler(JSON.parse(options.body), options);
  };
}
const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

afterEach(() => { Ask.configure({ proxy: '', timeout: 6000 }); Ask.reset(); });

function text(reply) {
  return reply.blocks.map(b => b.kind === 'list' ? b.items.join(' ') : b.text).join(' ');
}

test('with no proxy configured nothing is ever sent', async () => {
  serve(() => json({ answer: 'should not be reached' }));
  Ask.reset();
  const reply = await Ask.respond('what did you do at pathlight');
  assert.equal(calls.length, 0);
  assert.equal(reply.source, undefined);
  assert.match(text(reply), /machine learning and backend engineer/);
});

test('a hosted answer replaces the phrasing but keeps the fact and the follow-ups', async () => {
  serve(() => json({ answer: 'I spent the summer of 2026 building the voice harness behind PATH.' }));
  Ask.configure({ proxy: PROXY }); Ask.reset();
  const reply = await Ask.respond('what did you do at pathlight');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, PROXY);
  assert.equal(reply.source, 'remote');
  assert.equal(reply.fact, 'pathlight');
  assert.match(text(reply), /voice harness/);
  assert.ok(reply.related.length > 0, 'follow-ups still come from the local model');
});

test('only the retrieved facts are sent, never the whole profile', async () => {
  serve(() => json({ answer: 'Something about Pathlight.' }));
  Ask.configure({ proxy: PROXY }); Ask.reset();
  await Ask.respond('what did you do at pathlight');
  const sent = calls[0].body.facts;
  assert.match(sent, /Pathlight/);
  assert.doesNotMatch(sent, /Sinn Fund/, 'an unrelated fact was included');
  assert.ok(sent.length < 3000, 'too much context for one question');
  assert.equal(calls[0].body.question, 'what did you do at pathlight');
});

test('a question Joey has not answered never reaches the model', async () => {
  serve(() => json({ answer: 'His favourite film is Blade Runner.' }));
  Ask.configure({ proxy: PROXY }); Ask.reset();
  for (const question of ['whats your favorite movie', 'what do you do in your free time', 'wheres your hometown']) {
    Ask.reset();
    const reply = await Ask.respond(question);
    assert.match(text(reply), /hasn't|still blank|Not yet/i, question);
    assert.doesNotMatch(text(reply), /Blade Runner/, 'the model filled in a gap');
  }
  assert.equal(calls.length, 0, 'an unanswered question was sent to the model');
});

test('an off-topic question and a meta question are answered locally', async () => {
  serve(() => json({ answer: 'The capital of France is Paris.' }));
  Ask.configure({ proxy: PROXY }); Ask.reset();
  assert.match(text(await Ask.respond('whats the capital of france')), /only know about Joey/);
  Ask.reset();
  assert.match(text(await Ask.respond('are you an llm')), /hosted language model/);
  assert.equal(calls.length, 0);
});

test('a figure that is not in the facts is treated as invented', async () => {
  serve(() => json({ answer: 'He is a portfolio manager at Sinn Fund, which manages $42M in assets.' }));
  Ask.configure({ proxy: PROXY }); Ask.reset();
  const reply = await Ask.respond('tell me about sinn fund');
  assert.equal(calls.length, 1, 'it should still have been asked');
  assert.notEqual(reply.source, 'remote', 'an invented figure was published');
  assert.doesNotMatch(text(reply), /42M/);
  assert.match(text(reply), /10–15M/, 'the local answer keeps the real figure');
});

test('a figure that is in the facts passes', () => {
  assert.equal(Ask.grounded('It manages $10–15M.', 'Sinn Fund manages $10–15M in assets'), true);
  assert.equal(Ask.grounded('Graduating in May 2029.', 'expected to graduate in May 2029'), true);
  assert.equal(Ask.grounded('He manages $42M.', 'Sinn Fund manages $10–15M in assets'), false);
  assert.equal(Ask.grounded('No numbers at all here.', 'anything'), true);
});

test('an error, a timeout or nonsense from the model all fall back quietly', async () => {
  const cases = [
    ['http error', () => new Response('nope', { status: 502 })],
    ['empty answer', () => json({ answer: '' })],
    ['missing field', () => json({ oops: true })],
    ['not json', () => new Response('<html>rate limited</html>', { status: 200 })],
    ['runaway length', () => json({ answer: 'x'.repeat(2000) })],
  ];
  for (const [name, handler] of cases) {
    serve(handler);
    Ask.configure({ proxy: PROXY }); Ask.reset();
    const reply = await Ask.respond('what did you do at pathlight');
    assert.notEqual(reply.source, 'remote', name);
    assert.match(text(reply), /machine learning and backend engineer/, name);
  }
});

test('a model that hangs is abandoned and the local answer is used', async () => {
  serve((_body, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  Ask.configure({ proxy: PROXY, timeout: 60 }); Ask.reset();
  const started = Date.now();
  const reply = await Ask.respond('what did you do at pathlight');
  assert.ok(Date.now() - started < 3000, 'the panel waited too long');
  assert.notEqual(reply.source, 'remote');
  assert.match(text(reply), /machine learning and backend engineer/);
});

test('the network being down is not an error the visitor sees', async () => {
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  Ask.configure({ proxy: PROXY }); Ask.reset();
  const reply = await Ask.respond('what are you working on');
  assert.match(text(reply), /close approach/);
});
