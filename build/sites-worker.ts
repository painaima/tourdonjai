import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { accessAllowed } from "../lib/access";
import * as catalog from "../app/api/catalog/route";
import * as settings from "../app/api/settings/route";
import * as inquiries from "../app/api/requests/route";
import * as uploads from "../app/api/media/route";
import * as media from "../app/api/media/[key]/route";

type RouteMethods = Partial<Record<string, (request: Request) => Promise<Response>>>;
const apiRoutes: Record<string, RouteMethods> = {
  '/api/catalog': catalog,
  '/api/settings': settings,
  '/api/requests': inquiries,
  '/api/media': uploads,
};

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url);
    // Shell files are reachable only through the asset binding after route authorization.
    if (url.pathname.startsWith('/__pages/')) return new Response('Not found', {status: 404});
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (!local && (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) &&
        !(await accessAllowed(request, env))) {
      return new Response('กรุณาเข้าสู่ระบบผ่าน Cloudflare Access', {
        status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    // APIs use their existing handlers without the React/RSC routing pipeline.
    const path = url.pathname.replace(/\/$/, '') || '/';
    const route = apiRoutes[path];
    if (route) {
      const method = request.method === 'HEAD' ? 'GET' : request.method;
      const handle = route[method];
      if (!handle) return new Response('Method not allowed', {
        status: 405, headers: { Allow: Object.keys(route).join(', ') },
      });
      const response = await handle(request);
      return request.method === 'HEAD' ? new Response(null, response) : response;
    }
    const mediaMatch = /^\/api\/media\/([^/]+)$/.exec(path);
    if (mediaMatch && (request.method === 'GET' || request.method === 'HEAD')) {
      const response = await media.GET(request, {params: Promise.resolve({key: mediaMatch[1]})});
      return request.method === 'HEAD' ? new Response(null, response) : response;
    }
    // Production page shells are built once; live data still comes from protected APIs.
    // Access verification above remains mandatory before delivering the CMS shell.
    if (!import.meta.env.DEV && env.ASSETS &&
        (request.method === 'GET' || request.method === 'HEAD') &&
        !request.headers.has('rsc') && !url.searchParams.has('_rsc')) {
      const page = path === '/' ? 'home' : path === '/admin' ? 'admin'
        : path === '/closed-tours' ? 'closed-tours'
        : /^\/services\/[^/]+$/.test(path) ? 'service' : undefined;
      if (page) {
        const assetUrl = new URL(`/__pages/${page}.html`, url);
        const response = await env.ASSETS.fetch(new Request(assetUrl, {method: request.method}));
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'no-cache');
        return new Response(response.body, {status: response.status, headers});
      }
      if (path === '/favicon.ico') return new Response(null, {status: 404});
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};
