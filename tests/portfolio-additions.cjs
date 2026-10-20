// Run with: node tests/portfolio-additions.cjs (Node.js 18+).
// The fixed baseline is the portfolio before the additive project cards.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const baseline = execFileSync('git', ['show', '7963132:index.html'], { cwd: root, encoding: 'utf8' });
function data(source) {
  const code = source.match(/const GHUB=[\s\S]*?\n\];/)[0];
  return JSON.parse(vm.runInNewContext(`${code}\nJSON.stringify(P)`));
}
const old = data(baseline), projects = data(html);
assert.equal(old.length, 6);
assert.equal(projects.length, 10);
assert.deepEqual(projects.slice(0, 6), old, 'All six original cards remain byte-for-byte equivalent as data');
// Every original line of markup and CSS before the work data is still there.
// The ASCII ocean only adds lines; the one deliberate change is that the
// theme now defaults to dark (the black water), with the toggle kept.
const before = html.split('/* ---------- work data ---------- */')[0];
for (const line of baseline.split('/* ---------- work data ---------- */')[0].split('\n')) {
  if (line.includes("localStorage.getItem('theme')") || line.includes('06 · live in your browser')) continue;
  assert.ok(before.includes(line), `Original line kept: ${line.slice(0, 90)}`);
}
assert.match(before, /<canvas id="ocean" aria-hidden="true"><\/canvas>/);
assert.match(html, /import \{ createOcean \} from '\.\/js\/ocean\.js'/);
assert.ok(fs.existsSync(path.join(root, 'js/ocean.js')), 'ocean engine shipped');
assert.equal(html.split('/* cursor pill that follows the pointer over tiles */')[1], baseline.split('/* cursor pill that follows the pointer over tiles */')[1]);
assert.match(html, /10 · live in your browser/);
for (const p of projects) assert.ok(fs.existsSync(path.join(root, p.img)), p.img);
assert.equal(projects[6].demo, 'https://temirlanzzz.github.io/robot_pose_estimation/');
assert.equal(projects[7].demo, 'https://temirlanzzz.github.io/search-engine/');
// The three.js demos are nested here with relative links, so they work on temirlan.work and github.io alike.
assert.equal(projects[8].demo, 'atrium/');
assert.equal(projects[9].demo, 'arcanum/');
for (const p of projects.filter(p => p.video)) assert.ok(fs.existsSync(path.join(root, p.video)), p.video);
for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  // classic scripts compile as scripts; module scripts (the ocean) are checked as ES modules
  if (script[1].includes('type="module"')) execFileSync(process.execPath, ['--input-type=module', '--check'], { input: script[2] });
  else new vm.Script(script[2]);
}
execFileSync(process.execPath, ['--input-type=module', '--check'], { input: fs.readFileSync(path.join(root, 'js/ocean.js')) });
let rendered = '';
vm.runInNewContext(html.match(/const GHUB=[\s\S]*?\n\/\* tile video/)[0].replace(/\/\* tile video$/, ''), { $: () => ({ set innerHTML(value) { rendered = value; } }) });
assert.equal((rendered.match(/<article>/g) || []).length, 10);
assert.equal((rendered.match(/<video /g) || []).length, 8);
assert.ok(!rendered.includes('undefined'));
// Exercise both input modes and observer events with video-free tiles.
const mediaCode = html.split('/* tile video: hover on desktop, in-view on touch / private */')[1].split('/* cursor pill')[0];
for (const fine of [true, false]) {
  let play = 0, pause = 0;
  const observers = [], tiles = projects.map(p => {
    const listeners = {};
    const v = p.video ? { src: '', dataset: { src: p.video }, play() { play++; return Promise.resolve(); }, pause() { pause++; } } : null;
    return { listeners, querySelector: () => v, classList: { add() {}, remove() {} }, addEventListener: (event, cb) => { listeners[event] = cb; } };
  });
  vm.runInNewContext(mediaCode, { fine, document: { querySelectorAll: () => tiles }, setTimeout: cb => cb(), IntersectionObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe(t) { this.cb([{target: t, isIntersecting: true}, {target: t, isIntersecting: false}]); } } });
  if (fine) tiles.forEach(t => { t.listeners.mouseenter?.(); t.listeners.mouseleave?.(); });
  assert.equal(play, 8);
  assert.equal(pause, 8);
  // A harmless observer callback on an image-only tile must not throw either.
  observers[0].cb([{ target: tiles[6], isIntersecting: true }]);
}
console.log('PASS: 10 cards; 6 original cards, sections, CSS and lab preserved; all images exist; scripts parse; desktop/touch video flows handle image-only cards.');
// Nested static app must work on the existing root Pages deployment.
assert.ok(fs.existsSync(path.join(root, '.nojekyll')), 'Preserve .nojekyll for nested assets');
const nested = fs.readFileSync(path.join(root, 'search-engine/index.html'), 'utf8');
const assets = [...nested.matchAll(/(?:src|href)="(\/search-engine\/[^\"]+)"/g)].map(m => m[1]);
assert.ok(assets.some(a => a.endsWith('.js')), 'Nested app has an absolute-base JS entry');
for (const asset of assets) assert.ok(fs.existsSync(path.join(root, asset)), asset);
assert.match(fs.readFileSync(path.join(root, 'search-engine/SOURCE.md'), 'utf8'), /Source commit: [a-f0-9]{40}/);
for (const demo of ['atrium', 'arcanum']) {
  const page = fs.readFileSync(path.join(root, demo, 'index.html'), 'utf8');
  const refs = [...page.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.some(a => a.endsWith('.js')), `${demo} has a relative JS entry`);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(root, demo, ref)), `${demo}/${ref}`);
  assert.match(fs.readFileSync(path.join(root, demo, 'SOURCE.md'), 'utf8'), /Source commit: [a-f0-9]{40}/);
}
const originalFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', '7963132'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
for (const file of originalFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Original file remains: ${file}`);
  if (file === 'index.html') continue;
  const original = execFileSync('git', ['show', `7963132:${file}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  assert.deepEqual(fs.readFileSync(path.join(root, file)), original, `Original asset unchanged: ${file}`);
}
console.log('PASS: All original files preserved; nested app asset paths resolve and source commit is recorded.');
