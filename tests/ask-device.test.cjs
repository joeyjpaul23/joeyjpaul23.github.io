/* The on-device model (ask-llm.js) only phrases. These cover the contract in ask.js with a
 * stand-in for the model, using real outputs Qwen2.5 0.5B produced in testing: what reaches
 * it, which replies stand, and that every drift lands on the locally written answer. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Ask = require('../ask.js');

let seen = [];
function model(reply) {
  seen = [];
  Ask.configure({ phrase: (question, facts, onText, draft) => { seen.push({ question, facts, draft }); return reply; }, name: 'Test' });
}
afterEach(() => { Ask.configure({ phrase: null }); Ask.reset(); });
const text = reply => reply.blocks.map(b => b.kind === 'list' ? b.items.join(' ') : b.text).join(' ');

test('a faithful first-person rewrite stands and is marked as the device', async () => {
  model("I was a machine learning and backend engineer at Pathlight Project, which builds PATH — a voice-first assistant for blind and low-vision people.");
  const reply = await Ask.respond('what did you do at pathlight');
  assert.equal(reply.source, 'device');
  assert.match(text(reply), /backend engineer at Pathlight/);
  assert.equal(seen.length, 1);
  assert.ok(seen[0].draft.length > 0, 'the model is given the local answer to rewrite');
  assert.ok(seen[0].facts.includes('Pathlight'), 'and only the retrieved facts');
});

test('an invented description is caught and the local answer is used', async () => {
  for (const drift of [
    'Sinn Fund is a professional investment firm that specializes in quantitative trading strategies and serves its clients.',
    'Maroon Fund is a private investment fund that focuses on high-risk, high-reward opportunities.',
  ]) {
    model(drift); Ask.reset();
    const reply = await Ask.respond(drift.startsWith('Sinn') ? 'tell me about the sinn fund' : 'what is the maroon fund');
    assert.notEqual(reply.source, 'device');
    assert.doesNotMatch(text(reply), /professional investment firm|high-risk/);
  }
});

test('a figure that is not in the facts is rejected even in the first person', async () => {
  model("I'm a portfolio manager at Sinn Fund, which manages $90M in assets.");
  const reply = await Ask.respond('tell me about the sinn fund');
  assert.notEqual(reply.source, 'device');
  assert.doesNotMatch(text(reply), /90/);
});

test('an unanswered question never reaches the model', async () => {
  model('I have a 4.0.');
  const reply = await Ask.respond('whats your gpa');
  assert.equal(seen.length, 0);
  assert.notEqual(reply.source, 'device');
});

test('a model that fails or throws falls back without an error', async () => {
  model(Promise.reject(new Error('lost the GPU')));
  const reply = await Ask.respond('where do you study');
  assert.notEqual(reply.source, 'device');
  assert.match(text(reply), /Texas A&M/);
});

test('the meta answer says the model is on this device when it is', async () => {
  model('unused');
  assert.match(text(await Ask.respond('how does this work')), /on this device's GPU/);
});
