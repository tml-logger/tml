import { mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Yarn replaces workspace: ranges with registry-compatible versions when packing.
const packages = ['core', 'browser', 'node'];
const manifests = packages.map((name) => JSON.parse(readFileSync(`packages/${name}/package.json`, 'utf8')));
const version = manifests[0].version;
if (!/^\d+\.\d+\.\d+$/.test(version) || manifests.some((manifest) => manifest.version !== version)) {
  throw new Error('Release packages must share a stable x.y.z version.');
}
mkdirSync('.release', { recursive: true });
for (const name of packages) {
  execFileSync('yarn', ['workspace', `@tmlog/${name}`, 'pack', '--out', resolve(`.release/${name}.tgz`)], { stdio: 'inherit' });
}
