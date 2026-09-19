/**
 * The setup-env composite action's script, run the way the runner runs it:
 * bash with -e and pipefail, and its env block with the inputs filled in.
 * The process's stdout and $GITHUB_ENV append to the same temporary log, so
 * the workflow commands and variables land in one stream in execution order.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

interface ActionResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface ActionInputs {
  vars: Record<string, string>;
  secrets: Record<string, string>;
}

interface MaskEvent {
  mask: string;
}

interface VariableEvent {
  name: string;
  value: string;
}

type Event = MaskEvent | VariableEvent;

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object`);
  }
  return Object.fromEntries(Object.entries(value));
};

const field = (value: unknown, key: string, label: string): unknown => {
  const object = record(value, label);
  if (!(key in object)) {
    throw new Error(`Expected ${label} to contain ${key}`);
  }
  return object[key];
};

const stringField = (value: unknown, key: string, label: string): string => {
  const result = field(value, key, label);
  if (typeof result !== 'string') {
    throw new Error(`Expected ${label}.${key} to be a string`);
  }
  return result;
};

const action = load(fs.readFileSync(path.join(process.cwd(), '.github/actions/setup-env/action.yml'), 'utf-8'));
const runs = record(field(action, 'runs', 'action'), 'action runs');
const steps = field(runs, 'steps', 'action runs');
if (!Array.isArray(steps) || steps.length === 0) {
  throw new Error('The action has no steps');
}
const step = record(steps[0], 'setup-env step');
const stepEnv = record(field(step, 'env', 'setup-env step'), 'setup-env step env');
const stepRun = stringField(step, 'run', 'setup-env step');
const VAR_NAMES = stringField(stepEnv, 'VAR_NAMES', 'setup-env step env').split('\n').filter(Boolean);

const runAction = ({ vars, secrets }: ActionInputs): Promise<ActionResult> => {
  const inputs: Record<string, string> = {
    '${{ inputs.vars-json }}': JSON.stringify(vars),
    '${{ inputs.secrets-json }}': JSON.stringify(secrets),
  };
  const env = Object.fromEntries(Object.entries(stepEnv).map(([key, value]) => {
    if (typeof value !== 'string') {
      throw new Error(`The action env value for ${key} is not a string`);
    }
    return [key, inputs[value] ?? value];
  }));
  if (Object.values(env).some(value => value.includes('${{'))) {
    throw new Error('The action reads an input this test does not supply');
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-setup-env-'));
  const output = path.join(directory, 'events');
  const outputFd = fs.openSync(output, 'a');
  const { promise, resolve, reject } = Promise.withResolvers<ActionResult>();
  const proc = spawn('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', stepRun], {
    env: { PATH: process.env.PATH ?? '', GITHUB_ENV: output, ...env },
    stdio: ['ignore', outputFd, 'pipe'],
  });
  const { stderr } = proc;
  if (stderr === null) {
    proc.kill();
    fs.closeSync(outputFd);
    fs.rmSync(directory, { recursive: true, force: true });
    throw new Error('The setup-env process has no stderr stream');
  }
  const err: string[] = [];
  let finished = false;
  const cleanup = (): void => {
    fs.closeSync(outputFd);
    fs.rmSync(directory, { recursive: true, force: true });
  };
  stderr.on('data', (data: Buffer | string) => err.push(data.toString()));
  proc.on('error', error => {
    if (finished) {
      return;
    }
    finished = true;
    cleanup();
    reject(error);
  });
  proc.on('close', code => {
    if (finished) {
      return;
    }
    finished = true;
    fs.closeSync(outputFd);
    const stdout = fs.readFileSync(output, 'utf-8');
    fs.rmSync(directory, { recursive: true, force: true });
    resolve({ code, stdout, stderr: err.join('') });
  });
  return promise;
};

/**
 * The stream as a list of events: a mask, or a variable written in the
 * NAME<<delimiter form with its value.
 */
const parse = (stdout: string): Event[] => {
  const lines = stdout.split('\n');
  const events: Event[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.startsWith('::add-mask::')) {
      events.push({ mask: line.slice('::add-mask::'.length) });
      continue;
    }
    const heredoc = line.match(/^([A-Z][A-Z0-9_]*)<<(EOF_[0-9a-f]{32})$/);
    if (!heredoc) {
      expect(line).toBe('');
      continue;
    }
    const name = heredoc[1];
    const delimiter = heredoc[2];
    if (!name || !delimiter) {
      throw new Error('Malformed environment-file event');
    }
    const end = lines.indexOf(delimiter, index + 1);
    if (end === -1) {
      throw new Error(`Missing delimiter for ${name}`);
    }
    events.push({ name, value: lines.slice(index + 1, end).join('\n') });
    index = end;
  }
  return events;
};

describe('setup-env action', () => {
  const SECRETS: Record<string, string> = {
    WORDNIK_API_KEY: 'wordnik-key-123',
    MERRIAM_WEBSTER_API_KEY: 'first line\n\n  \nsecond line\r\nthird line',
    SENTRY_DSN: 'https://abc%40def@sentry.example/1',
    SENTRY_AUTH_TOKEN: '',
    GA_ENABLED: 'true',
  };
  const VARS: Record<string, string> = {
    SITE_TITLE: 'Word Bug',
    SITE_DESCRIPTION: 'Two\nlines',
    DICTIONARY_ADAPTER: 'wordnik',
    SITE_TZ: 'America/Chicago',
  };

  it('masks each line of every secret value before writing it, and no variable', async () => {
    const result = await runAction({ vars: VARS, secrets: SECRETS });

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const events = parse(result.stdout);
    const masks = events.filter((event): event is MaskEvent => 'mask' in event).map(event => event.mask);

    // Blank lines are skipped and % is escaped, since the runner reads
    // command data with %25 as %
    expect(masks).toEqual([
      'true',
      'first line',
      'second line',
      'third line',
      'https://abc%2540def@sentry.example/1',
      'wordnik-key-123',
    ]);

    // Each secret's masks come straight before its write, and an empty
    // secret has none
    const at = (name: string): number => events.findIndex(event => 'name' in event && event.name === name);
    const before = (name: string, count: number): Event[] => events.slice(at(name) - count, at(name));
    expect(before('GA_ENABLED', 1)).toEqual([{ mask: 'true' }]);
    expect(before('MERRIAM_WEBSTER_API_KEY', 3)).toEqual([{ mask: 'first line' }, { mask: 'second line' }, { mask: 'third line' }]);
    expect(before('SENTRY_AUTH_TOKEN', 1)).toEqual([{ name: 'MERRIAM_WEBSTER_API_KEY', value: SECRETS.MERRIAM_WEBSTER_API_KEY }]);
    expect(before('SENTRY_DSN', 1)).toEqual([{ mask: 'https://abc%2540def@sentry.example/1' }]);
    expect(before('WORDNIK_API_KEY', 1)).toEqual([{ mask: 'wordnik-key-123' }]);

    // Variables are written before any mask and none is masked
    const lastVariable = Math.max(...VAR_NAMES.map(at));
    expect(events.findIndex(event => 'mask' in event)).toBeGreaterThan(lastVariable);
    expect(masks.filter(mask => Object.values(VARS).some(value => value.split('\n').includes(mask)))).toEqual([]);

    // The values themselves are written unchanged
    const byName = Object.fromEntries(
      events.filter((event): event is VariableEvent => 'name' in event).map(event => [event.name, event.value]),
    );
    expect(byName.MERRIAM_WEBSTER_API_KEY).toBe(SECRETS.MERRIAM_WEBSTER_API_KEY);
    expect(byName.SENTRY_DSN).toBe(SECRETS.SENTRY_DSN);
    expect(byName.SITE_DESCRIPTION).toBe('Two\nlines');
    expect(byName.TZ).toBe('America/Chicago');
  });

  it('masks nothing when no secret has a value', async () => {
    const result = await runAction({ vars: VARS, secrets: {} });

    expect(result.code).toBe(0);
    expect(parse(result.stdout).filter((event): event is MaskEvent => 'mask' in event)).toEqual([]);
  });
});
