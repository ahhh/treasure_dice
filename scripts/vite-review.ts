/**
 * Dev-server-only plugins for the standalone text editor (text-editor/vite.config.ts).
 *
 *   GET /__review  → the review ledger ({} if none yet)
 *   PUT /__review  → write it
 *
 * The ledger maps language → entry key → a hash of that entry's text when it was
 * marked reviewed, so an entry whose text changes afterwards shows as changed.
 */
import type { Plugin } from 'vite';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

export function reviewApi(file: string): Plugin {
  return {
    name: 'td-review-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__review', (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method === 'GET') return send(200, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
        if (req.method !== 'PUT') return send(405, { error: 'GET or PUT' });
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data || typeof data !== 'object' || Array.isArray(data)) return send(400, { error: 'Ledger must be a JSON object' });
            writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2) + '\n');
            renameSync(`${file}.tmp`, file);
            send(200, { ok: true });
          } catch (e) { send(400, { error: String(e) }); }
        });
      });
    },
  };
}

/** Serve `page` at / so this server opens the editor, never the game. */
export function homePage(page: string): Plugin {
  return {
    name: 'td-home-page',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? '/').split('?')[0];
        if (path === '/' || path === '/index.html') req.url = `/${page}${(req.url ?? '').slice(path.length)}`;
        next();
      });
    },
  };
}
