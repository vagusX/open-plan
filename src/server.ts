import type { Server } from 'bun';

interface ServerOptions {
  md: string;
  filePath: string;
  port: number;
}

export function startServer({ md, filePath, port }: ServerOptions): Server {
  const initData = JSON.stringify({ md, filePath });

  return Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      if (pathname === '/') {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>open-plan</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="__INIT__">window.__INIT__ = ${initData};</script>
  <script src="/dist/main.js"></script>
</body>
</html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html' } });
      }

      const filePath = `public${pathname}`;
      const file = Bun.file(filePath);
      return new Response(file);
    },
  });
}
