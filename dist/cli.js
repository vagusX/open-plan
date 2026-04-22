// @bun
import{parseArgs as m}from"util";import{resolve as f}from"path";import{existsSync as h}from"fs";function p({md:s,filePath:e,port:r}){let t=JSON.stringify({md:s,filePath:e});return Bun.serve({port:r,fetch(n){let i=new URL(n.url).pathname;if(i==="/"){let c=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>plan-review</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="__INIT__">window.__INIT__ = ${t};</script>
  <script src="/dist/main.js"></script>
</body>
</html>`;return new Response(c,{headers:{"Content-Type":"text/html"}})}let l=`public${i}`,o=Bun.file(l);return new Response(o)}})}import d from"open";async function u(){let{positionals:s,values:e}=m({args:Bun.argv.slice(2),allowPositionals:!0,options:{port:{type:"string",short:"p"},"no-open":{type:"boolean",default:!1}}}),r=s[0];if(!r)console.error("Usage: plan-review <md-file> [-p <port>] [--no-open]"),process.exit(1);let t=f(r);if(!h(t))console.error(`Error: file not found: ${t}`),process.exit(1);let n=await Bun.file(t).text(),a=e.port?parseInt(e.port,10):0,o=`http://localhost:${p({md:n,filePath:t,port:a}).port}`;if(console.log(`plan-review serving at ${o}`),console.log("Press Ctrl+C to stop"),!e["no-open"])try{await d(o)}catch{console.log(`Please open ${o} in your browser`)}}u();
