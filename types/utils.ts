/**
 * Utility types
 */

import type { WordnikRateLimit } from './wordnik';

export interface LogContext {
  [key: string]: unknown;
}

export interface DateFormatOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
}

export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpg' | 'webp';
  quality?: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  rateLimits?: WordnikRateLimit;
}

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: LogContext;
}

export interface TextSyllableSpecialCases {
  [word: string]: number;
}

export interface TextValidationOptions {
  allowEmpty?: boolean;
  maxLength?: number;
  minLength?: number;
}

export type GtagArgs = (string | Date | Record<string, unknown>)[];