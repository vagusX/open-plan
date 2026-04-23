import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { deleteLock, lockPath, probeServer, readLock, writeLock } from '../src/utils/lock';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'open-plan-lock-'));
  process.env.OPEN_PLAN_LOCK_PATH = join(tmp, 'lock.json');
});

afterEach(() => {
  delete process.env.OPEN_PLAN_LOCK_PATH;
  rmSync(tmp, { recursive: true, force: true });
});

describe('lock round-trip', () => {
  test('writeLock → readLock returns the same fields', () => {
    writeLock({ port: 4242, pid: 9999, startedAt: 1_700_000_000_000 });
    const got = readLock();
    expect(got).not.toBeNull();
    expect(got!.app).toBe('open-plan');
    expect(got!.port).toBe(4242);
    expect(got!.pid).toBe(9999);
    expect(got!.startedAt).toBe(1_700_000_000_000);
  });

  test('readLock returns null when no lock file exists', () => {
    expect(readLock()).toBeNull();
  });

  test('deleteLock removes the file (idempotent)', () => {
    writeLock({ port: 1, pid: 2, startedAt: 3 });
    deleteLock();
    expect(readLock()).toBeNull();
    // Second call on missing file must not throw.
    deleteLock();
  });

  test('readLock returns null on malformed JSON', () => {
    writeFileSync(lockPath(), '{ not json', 'utf8');
    expect(readLock()).toBeNull();
  });

  test('readLock rejects wrong app marker (guards against lock-file collisions)', () => {
    writeFileSync(lockPath(), JSON.stringify({ app: 'other', port: 1, pid: 2 }), 'utf8');
    expect(readLock()).toBeNull();
  });

  test('readLock rejects missing numeric port', () => {
    writeFileSync(lockPath(), JSON.stringify({ app: 'open-plan', pid: 1 }), 'utf8');
    expect(readLock()).toBeNull();
  });
});

describe('probeServer', () => {
  test('returns null when nothing is listening on the port', async () => {
    // Port 1 is privileged and almost certainly refused → exercises the
    // connection-refused path without depending on an unused ephemeral port.
    const got = await probeServer(1, 200);
    expect(got).toBeNull();
  });

  test('returns null when the ping response is wrong app', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => Response.json({ app: 'somebody-else', pid: 123 }),
    });
    try {
      const got = await probeServer(server.port!, 500);
      expect(got).toBeNull();
    } finally {
      server.stop();
    }
  });

  test('parses a valid open-plan ping payload', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        Response.json({
          app: 'open-plan',
          pid: 4321,
          planDirs: ['/tmp/plans'],
          extraAllowedFiles: ['/tmp/foo.md'],
        }),
    });
    try {
      const got = await probeServer(server.port!, 500);
      expect(got).not.toBeNull();
      expect(got!.pid).toBe(4321);
      expect(got!.planDirs).toEqual(['/tmp/plans']);
      expect(got!.extraAllowedFiles).toEqual(['/tmp/foo.md']);
    } finally {
      server.stop();
    }
  });
});
