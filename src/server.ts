import type { Server } from 'bun';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { groupByWorkspace, resolveScanDirs, scanPlans, suggestWorkspaces } from './utils/scan';
import { applyFrontmatterPatch } from './utils/frontmatter';

export interface ServerOptions {
  port: number;
  cwd?: string;
  planDirs?: string[];
  /** Absolute paths that should be accessible even if they live outside planDirs. */
  extraAllowedFiles?: string[];
}

export function startServer(opts: ServerOptions): Server {
  const planDirs = opts.planDirs ?? resolveScanDirs(opts.cwd);
  const extraAllowedFiles = (opts.extraAllowedFiles ?? []).map((p) => resolve(p));
  const isAllowed = (absPath: string) =>
    planDirs.some((d) => absPath.startsWith(resolve(d) + '/')) ||
    extraAllowedFiles.includes(absPath);

  return Bun.serve({
    port: opts.port,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      if (pathname === '/api/ping') {
        return Response.json({
          app: 'open-plan',
          ok: true,
          pid: process.pid,
          planDirs,
          extraAllowedFiles,
        });
      }

      if (pathname === '/api/plans') {
        const plans = scanPlans(planDirs);
        const groups = groupByWorkspace(plans);
        return Response.json({ groups, total: plans.length, scannedDirs: planDirs });
      }

      if (pathname === '/api/plan/suggest' && url.searchParams.has('path')) {
        const abs = resolve(url.searchParams.get('path')!);
        if (!abs.endsWith('.md') || !existsSync(abs) || !isAllowed(abs)) {
          return Response.json({ suggestions: [] });
        }
        const content = readFileSync(abs, 'utf8');
        return Response.json({ suggestions: suggestWorkspaces(content) });
      }

      if (pathname === '/api/plan/frontmatter' && req.method === 'POST') {
        let body: { path?: string; patch?: Record<string, unknown> };
        try {
          body = await req.json();
        } catch {
          return Response.json({ error: 'invalid json' }, { status: 400 });
        }
        const { path, patch } = body;
        if (!path || !patch || typeof patch !== 'object') {
          return Response.json({ error: 'path and patch required' }, { status: 400 });
        }
        const abs = resolve(path);
        if (!abs.endsWith('.md') || !existsSync(abs)) {
          return Response.json({ error: 'not found' }, { status: 404 });
        }
        if (!isAllowed(abs)) {
          return Response.json({ error: 'forbidden' }, { status: 403 });
        }
        const content = readFileSync(abs, 'utf8');
        const next = applyFrontmatterPatch(content, patch as any);
        writeFileSync(abs, next, 'utf8');
        return Response.json({ ok: true });
      }

      if (pathname === '/plan' && url.searchParams.has('path')) {
        const requested = resolve(url.searchParams.get('path')!);
        if (!requested.endsWith('.md') || !existsSync(requested)) {
          return new Response('not found', { status: 404 });
        }
        if (!isAllowed(requested)) {
          return new Response('forbidden', { status: 403 });
        }
        const md = readFileSync(requested, 'utf8');
        return htmlResponse(renderEditHtml(md, requested));
      }

      if (pathname === '/') {
        return htmlResponse(renderIndexHtml());
      }

      const filePath = `public${pathname}`;
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return new Response('not found', { status: 404 });
      }
      return new Response(file);
    },
  });
}

const HEAD = `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>open-plan</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
            mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
          },
        },
      },
    };
  </script>
  <style>
    html, body { margin: 0; background: #ffffff; color: #0f172a; font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-feature-settings: 'cv11', 'ss01'; }
    .ProseMirror:focus { outline: none; }
    .ProseMirror ::selection { background: rgba(99, 102, 241, 0.18); }
    .ProseMirror p.is-editor-empty:first-child::before { color: #94a3b8; content: attr(data-placeholder); float: left; pointer-events: none; height: 0; }
    *::-webkit-scrollbar { width: 10px; height: 10px; }
    *::-webkit-scrollbar-thumb { background: transparent; border-radius: 9999px; }
    *:hover::-webkit-scrollbar-thumb { background: #e2e8f0; }
    *::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  </style>`;

function renderEditHtml(md: string, filePath: string): string {
  const init = JSON.stringify({ mode: 'edit', md, filePath });
  return `<!DOCTYPE html><html lang="en"><head>${HEAD}</head><body>
  <div id="root"></div>
  <script>window.__errors=[];window.onerror=function(m,s,l,c,e){window.__errors.push({msg:m,src:s,line:l,col:c,err:e?.stack});};</script>
  <script id="__INIT__">window.__INIT__ = ${init};</script>
  <script src="/dist/main.js"></script>
</body></html>`;
}

function renderIndexHtml(): string {
  const init = JSON.stringify({ mode: 'index' });
  return `<!DOCTYPE html><html lang="en"><head>${HEAD}</head><body>
  <div id="root"></div>
  <script>window.__errors=[];window.onerror=function(m,s,l,c,e){window.__errors.push({msg:m,src:s,line:l,col:c,err:e?.stack});};</script>
  <script id="__INIT__">window.__INIT__ = ${init};</script>
  <script src="/dist/main.js"></script>
</body></html>`;
}

function htmlResponse(html: string): Response {
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
