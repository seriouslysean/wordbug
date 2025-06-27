/**
 * Logger type definitions for WordBug
 * Provides type safety for logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type SentryLevel = 'warning' | 'error' | 'info';

export interface LogContext {
  readonly [key: string]: unknown;
}

export interface SentryLogParams {
  readonly message: string | Error;
  readonly context?: LogContext;
  readonly level: SentryLevel;
}

export interface Logger {
  readonly debug: typeof console.debug;
  readonly info: typeof console.info;
  readonly warn: typeof console.warn;
  readonly error: typeof console.error;
}

export interface SentryLogError {
  (message: string | Error, context?: object, level?: string): void;
}

export interface SentryClientModule {
  readonly logError: SentryLogError;
}
