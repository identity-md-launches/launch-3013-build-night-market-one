import assert from 'node:assert/strict';
import { readdir, lstat, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const omitted = new Set(['.git', '.github', '.imd', '.cache', '.yarn', '.npm', '.vite', '.vite-temp', 'node_modules']);
const files = [];
async function walk(directory = '.') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (omitted.has(entry.name) || entry.name === '.env' || entry.name.startsWith('.env.') || entry.name.startsWith('.pnp.') || entry.name.endsWith('.tsbuildinfo')) continue;
    const path = join(directory, entry.name);
    const name = relative('.', path).replaceAll('\\', '/');
    if (name === 'test/scratch') continue;
    const info = await lstat(path);
    assert.ok(!info.isSymbolicLink(), `Unexpected submission symlink: ${name}`);
    if (info.isDirectory()) await walk(path);
    else {
      assert.ok(!/\.(tgz|zip|tar|gz)$/.test(name), `Unexpected packaging archive: ${name}`);
      files.push({ path: name, bytes: info.size });
    }
  }
}
await walk();
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
const distBytes = files.filter(file => file.path.startsWith('dist/')).reduce((sum, file) => sum + file.bytes, 0);
const html = await readFile('dist/index.html', 'utf8');
assert.match(html, /\.\/assets\//);
assert.ok(!html.includes('src="/assets/'), 'Export contains a root-absolute asset URL.');
assert.ok(files.some(file => file.path === 'dist/share.png'));
assert.ok(files.some(file => file.path === 'yarn.lock'));
assert.ok(bytes <= 8_388_608, `Submission exceeds 8 MiB: ${bytes} bytes.`);
console.log(JSON.stringify({ files: files.length, totalBytes: bytes, distBytes, budgetBytes: 8_388_608, remainingBytes: 8_388_608 - bytes, relativeAssets: true, forbiddenPackagingArtifacts: 0 }, null, 2));
