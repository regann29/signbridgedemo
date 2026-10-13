// Smoke test: loads index.html in jsdom, checks the script boots and the main controls work.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  .replace(/<link[^>]+googleapis[^>]*>/g, '').replace('<script type="module">', '<script>'); // jsdom can't run module scripts; the code has no static imports
const errors = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message)); vc.on('error', e => errors.push(String(e)));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'http://localhost:8000/',
  beforeParse(w){ w.HTMLElement.prototype.focus = function(){}; w.HTMLCanvasElement.prototype.getContext = () => ({ clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, arc(){}, fill(){} }); } });
const { document: d, window: w } = dom.window;
await new Promise(r => setTimeout(r, 300));
const $ = s => d.querySelector(s); let n = 0; const ok = (m, f) => { f(); n++; console.log('ok   ' + m); };

ok('script booted without errors', () => assert.deepEqual(errors, []));
ok('home visible, others hidden', () => { assert.equal($('#view-home').hidden, false); assert.equal($('#view-sign').hidden, true); assert.equal($('#view-voice').hidden, true); });
ok('nav switches views and sets aria-current', () => { $('[data-view="sign"]').click(); assert.equal($('#view-sign').hidden, false); assert.equal($('[data-view="sign"]').getAttribute('aria-current'), 'page'); assert.equal($('[data-view="home"]').hasAttribute('aria-current'), false); });
ok('camera buttons start in correct state', () => { assert.equal($('#camStart').disabled, false); assert.equal($('#camStop').disabled, true); assert.equal($('#recStart').disabled, true); });
$('#camStart').click(); await new Promise(r => setTimeout(r, 100));
ok('camera error shown (no getUserMedia in jsdom)', () => { assert.equal($('#notice').hidden, false); assert.match($('#notice').textContent, /secure page|camera/i); });
ok('text controls: space, backspace, undo, clear', () => {
  const c = $('#compose'); c.value = 'AB'; $('#bSpace').click(); assert.equal(c.value, 'AB ');
  $('#bBack').click(); assert.equal(c.value, 'AB'); $('#bBack').click(); assert.equal(c.value, 'A');
  $('#bUndo').click(); assert.equal(c.value, 'AB'); $('#bClear').click(); assert.equal(c.value, ''); $('#bUndo').click(); assert.equal(c.value, 'AB');
});
ok('empty speak/copy are handled', () => { $('#bClear').click(); $('#bSpeak').click(); assert.match($('#notice').textContent, /no text/i); });
ok('add to conversation', () => { $('#compose').value = 'hi there'; $('#bSend').click(); assert.equal(d.querySelectorAll('#log .entry').length, 1); assert.match(d.querySelector('#log .src').textContent, /Typed/); });
ok('record without a name is refused', () => { $('#gRecord').disabled = false; $('#gRecord').click(); assert.match($('#notice').textContent, /name/i); });
ok('start recognition with no gestures is blocked (button disabled without camera)', () => assert.equal($('#recStart').disabled, true));
ok('empty gesture table state', () => { assert.equal($('#gEmpty').hidden, false); assert.equal($('#gTable').hidden, true); });

$('[data-view="voice"]').click();
ok('speech unsupported -> typed fallback message, start disabled', () => { assert.equal($('#vUnsupported').hidden, false); assert.equal($('#vStart').disabled, true); });
const say = t => { $('#vType').value = t; $('#vForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })); };
ok('typed "hello" gets a greeting', () => { say('hello'); assert.match($('#vReply').textContent, /Hello/); });
ok('typed "what is your name"', () => { say('what is your name?'); assert.match($('#vReply').textContent, /SignBridge/); });
ok('screenshot is honest about being unsupported', () => { say('take a screenshot'); assert.match($('#vReply').textContent, /aren't available/); });
ok('unknown command explained', () => { say('format my disk'); assert.match($('#vReply').textContent, /didn't understand/); });
let opened = null; w.open = (...a) => { opened = a; };
ok('YouTube needs confirmation and does not open yet', () => { say('open youtube'); assert.equal($('#vConfirm').hidden, false); assert.equal(opened, null); });
ok('Cancel opens nothing', () => { $('#vNo').click(); assert.equal($('#vConfirm').hidden, true); assert.equal(opened, null); });
ok('Confirm opens with noopener', () => { say('open youtube'); $('#vYes').click(); assert.equal(opened[0], 'https://www.youtube.com/'); assert.equal(opened[2], 'noopener'); });
ok('empty typed command is rejected', () => { say('   '); assert.match($('#notice').textContent, /Type a command/); });
ok('conversation labels sources', () => { const s = [...d.querySelectorAll('#log .src')].map(e => e.textContent); assert.ok(s.includes('Typed') && s.includes('Assistant reply')); });
ok('clear conversation empties the log', () => { $('#convoClear').click(); assert.equal(d.querySelectorAll('#log .entry').length, 0); assert.equal($('#logEmpty').hidden, false); });
ok('theme toggle + text size', () => { $('#themeBtn').click(); assert.equal(d.documentElement.dataset.theme, 'light'); $('#txtUp').click(); assert.equal(d.documentElement.style.fontSize, '110%'); });
ok('every button has an accessible name', () => { for (const b of d.querySelectorAll('button')) assert.ok((b.textContent.trim() || b.getAttribute('aria-label')), b.outerHTML.slice(0, 80)); });
ok('every text field/textarea has a label', () => { for (const i of d.querySelectorAll('input[type=text],textarea,select,input[type=range]')) assert.ok(d.querySelector(`label[for="${i.id}"]`), i.id); });
ok('no runtime errors after interactions', () => assert.deepEqual(errors, []));
console.log(`\n${n} checks passed`); process.exit(0);
