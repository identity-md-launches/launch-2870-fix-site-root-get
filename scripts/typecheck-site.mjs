import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'public/index.html'), 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('The live panel script was not found.');
const temporary = await mkdtemp('/tmp/squeek-site-check-');
try {
  const file = join(temporary, 'live.js');
  await writeFile(file, script + '\nexport {};\n');
  execFileSync(process.argv[2] ?? 'tsc', [
    '--allowJs', '--checkJs', '--noEmit', '--strict', '--target', 'es2022',
    '--module', 'esnext', '--lib', 'es2022,dom', file,
  ], { stdio: 'inherit' });
  console.log('Site typecheck passed: strict TypeScript checking of the production JavaScript.');
} finally { await rm(temporary, { recursive: true, force: true }); }
