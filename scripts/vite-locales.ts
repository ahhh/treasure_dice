/**
 * Dev-server-only API that lets the in-browser text editor (dev/dialogue.html)
 * read and write src/locales/<lang>/<namespace>.json on disk.
 *
 *   GET  /__locales                 → { langs: { en: ['dialogue'], fr: [...] } }
 *   GET  /__locales/<lang>/<ns>     → the catalog ({} if the file doesn't exist yet)
 *   PUT  /__locales/<lang>/<ns>     → write the JSON body (pretty-printed, key order kept)
 *
 * `apply: 'serve'` keeps it out of production builds entirely.
 */
import type { Plugin } from 'vite';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const NS = /^[a-z][a-z0-9-]*$/;

export function localesApi(root = 'src/locales'): Plugin {
  const dir = resolve(root);
  return {
    name: 'td-locales-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__locales', (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        const parts = (req.url ?? '/').split('?')[0].split('/').filter(Boolean);
        try {
          if (parts.length === 0 && req.method === 'GET') {
            const langs: Record<string, string[]> = {};
            for (const l of existsSync(dir) ? readdirSync(dir) : []) {
              if (LANG.test(l)) langs[l] = readdirSync(join(dir, l)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
            }
            return send(200, { langs });
          }
          const [lang, ns] = parts;
          if (parts.length !== 2 || !LANG.test(lang) || !NS.test(ns)) return send(400, { error: 'Expected /__locales/<lang>/<namespace>' });
          const file = join(dir, lang, `${ns}.json`);
          if (req.method === 'GET') return send(200, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
          if (req.method === 'PUT') {
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                if (!data || typeof data !== 'object' || Array.isArray(data)) return send(400, { error: 'Catalog must be a JSON object' });
                mkdirSync(join(dir, lang), { recursive: true });
                // Write-then-rename so a crash never leaves a half-written catalog.
                const tmp = `${file}.tmp`;
                writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
                renameSync(tmp, file);
                send(200, { ok: true, file: `${root}/${lang}/${ns}.json` });
              } catch (e) { send(400, { error: String(e) }); }
            });
            return;
          }
          send(405, { error: 'GET or PUT' });
        } catch (e) { send(500, { error: String(e) }); }
      });
    },
  };
}
