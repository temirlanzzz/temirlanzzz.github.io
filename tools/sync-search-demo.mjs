// Rebuild the browser-local Marginalia demo from the sibling source repository.
// Usage: node tools/sync-search-demo.mjs [path/to/search-engine]
// Requires Node 24+, npm, git, and the committed frontend package-lock.json.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const portfolio = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] || join(portfolio, '../search-engine'));
const frontend = join(source, 'frontend');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim();
// SOURCE_COMMIT may identify a verified equivalent remote commit when publication
// preserves the source tree but rewrites commit metadata.
const sourceCommit = process.env.SOURCE_COMMIT || commit;
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('SOURCE_COMMIT must be a full Git commit ID.');
const dirty = execFileSync('git', ['status', '--porcelain', '--', 'frontend'], { cwd: source, encoding: 'utf8' }).trim();
if (dirty) throw new Error('Commit frontend changes before recording a reproducible deployment.');
execFileSync('npm', ['ci'], { cwd: frontend, stdio: 'inherit' });
execFileSync('npm', ['test'], { cwd: frontend, stdio: 'inherit' });
execFileSync('npm', ['run', 'build'], { cwd: frontend, stdio: 'inherit', env: { ...process.env, GITHUB_PAGES: 'true' } });
const dist = join(frontend, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('No production index generated.');
if (!readFileSync(join(dist, 'index.html'), 'utf8').includes('/search-engine/assets/')) throw new Error('Production base must be /search-engine/.');
const target = join(portfolio, 'search-engine');
mkdirSync(target, { recursive: true });
// Copy only into this new demo directory. Existing portfolio files are never deleted.
cpSync(dist, target, { recursive: true });
writeFileSync(join(target, 'SOURCE.md'), `# Marginalia static demo\n\nSource: https://github.com/temirlanzzz/search-engine/tree/${sourceCommit}\n\nSource commit: ${sourceCommit}\n\nLocal build commit: ${commit}\n\nBuilt from frontend/ with Node.js ${process.version}, npm ci, npm test, and GITHUB_PAGES=true npm run build.\n\nReproduce from the portfolio root: node tools/sync-search-demo.mjs ../search-engine\n\nThis is the browser-local frontend only. No crawler, server, credentials, or user data is bundled.\n`);
console.log(`Synced Marginalia from ${commit} to ${target}`);
