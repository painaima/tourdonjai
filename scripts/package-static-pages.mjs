import { copyFile, mkdir, readFile } from 'node:fs/promises';

// Package only page shells. Catalog, inquiries and Access credentials are never rendered here.
const pages = [
  ['index.html', 'home.html'],
  ['closed-tours.html', 'closed-tours.html'],
  ['admin.html', 'admin.html'],
  ['services/_shell.html', 'service.html'],
];
const source = new URL('../dist/server/prerendered-routes/', import.meta.url);
const destination = new URL('../dist/client/__pages/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const [from, to] of pages) {
  const html = await readFile(new URL(from, source), 'utf8');
  if (!html.includes('</html>') || !html.includes('<script')) {
    throw new Error(`Missing complete, hydratable static page: ${from}`);
  }
  await copyFile(new URL(from, source), new URL(to, destination));
}
console.log(`Packaged ${pages.length} static page shells for low-CPU Worker delivery.`);
