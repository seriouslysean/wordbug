import { spawn } from 'child_process';

/**
 * Spawns a CLI tool via `npx tsx` and captures output.
 * Uses the done() callback pattern required by Vitest for child process tests.
 *
 * @param {string[]} args - Arguments to pass after `npx tsx`
 * @param {object} [options] - Spawn options
 * @param {Record<string, string>} [options.env] - Additional environment variables
 * @param {number} [options.timeout] - Process timeout in ms (default: 10000)
 * @param {(result: { stdout: string, stderr: string, code: number | null }) => void} callback - Called on process close
 */
export const spawnTool = (args, options, callback) => {
  const { env = {}, timeout = 10000 } = options;

  const proc = spawn('npx', ['tsx', ...args], {
    env: { ...process.env, ...env },
    timeout,
  });

  const chunks = { stdout: [], stderr: [] };
  proc.stdout.on('data', (data) => chunks.stdout.push(data.toString()));
  proc.stderr.on('data', (data) => chunks.stderr.push(data.toString()));

  proc.on('close', (code) => {
    callback({
      stdout: chunks.stdout.join(''),
      stderr: chunks.stderr.join(''),
      code,
    });
  });
};
