import { spawn } from 'node:child_process';

export interface SpawnToolOptions {
  env?: Record<string, string>;
  timeout?: number;
  cwd?: string;
}

export interface SpawnToolResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export const spawnTool = (args: string[], options: SpawnToolOptions = {}): Promise<SpawnToolResult> => {
  const { env = {}, timeout = 10000, cwd } = options;
  const { promise, resolve, reject } = Promise.withResolvers<SpawnToolResult>();

  const proc = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    timeout,
    cwd,
  });

  const chunks: { stdout: string[]; stderr: string[] } = { stdout: [], stderr: [] };
  proc.stdout.on('data', (data: Buffer | string) => chunks.stdout.push(data.toString()));
  proc.stderr.on('data', (data: Buffer | string) => chunks.stderr.push(data.toString()));

  proc.on('error', reject);
  proc.on('close', (code) => {
    resolve({
      stdout: chunks.stdout.join(''),
      stderr: chunks.stderr.join(''),
      code,
    });
  });

  return promise;
};
