import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const calls = [];
globalThis.__workerRoutingCalls = calls;
const routeModule = moduleUrl(`
  export async function GET(request, context) {
    const key = context ? (await context.params).key : null;
    globalThis.__workerRoutingCalls.push(['api', new URL(request.url).pathname, key]);
    return Response.json({key});
  }
  export const POST = GET, PATCH = GET, DELETE = GET;
`);
const mocks = {
  'vinext/server/fetch-handler': moduleUrl(`export default {fetch() {
    globalThis.__workerRoutingCalls.push(['framework']);
    return new Response('framework');
  }};`),
  '../lib/connector-context': moduleUrl('export const runWithConnectorBinding = (_, fn) => fn();'),
  '../lib/access': moduleUrl(`export async function accessAllowed(request) {
    globalThis.__workerRoutingCalls.push(['auth']);
    return request.headers.get('x-test-admin') === 'yes';
  }`),
};
let code = ts.transpileModule(readFileSync('build/sites-worker.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText.replaceAll('import.meta.env.DEV', 'false');
code = code.replace(/from (['"])([^'"]+)\1/g, (_, quote, specifier) =>
  'from ' + JSON.stringify(mocks[specifier] || routeModule));
const {default: worker} = await import(moduleUrl(code));
const env = {ASSETS: {async fetch(request) {
  calls.push(['asset', new URL(request.url).pathname]);
  return new Response('<html>static shell</html>', {headers: {'Content-Type': 'text/html'}});
}}};
const request = (path, options) => new Request('https://tourdonjai.example' + path, options);
const run = (path, options) => worker.fetch(request(path, options), env, {});
assert.equal((await run('/__pages/admin.html')).status, 404);
assert.equal((await run('/__pages/home.html')).status, 404);
assert.deepEqual(calls, [], 'internal shells cannot bypass route authorization');

for (const [path, asset] of [
  ['/', 'home'], ['/closed-tours', 'closed-tours'],
  ['/services/china-new-program?preview=1', 'service'],
]) {
  calls.length = 0;
  const response = await run(path);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-cache');
  assert.deepEqual(calls, [['asset', `/__pages/${asset}.html`]]);
}
calls.length = 0;
assert.equal((await run('/admin')).status, 403);
assert.deepEqual(calls, [['auth']], 'unauthenticated CMS must never reach static assets');
calls.length = 0;
assert.equal((await run('/admin/', {headers: {'x-test-admin': 'yes'}})).status, 200);
assert.deepEqual(calls, [['auth'], ['asset', '/__pages/admin.html']]);
calls.length = 0;
assert.equal((await run('/admin/settings')).status, 403);
assert.deepEqual(calls, [['auth']]);
calls.length = 0;
assert.equal((await run('/api/catalog?scope=public')).status, 200);
assert.deepEqual(calls, [['api', '/api/catalog', null]], 'API bypasses the rendering pipeline');
assert.equal((await run('/api/catalog', {method: 'PUT'})).status, 405);
assert.equal(await (await run('/api/catalog', {method: 'HEAD'})).text(), '');
assert.deepEqual(await (await run('/api/media/123.jpg')).json(), {key: '123.jpg'});
calls.length = 0;
assert.equal(await (await run('/', {headers: {rsc: '1'}})).text(), 'framework');
assert.deepEqual(calls, [['framework']], 'RSC requests must not receive HTML');
delete globalThis.__workerRoutingCalls;
console.log('Static page delivery, CMS auth guard, direct APIs, HEAD/405 and RSC routing passed');
