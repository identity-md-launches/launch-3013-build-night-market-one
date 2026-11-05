import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

/** A bounded test preview; production consists only of the files in dist/. */
export async function previewServer(directory = 'dist') {
  const root = resolve(directory);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/preview/')) { response.writeHead(404).end(); return; }
      const relative = decodeURIComponent(url.pathname.slice('/preview/'.length));
      const file = resolve(root, relative || 'index.html');
      if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      const data = await readFile(file);
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { url: `http://127.0.0.1:${server.address().port}/preview/`, close: () => new Promise(done => server.close(done)) };
}
