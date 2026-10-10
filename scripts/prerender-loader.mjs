// Node renders data-free page shells at build time; Cloudflare supplies real bindings at runtime.
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:workers') {
    return {url: 'data:text/javascript,export const env = {};', shortCircuit: true};
  }
  return nextResolve(specifier, context);
}
