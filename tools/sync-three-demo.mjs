// Copy a built three.js demo (ATRIUM or ARCANUM) into the portfolio under /<name>/.
// Usage: node tools/sync-three-demo.mjs <name> [path/to/source-repo]
// The source repo must be committed and already built (npm ci && npm run build),
// with its preview still and reel in out/. Vite base is relative, so the copy
// works at temirlan.work/<name>/ and at temirlanzzz.github.io/<name>/ alike.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const portfolio = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(name || '')) throw new Error('Pass the demo name, e.g. atrium');
const source = resolve(process.argv[3] || join(portfolio, '..', name));
const git = (...a) => execFileSync('git', a, { cwd: source, encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
if (git('status', '--porcelain', '--', 'src', 'index.html', 'package.json')) throw new Error('Commit source changes before syncing.');
const dist = join(source, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('Run npm run build in the source repo first.');

const target = join(portfolio, name);
// Only this demo's own directory is replaced; nothing else in the portfolio is touched.
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(dist, target, { recursive: true });
writeFileSync(join(target, 'SOURCE.md'), `# ${name} static demo\n\nSource: https://github.com/temirlanzzz/${name}\n\nSource commit: ${commit}\n\nBuilt with Node.js ${process.version}: npm ci, then npm run build (Vite, relative base).\n\nReproduce from the portfolio root: node tools/sync-three-demo.mjs ${name} ../${name}\n\nEverything is procedural; no third-party textures, models or fonts are bundled.\n`);

// Card media: a 1600x1000 still and a short H.264 reel rendered by the source repo's scripts/capture.mjs.
const webp = join(source, 'out', 'preview.webp'), still = join(source, 'out', 'preview.png'), reel = join(source, 'out', `${name}-demo.mp4`);
if (existsSync(webp)) cpSync(webp, join(portfolio, 'img', `${name}-demo.webp`));
else if (existsSync(still)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', still, '-vf', 'scale=1600:-2', '-quality', '82', join(portfolio, 'img', `${name}-demo.webp`)]);
if (existsSync(reel)) { mkdirSync(join(portfolio, 'assets', name), { recursive: true }); cpSync(reel, join(portfolio, 'assets', name, `${name}-demo.mp4`)); }
console.log(`Synced ${name} from ${commit} to ${target}`);
