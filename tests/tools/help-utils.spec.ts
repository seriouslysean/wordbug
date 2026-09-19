import { afterEach, describe, expect, it, vi } from 'vitest';

const ctx = vi.hoisted(() => ({
  exit: vi.fn(),
  logger: { warn: vi.fn() },
}));

vi.mock('#utils/logger', () => ({
  exit: ctx.exit,
  getErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
  logger: ctx.logger,
}));

import { parseToolArgs, showHelp } from '#tools/help-utils';

afterEach(() => {
  vi.restoreAllMocks();
  ctx.exit.mockReset();
  ctx.logger.warn.mockReset();
});

describe('parseToolArgs', () => {
  it('returns parsed values and positionals', async () => {
    const parsed = await parseToolArgs({
      args: ['alpha', '--force'],
      allowPositionals: true,
      options: { force: { type: 'boolean' } },
      strict: true,
    });

    expect(parsed.values.force).toBe(true);
    expect(parsed.positionals).toEqual(['alpha']);
  });

  it('reports invalid CLI input and exits one', async () => {
    await parseToolArgs({
      args: ['--unknown'],
      options: {},
      strict: true,
    });

    expect(ctx.logger.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('Unknown option'),
      { help: 'Run with --help to list the options' },
    );
    expect(ctx.exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});

describe('showHelp', () => {
  it('prints trimmed help text', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    showHelp('\n  Usage: tool\n');

    expect(log).toHaveBeenCalledExactlyOnceWith('Usage: tool');
  });
});
