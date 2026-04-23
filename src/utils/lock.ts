import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

const DEFAULT_LOCK_PATH = join(homedir(), '.claude', 'open-plan.lock.json');

/**
 * Resolved lazily so tests can point at a temp file via `OPEN_PLAN_LOCK_PATH`.
 * Not worth plumbing a config argument through — the lock is inherently a
 * process-global singleton.
 */
export function lockPath(): string {
  return process.env.OPEN_PLAN_LOCK_PATH || DEFAULT_LOCK_PATH;
}

export interface LockInfo {
  app: 'open-plan';
  port: number;
  pid: number;
  startedAt: number;
}

export interface PingInfo {
  app: 'open-plan';
  pid: number;
  planDirs: string[];
  extraAllowedFiles: string[];
}

export function writeLock(info: Omit<LockInfo, 'app'>): void {
  const path = lockPath();
  mkdirSync(dirname(path), { recursive: true });
  const full: LockInfo = { app: 'open-plan', ...info };
  writeFileSync(path, JSON.stringify(full, null, 2), 'utf8');
}

export function readLock(): LockInfo | null {
  const path = lockPath();
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (data?.app !== 'open-plan' || typeof data?.port !== 'number') return null;
    return data as LockInfo;
  } catch {
    return null;
  }
}

export function deleteLock(): void {
  try {
    unlinkSync(lockPath());
  } catch {
    // already gone — fine
  }
}

/**
 * Hit /api/ping to confirm an open-plan server is alive on `port`. Returns the
 * ping payload (including planDirs / extraAllowedFiles so callers can decide
 * whether the running server can actually serve their target file) or null on
 * any failure — timeout, connection refused, non-2xx, wrong `app` marker.
 */
export async function probeServer(port: number, timeoutMs = 500): Promise<PingInfo | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`http://localhost:${port}/api/ping`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<PingInfo>;
    if (data?.app !== 'open-plan') return null;
    return {
      app: 'open-plan',
      pid: typeof data.pid === 'number' ? data.pid : 0,
      planDirs: Array.isArray(data.planDirs) ? data.planDirs : [],
      extraAllowedFiles: Array.isArray(data.extraAllowedFiles) ? data.extraAllowedFiles : [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
