import { parseArgs } from 'util';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { startServer } from './server';
import openBrowser from 'open';

async function main() {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      port: { type: 'string', short: 'p' },
      'no-open': { type: 'boolean', default: false },
    },
  });

  const filePath = positionals[0];
  if (!filePath) {
    console.error('Usage: open-plan <md-file> [-p <port>] [--no-open]');
    process.exit(1);
  }

  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    console.error(`Error: file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const md = await Bun.file(resolvedPath).text();

  const port = values.port ? parseInt(values.port, 10) : 0; // 0 = random
  const server = startServer({ md, filePath: resolvedPath, port });

  const actualPort = server.port;
  const url = `http://localhost:${actualPort}`;
  console.log(`open-plan serving at ${url}`);
  console.log('Press Ctrl+C to stop');

  if (!values['no-open']) {
    try {
      await openBrowser(url);
    } catch {
      console.log(`Please open ${url} in your browser`);
    }
  }
}

main();
