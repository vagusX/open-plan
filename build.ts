const result = await Bun.build({
  entrypoints: ['src/main.tsx'],
  outdir: 'public/dist',
  target: 'browser',
  minify: true,
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log('Frontend built to public/dist/');

// Build CLI
const cliResult = await Bun.build({
  entrypoints: ['src/cli.ts'],
  outdir: 'dist',
  target: 'bun',
  minify: true,
  external: ['open'],
  banner: '#!/usr/bin/env bun',
});

if (!cliResult.success) {
  console.error('CLI build failed:');
  for (const log of cliResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

// npm preserves the executable bit from the tarball; set it so `open-plan`
// works directly when consumers install globally.
import { chmodSync } from 'fs';
chmodSync('dist/cli.js', 0o755);

console.log('CLI built to dist/cli.js');
