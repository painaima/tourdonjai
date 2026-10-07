import { createRemoteJWKSet, jwtVerify } from 'jose';

type AccessSettings = {
  ADMIN_EMAIL?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
};
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function accessAllowed(
  request: Request,
  settings: AccessSettings,
  testKeys?: Parameters<typeof jwtVerify>[1],
) {
  if (!settings.ADMIN_EMAIL || !settings.ACCESS_AUD || !settings.ACCESS_TEAM_DOMAIN) return false;
  const issuer = settings.ACCESS_TEAM_DOMAIN.replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)) return false;
  // The CMS path is protected by Access. Shared public APIs can use its signed cookie.
  const token = request.headers.get('cf-access-jwt-assertion') ||
    request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('CF_Authorization='))?.slice('CF_Authorization='.length);
  if (!token) return false;
  try {
    let keys = testKeys || keySets.get(issuer);
    if (!keys) {
      const remoteKeys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
      keySets.set(issuer, remoteKeys);
      keys = remoteKeys;
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer, audience: settings.ACCESS_AUD, algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'email', 'sub'],
    });
    return typeof payload.email === 'string' &&
      payload.email.toLowerCase() === settings.ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}
