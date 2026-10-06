import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const notices = ['Nuvori bundled third-party notices\n\nElectron and Chromium notices are also included beside Nuvori.exe.'];
for (const [directory, entry] of Object.entries(lock.packages)) {
  if (!directory || entry.dev) continue;
  const absolute = join(root, directory);
  const files = readdirSync(absolute).filter(file => /^(license|copying|ofl)(\.|$)/i.test(file));
  if (!files.length) throw new Error(`Missing license notice: ${directory}`);
  notices.push(`\n\n${directory.replace(/^node_modules\//, '')} ${entry.version}\n${'='.repeat(72)}\n` + files.map(file => readFileSync(join(absolute, file), 'utf8')).join('\n'));
}
mkdirSync(join(root, 'public/licenses'), { recursive: true });
writeFileSync(join(root, 'public/licenses/THIRD-PARTY.txt'), notices.join('\n') + '\n');
