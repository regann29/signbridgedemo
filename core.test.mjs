// Run with: node tests/core.test.mjs   (no dependencies)
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(dir, '../index.html'), 'utf8');
const core = html.split('// <core>')[1].split('// </core>')[0];
const { normalizeLandmarks, KnnClassifier, Stabilizer, parseCommand, COMMANDS } =
  new Function(core + '\nreturn {normalizeLandmarks,KnnClassifier,Stabilizer,parseCommand,COMMANDS};')();

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); } };

// deterministic pseudo-random
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hand = (curl) => { // synthetic 21-point hand; "curl" changes finger shape
  const pts = [{ x: .5, y: .8, z: 0 }];
  for (let f = 0; f < 5; f++) for (let j = 1; j <= 4; j++)
    pts.push({ x: .5 + (f - 2) * .06 + (curl[f] ? 0 : 0) , y: .8 - j * .08 * (curl[f] ? .4 : 1), z: 0 });
  return pts;
};
const noisy = (pts, s = .004) => pts.map(p => ({ x: p.x + (rnd() - .5) * s, y: p.y + (rnd() - .5) * s, z: 0 }));
const A = hand([1, 1, 1, 1, 1]), B = hand([0, 0, 0, 0, 0]), C = hand([1, 0, 1, 0, 1]);

t('normalize rejects bad input', () => {
  assert.equal(normalizeLandmarks(null), null);
  assert.equal(normalizeLandmarks([{ x: 0, y: 0 }]), null);
  assert.equal(normalizeLandmarks(Array(21).fill({ x: .5, y: .5, z: 0 })), null);
});
t('normalize is translation and scale invariant', () => {
  const a = normalizeLandmarks(A);
  const moved = A.map(p => ({ x: p.x * .5 + .2, y: p.y * .5 + .1, z: 0 }));
  const b = normalizeLandmarks(moved);
  let d = 0; for (let i = 0; i < 63; i++) d += (a[i] - b[i]) ** 2;
  assert.ok(Math.sqrt(d) < 1e-5, 'distance ' + Math.sqrt(d));
  assert.equal(a.length, 63);
});

const train = () => {
  const c = new KnnClassifier();
  for (const [label, proto] of [['A', A], ['B', B], ['C', C]])
    for (let s = 1; s <= 3; s++) for (let i = 0; i < 20; i++) c.add(label, normalizeLandmarks(noisy(proto)), s);
  return c;
};
t('knn recognizes taught signs', () => {
  const c = train();
  for (const [label, proto] of [['A', A], ['B', B], ['C', C]]) {
    const p = c.predict(normalizeLandmarks(noisy(proto)));
    assert.equal(p.label, label); assert.ok(p.confidence > .9);
  }
});
t('knn rejects a very different pose instead of guessing', () => {
  const c = train();
  const weird = Array.from({ length: 21 }, (_, i) => ({ x: .5 + Math.sin(i * 2.3) * .3, y: .5 + Math.cos(i * 1.7) * .3, z: 0 }));
  const p = c.predict(normalizeLandmarks(weird));
  assert.equal(p.label, null); assert.equal(p.reason, 'unfamiliar');
});
t('knn with no samples reports untrained', () => {
  assert.equal(new KnnClassifier().predict(new Float32Array(63)).reason, 'untrained');
});
t('evaluate uses held-out recordings and reports skipped labels', () => {
  const c = train();
  for (let i = 0; i < 10; i++) c.add('Z', normalizeLandmarks(noisy(hand([0, 1, 0, 1, 0]))), 1);
  const r = c.evaluate();
  assert.ok(r.ok); assert.deepEqual(r.skipped, ['Z']); assert.ok(r.accuracy > .95); assert.equal(r.n, 180);
});
t('evaluate refuses when there is not enough data', () => {
  const c = new KnnClassifier(); c.add('A', new Float32Array(63), 1); c.add('B', new Float32Array(63), 1);
  assert.equal(c.evaluate().ok, false);
});
t('export then import round-trips and remaps sessions', () => {
  const c = train(); const json = JSON.parse(JSON.stringify(c.toJSON()));
  const d = new KnnClassifier(); d.add('Q', new Float32Array(63), 5);
  assert.equal(d.loadJSON(json), 180);
  assert.equal(d.counts().A, 60);
  assert.ok(d.nextSession() > 5 + 3);
});
t('import validates files', () => {
  const c = new KnnClassifier();
  assert.throws(() => c.loadJSON({ version: 2 }));
  assert.throws(() => c.loadJSON({ version: 1, samples: [{ label: 'A', f: [1, 2] }] }), /No valid samples/);
  assert.throws(() => c.loadJSON(null));
});

t('stabilizer needs steady frames before emitting', () => {
  const s = new Stabilizer({ stableFrames: 4, cooldownMs: 0 }); let now = 0, out = [];
  for (let i = 0; i < 3; i++) out.push(s.update('A', now += 33));
  assert.deepEqual(out, [null, null, null]);
  assert.equal(s.update('A', now += 33), 'A');
});
t('stabilizer does not repeat a held sign', () => {
  const s = new Stabilizer({ stableFrames: 3, cooldownMs: 0 }); let now = 0, emitted = [];
  for (let i = 0; i < 40; i++) { const r = s.update('A', now += 33); if (r) emitted.push(r); }
  assert.deepEqual(emitted, ['A']);
});
t('stabilizer repeats a letter after the hand is released', () => {
  const s = new Stabilizer({ stableFrames: 3, cooldownMs: 0 }); let now = 0, emitted = [];
  const run = (l, n) => { for (let i = 0; i < n; i++) { const r = s.update(l, now += 33); if (r) emitted.push(r); } };
  run('A', 5); run(null, 2); run('A', 5);
  assert.deepEqual(emitted, ['A', 'A']);
});
t('stabilizer ignores flicker between signs', () => {
  const s = new Stabilizer({ stableFrames: 4, cooldownMs: 0 }); let now = 0, emitted = [];
  for (const l of ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B']) { const r = s.update(l, now += 33); if (r) emitted.push(r); }
  assert.deepEqual(emitted, []);
});
t('stabilizer cooldown delays the next sign', () => {
  const s = new Stabilizer({ stableFrames: 2, cooldownMs: 700 }); let now = 0, emitted = [];
  const run = (l, n) => { for (let i = 0; i < n; i++) { const r = s.update(l, now += 33); if (r) emitted.push([r, now]); } };
  run('A', 3); run('B', 40);
  assert.equal(emitted.length, 2); assert.ok(emitted[1][1] - emitted[0][1] >= 700);
});

const cases = {
  'Hello': 'hello', 'hey there': 'hello', 'What is your name?': 'name', "what's your name": 'name',
  'How are you?': 'howare', 'Take a screenshot': 'read'.replace('read', 'screenshot'),
  'Open YouTube': 'youtube', 'please open youtube': 'youtube', 'Stop listening': 'stop',
  'Goodbye!': 'goodbye', 'help': 'help', 'what can you do': 'help',
  'read this text aloud': 'read', 'say good morning everyone': 'read',
};
for (const [phrase, id] of Object.entries(cases))
  t(`command "${phrase}" -> ${id}`, () => assert.equal(parseCommand(phrase)?.id, id));
t('read arg is extracted', () => assert.equal(parseCommand('say good morning').arg, 'good morning'));
t('read with no text has empty arg', () => assert.equal(parseCommand('read this text aloud').arg, ''));
t('unknown speech returns null', () => { assert.equal(parseCommand('launch the missiles'), null); assert.equal(parseCommand('rm -rf /'), null); assert.equal(parseCommand('   '), null); });
t('"ahead" does not trigger hello', () => assert.equal(parseCommand('go ahead'), null));
t('every command has an example that parses back to itself', () => {
  for (const c of COMMANDS) { const ex = c.example.split(', or:')[0]; assert.equal(parseCommand(ex)?.id, c.id, c.id + ': ' + ex); }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
