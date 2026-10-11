// Local publishing guard. See AGENTS.md for the user's explicit release policy.
const fs = require('node:fs');
const destination = process.argv[3] || '';
const allowed = /^(https:\/\/github\.com\/|git@github\.com:)FennXWeb\/Nuvori-Testing(?:\.git)?\/?$/i.test(destination);
const refs = fs.readFileSync(0, 'utf8').trim().split('\n').filter(Boolean);
const mainDestination = /^(https:\/\/github\.com\/|git@github\.com:)FennXWeb\/Nuvori(?:\.git)?\/?$/i.test(destination);
const mainSha = process.env.NUVORI_MAIN_SHA || '', mainBase = process.env.NUVORI_MAIN_BASE || '';
if (mainDestination && process.env.NUVORI_MAIN_PUBLISH === 'owner-confirmed' && /^[a-f0-9]{40}$/.test(mainSha) && /^[a-f0-9]{40}$/.test(mainBase) && !/^0+$/.test(mainBase) && refs.length === 1) {
  const [localRef, sha, remoteRef, remoteSha] = refs[0].trim().split(/\s+/);
  if (localRef !== '(delete)' && !/^0+$/.test(sha) && sha === mainSha && remoteRef === 'refs/heads/main' && remoteSha === mainBase) process.exit(0);
}
if (!allowed || refs.some(line => {
  const [localRef, sha, remoteRef] = line.trim().split(/\s+/);
  return localRef === '(delete)' || /^0+$/.test(sha) || remoteRef !== 'refs/heads/codex/testing';
})) {
  console.error('Push blocked: Nuvori changes may only go to private Nuvori-Testing / codex/testing. Publishing to main or another destination requires an explicit user instruction. See AGENTS.md.');
  process.exit(1);
}
