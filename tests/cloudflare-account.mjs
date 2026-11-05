import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'tourdonjai-cf-')));
try {
  for (const dir of ['scripts', '.deployment', 'node_modules/wrangler/bin']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  for (const file of ['scripts/cloudflare-account.mjs', 'scripts/sites-env.mjs', '.deployment/cloudflare.json', '.deployment/wrangler.production.json']) {
    copyFileSync(file, path.join(root, file));
  }
  writeFileSync(path.join(root, 'node_modules/wrangler/bin/wrangler.js'), `
    require('node:fs').writeFileSync('invocation.json', JSON.stringify({
      args: process.argv.slice(2), token: process.env.CLOUDFLARE_API_TOKEN,
      account: process.env.CLOUDFLARE_ACCOUNT_ID, legacy: process.env.CF_API_TOKEN
    }));
  `);
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(CLOUDFLARE_|CF_|WRANGLER_|MINIFLARE_|SITES_RUNTIME_ROOT)/.test(key)) delete env[key];
  const run = (extra = {}, args = []) => spawnSync(process.execPath, [path.join(root, 'scripts/cloudflare-account.mjs'), ...args], {
    cwd: root, env: { ...env, ...extra }, encoding: 'utf8',
  });
  const invocation = () => JSON.parse(readFileSync(path.join(root, 'invocation.json'), 'utf8'));
  let result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(result.stderr, /ENOENT/);
  result = run({ CLOUDFLARE_API_TOKEN: ' environment-test ', CLOUDFLARE_ACCOUNT_ID: 'wrong', CF_API_TOKEN: 'legacy' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(invocation(), { args: ['whoami'], token: 'environment-test', account: 'ff88c9a65e3a7b03c6f085ff6e4f032b' });
  writeFileSync(path.join(root, '.deployment/.env'), 'CLOUDFLARE_API_TOKEN=file-test\n');
  assert.equal(run().status, 0);
  assert.equal(invocation().token, 'file-test');
  assert.equal(run({ CLOUDFLARE_API_TOKEN: 'override-test' }).status, 0);
  assert.equal(invocation().token, 'override-test');
  assert.equal(run({}, ['deploy']).status, 0);
  assert.deepEqual(invocation().args, ['deploy', '--config', path.join(root, '.deployment/wrangler.production.json')]);
  for (const args of [['publish'], ['versions', 'upload'], ['deploy', '--config', 'other.json']]) {
    assert.equal(run({}, args).status, 1);
  }
  console.log('Cloudflare credentials and account guard checks passed.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
