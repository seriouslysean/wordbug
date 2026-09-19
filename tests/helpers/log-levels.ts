/**
 * Preloaded into a spawned tool (`node --import`) so a spec can tell a
 * warning from an error: both print to stderr unmarked, and only error-level
 * calls reach Sentry. Each warn and error line is prefixed with its level.
 * The CLI logger looks up the console method on every call, so it prints
 * through these.
 */
const levels: Array<'warn' | 'error'> = ['warn', 'error'];

for (const level of levels) {
  const print = console[level].bind(console);
  console[level] = (...args) => print(`[${level}]`, ...args);
}
