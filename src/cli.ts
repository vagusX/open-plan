import { parseArgs } from 'util';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { startServer } from './server';
import openBrowser from 'open';
import { resolveScanDirs } from './utils/scan';
import { deleteLock, probeServer, readLock, writeLock } from './utils/lock';
import pkg from '../package.json' with { type: 'json' };

const HELP = `open-plan — local plan index + markdown review CLI

Usage:
  open-plan                     打开索引页（扫 ~/.claude/plans/ + cwd 下的 plans/）
  open-plan <file.md>           直接打开某个 plan 开始 review
  open-plan [options]

Options:
  -p, --port <port>             指定端口（默认 0 = 随机可用端口）
  -i, --index                   强制索引模式（即使传了文件）
      --fresh                   跳过复用已有 server，起全新实例
      --no-open                 不自动打开浏览器
  -h, --help                    显示本帮助
  -v, --version                 显示版本号

Docs: ${pkg.homepage ?? pkg.repository?.url ?? ''}
`;

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: Bun.argv.slice(2),
      allowPositionals: true,
      options: {
        port: { type: 'string', short: 'p' },
        'no-open': { type: 'boolean', default: false },
        index: { type: 'boolean', short: 'i' },
        fresh: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (err) {
    console.error((err as Error).message);
    console.error('\n' + HELP);
    process.exit(2);
  }
  const { positionals, values } = parsed;

  if (values.help) {
    console.log(HELP);
    return;
  }
  if (values.version) {
    console.log(pkg.version);
    return;
  }

  const filePath = positionals[0];
  const wantsIndex = !filePath || values.index;

  let resolvedPath: string | null = null;
  if (filePath && !values.index) {
    resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
      console.error(`Error: file not found: ${resolvedPath}`);
      process.exit(1);
    }
  }

  if (!values.fresh) {
    const reuseUrl = await tryReuse(resolvedPath);
    if (reuseUrl) {
      console.log(`open-plan already running → ${reuseUrl}`);
      if (!values['no-open']) {
        try {
          await openBrowser(reuseUrl);
        } catch {
          console.log(reuseUrl);
        }
      }
      return;
    }
  }

  const port = values.port ? parseInt(values.port, 10) : 0;
  const planDirs = resolveScanDirs(process.cwd());
  const extraAllowedFiles: string[] = [];
  if (resolvedPath && !planDirs.some((d) => resolvedPath!.startsWith(resolve(d) + '/'))) {
    extraAllowedFiles.push(resolvedPath);
  }
  const server = startServer({ port, planDirs, extraAllowedFiles });

  writeLock({ port: server.port!, pid: process.pid, startedAt: Date.now() });
  registerCleanup();

  const baseUrl = `http://localhost:${server.port}`;
  const openUrl = resolvedPath
    ? `${baseUrl}/plan?path=${encodeURIComponent(resolvedPath)}`
    : baseUrl;

  console.log(`open-plan serving at ${baseUrl}${wantsIndex ? ' (index)' : ''}`);
  console.log('Press Ctrl+C to stop');

  if (!values['no-open']) {
    try {
      await openBrowser(openUrl);
    } catch {
      console.log(`Please open ${openUrl} in your browser`);
    }
  }
}

/**
 * If a lock points to a live server that can serve `resolvedPath` (or the index,
 * when no path is given), return the URL to open. Stale locks are cleaned up.
 */
async function tryReuse(resolvedPath: string | null): Promise<string | null> {
  const lock = readLock();
  if (!lock) return null;
  const ping = await probeServer(lock.port);
  if (!ping) {
    deleteLock();
    return null;
  }
  const baseUrl = `http://localhost:${lock.port}`;
  if (!resolvedPath) return baseUrl;
  const canServe =
    ping.planDirs.some((d) => resolvedPath.startsWith(resolve(d) + '/')) ||
    ping.extraAllowedFiles.includes(resolvedPath);
  if (!canServe) return null;
  return `${baseUrl}/plan?path=${encodeURIComponent(resolvedPath)}`;
}

function registerCleanup(): void {
  const onExit = () => {
    deleteLock();
    process.exit(0);
  };
  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);
  process.on('exit', () => deleteLock());
}

main();
