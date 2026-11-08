import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(packageRoot, 'dist');
const required = [
  'index.js',
  'index.d.ts',
  'react.js',
  'react.d.ts',
  'syntax.js',
  'syntax.d.ts',
  'build.js',
  'types.d.ts',
];

for (const file of required) await access(path.join(dist, file));

const syntax = await readFile(path.join(dist, 'syntax.js'), 'utf8');
if (/@visactor\/vchart|from ['"]react|react-dom/.test(syntax)) {
  throw new Error('The syntax entry must not load VChart or React.');
}

const main = await readFile(path.join(dist, 'index.js'), 'utf8');
if (/dist\/react|from ['"]\.\/react/.test(main)) {
  throw new Error('The main entry must not load the React component.');
}

const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
for (const entry of ['./react', './syntax']) {
  if (!packageJson.exports?.[entry]) throw new Error(`Missing package export ${entry}`);
}
if (packageJson.peerDependencies?.['@visactor/vchart'] !== '^2.2.1') {
  throw new Error('Unexpected VChart peer dependency range.');
}

const syntaxModule = await import(path.join(dist, 'syntax.js'));
for (const name of ['parse', 'isVisSyntax', 'readConfig']) {
  if (typeof syntaxModule[name] !== 'function') throw new Error(`Missing syntax export ${name}`);
}

console.log('package entries are isolated and complete');
