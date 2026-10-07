import './sites-env.mjs';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// This checkout always uses its own account and credentials.
const target = JSON.parse(readFileSync(new URL('../.deployment/cloudflare.json', import.meta.url), 'utf8'));
const credentials = parseEnv(readFileSync(new URL('../.deployment/.env', import.meta.url), 'utf8'));
if (!/^[a-f0-9]{32}$/.test(target.account_id)) {
  console.error('Invalid project Cloudflare account ID.');
  process.exit(1);
}
if (!credentials.CLOUDFLARE_API_TOKEN?.trim()) {
  console.error('Add CLOUDFLARE_API_TOKEN to .deployment/.env for the tourdonjai Cloudflare account. No other account was used.');
  process.exit(1);
}
const args = process.argv.slice(2);
if (!args.length) args.push('whoami');
const env = { ...process.env };
for (const key of ['CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL', 'CF_API_KEY', 'CF_EMAIL', 'CF_API_TOKEN', 'CF_ACCOUNT_ID']) delete env[key];
env.CLOUDFLARE_ACCOUNT_ID = target.account_id;
env.CLOUDFLARE_API_TOKEN = credentials.CLOUDFLARE_API_TOKEN.trim();

// Do not deploy the local preview's placeholder database/configuration.
if (args[0] === 'publish' || args[0] === 'versions') {
  console.error('Use npm run cf -- deploy with the project production configuration.');
  process.exit(1);
}
if (args[0] === 'deploy') {
  const productionUrl = new URL('../.deployment/wrangler.production.json', import.meta.url);
  const production = JSON.parse(readFileSync(productionUrl, 'utf8'));
  if (args.length !== 1 || production.account_id !== target.account_id ||
      production.d1_databases?.[0]?.database_id !== target.database_id ||
      production.r2_buckets?.[0]?.bucket_name !== target.bucket_name ||
      production.vars?.ADMIN_EMAIL !== target.admin_email ||
      !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(production.vars?.ACCESS_TEAM_DOMAIN || '') ||
      !/^[a-f0-9]{64}$/.test(production.vars?.ACCESS_AUD || '')) {
    console.error('Use npm run cf -- deploy after configuring this project database, bucket and Access login.');
    process.exit(1);
  }
  args.push('--config', fileURLToPath(productionUrl));
}
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)), ...args,
], { stdio: 'inherit', env });
if (result.error) {
  console.error('Unable to start Wrangler.');
  process.exit(1);
}
process.exit(result.status ?? 1);
