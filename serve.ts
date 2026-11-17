// A tiny static server for local play-testing: serves game/ on localhost.
// Standard library only. Usage: node serve.ts [port]  (default 8080)

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = join(dirname(fileURLToPath(import.meta.url)), 'game');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080);

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = normalize(join(GAME_DIR, pathname));
    if (!filePath.startsWith(GAME_DIR)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }
    const stat = statSync(filePath);
    if (!stat.isFile()) {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream' });
    response.end(readFileSync(filePath));
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Comet Courier at http://localhost:${PORT}`);
});
