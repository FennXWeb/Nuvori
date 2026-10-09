// Local publishing guard. See AGENTS.md for the user's explicit release policy.
const fs = require('node:fs');
const destination = process.argv[3] || '';
const allowed = /^(https:\/\/github\.com\/|git@github\.com:)FennXWeb\/Nuvori-Testing(?:\.git)?\/?$/i.test(destination);
const refs = fs.readFileSync(0, 'utf8').trim().split('\n').filter(Boolean);
if (!allowed || refs.some(line => {
  const [localRef, sha, remoteRef] = line.trim().split(/\s+/);
  return localRef === '(delete)' || /^0+$/.test(sha) || remoteRef !== 'refs/heads/codex/testing';
})) {
  console.error('Push blocked: Nuvori changes may only go to private Nuvori-Testing / codex/testing. Publishing to main or another destination requires an explicit user instruction. See AGENTS.md.');
  process.exit(1);
}
