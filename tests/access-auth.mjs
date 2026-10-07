import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { accessAllowed } from '../lib/access.ts';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const settings = { ADMIN_EMAIL: 'tourdonjai@gmail.com', ACCESS_TEAM_DOMAIN: 'https://tourdonjai.cloudflareaccess.com', ACCESS_AUD: 'cms-audience' };
async function token(changes = {}) {
  return new SignJWT({ email: settings.ADMIN_EMAIL, ...changes })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer(settings.ACCESS_TEAM_DOMAIN)
    .setAudience('cms-audience').setSubject('admin').setIssuedAt().setExpirationTime('1h').sign(privateKey);
}
const request = jwt => new Request('https://tourdonjai.example/api/catalog', { headers: { 'cf-access-jwt-assertion': jwt } });
const good = await token();
assert.equal(await accessAllowed(request(good), settings, publicKey), true);
assert.equal(await accessAllowed(new Request('https://tourdonjai.example/api/catalog', { headers: { cookie: `other=1; CF_Authorization=${good}` } }), settings, publicKey), true);
assert.equal(await accessAllowed(request(await token({ email: 'other@example.com' })), settings, publicKey), false);
assert.equal(await accessAllowed(request(good), { ...settings, ACCESS_AUD: 'wrong-audience' }, publicKey), false);
assert.equal(await accessAllowed(request(good), { ...settings, ACCESS_TEAM_DOMAIN: 'https://other.cloudflareaccess.com' }, publicKey), false);
assert.equal(await accessAllowed(request(good), { ...settings, ACCESS_AUD: undefined }, publicKey), false);
assert.equal(await accessAllowed(request(good.slice(0, -10) + 'aaaaaaaaaa'), settings, publicKey), false);
assert.equal(await accessAllowed(new Request('https://tourdonjai.example/api/catalog', { headers: { 'oai-authenticated-user-email': settings.ADMIN_EMAIL } }), settings, publicKey), false);
const expired = await new SignJWT({ email: settings.ADMIN_EMAIL }).setProtectedHeader({ alg: 'RS256' })
  .setIssuer(settings.ACCESS_TEAM_DOMAIN).setAudience('cms-audience').setSubject('admin').setIssuedAt(1).setExpirationTime(2).sign(privateKey);
assert.equal(await accessAllowed(request(expired), settings, publicKey), false);
console.log('Access authentication: 9 checks passed');
