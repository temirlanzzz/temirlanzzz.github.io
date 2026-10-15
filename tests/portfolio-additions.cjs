// Run with: node tests/portfolio-additions.cjs (Node.js 18+).
// The fixed baseline is the portfolio before the two additive project cards.
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
assert.equal(projects.length, 8);
assert.deepEqual(projects.slice(0, 6), old, 'All six original cards remain byte-for-byte equivalent as data');
// Every page section, style, mini-link, and lab is unchanged except the count.
assert.equal(html.split('/* ---------- work data ---------- */')[0].replace('08 · live in your browser', '06 · live in your browser'), baseline.split('/* ---------- work data ---------- */')[0]);
assert.equal(html.split('/* cursor pill that follows the pointer over tiles */')[1], baseline.split('/* cursor pill that follows the pointer over tiles */')[1]);
assert.match(html, /08 · live in your browser/);
for (const p of projects) assert.ok(fs.existsSync(path.join(root, p.img)), p.img);
assert.equal(projects[6].demo, 'https://temirlanzzz.github.io/robot_pose_estimation/');
assert.equal(projects[7].demo, 'https://temirlanzzz.github.io/search-engine/');
for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
let rendered = '';
vm.runInNewContext(html.match(/const GHUB=[\s\S]*?\n\/\* tile video/)[0].replace(/\/\* tile video$/, ''), { $: () => ({ set innerHTML(value) { rendered = value; } }) });
assert.equal((rendered.match(/<article>/g) || []).length, 8);
assert.equal((rendered.match(/<video /g) || []).length, 6);
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
  assert.equal(play, 6);
  assert.equal(pause, 6);
  // A harmless observer callback on an image-only tile must not throw either.
  observers[0].cb([{ target: tiles[6], isIntersecting: true }]);
}
console.log('PASS: 8 cards; 6 original cards, sections, CSS and lab preserved; all images exist; scripts parse; desktop/touch video flows handle image-only cards.');
// Nested static app must work on the existing root Pages deployment.
assert.ok(fs.existsSync(path.join(root, '.nojekyll')), 'Preserve .nojekyll for nested assets');
const nested = fs.readFileSync(path.join(root, 'search-engine/index.html'), 'utf8');
const assets = [...nested.matchAll(/(?:src|href)="(\/search-engine\/[^\"]+)"/g)].map(m => m[1]);
assert.ok(assets.some(a => a.endsWith('.js')), 'Nested app has an absolute-base JS entry');
for (const asset of assets) assert.ok(fs.existsSync(path.join(root, asset)), asset);
assert.match(fs.readFileSync(path.join(root, 'search-engine/SOURCE.md'), 'utf8'), /Source commit: [a-f0-9]{40}/);
const originalFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', '7963132'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
for (const file of originalFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Original file remains: ${file}`);
  if (file === 'index.html') continue;
  const original = execFileSync('git', ['show', `7963132:${file}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  assert.deepEqual(fs.readFileSync(path.join(root, file)), original, `Original asset unchanged: ${file}`);
}
console.log('PASS: All original files preserved; nested app asset paths resolve and source commit is recorded.');
