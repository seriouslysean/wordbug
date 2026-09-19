import { describe, expect, it } from 'vitest';

import {
  isHttpUrl, isNonblankString, isOptional, isRecord, isString, isStringArray,
} from '#utils/type-guards';

describe('type-guards', () => {
  describe('isRecord', () => {
    it('accepts plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ word: 'test' })).toBe(true);
    });

    it('rejects null, arrays, and primitives', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(42)).toBe(false);
    });
  });

  describe('isString', () => {
    it('accepts only strings', () => {
      expect(isString('')).toBe(true);
      expect(isString(0)).toBe(false);
      expect(isString(null)).toBe(false);
    });
  });

  describe('isNonblankString', () => {
    it('accepts a string with visible characters', () => {
      expect(isNonblankString('a')).toBe(true);
      expect(isNonblankString(' a ')).toBe(true);
    });

    it('rejects empty and whitespace-only strings and non-strings', () => {
      expect(isNonblankString('')).toBe(false);
      expect(isNonblankString(' \t\n')).toBe(false);
      expect(isNonblankString(['a'])).toBe(false);
      expect(isNonblankString(undefined)).toBe(false);
    });
  });

  describe('isStringArray', () => {
    it('accepts empty and all-string arrays', () => {
      expect(isStringArray([])).toBe(true);
      expect(isStringArray(['a', 'b'])).toBe(true);
    });

    it('rejects mixed arrays and non-arrays', () => {
      expect(isStringArray(['a', 1])).toBe(false);
      expect(isStringArray(['a', null])).toBe(false);
      expect(isStringArray('a')).toBe(false);
    });
  });

  describe('isHttpUrl', () => {
    it('accepts absolute http and https URLs', () => {
      expect(isHttpUrl('https://www.wordnik.com/words/order')).toBe(true);
      expect(isHttpUrl('http://example.com')).toBe(true);
    });

    it('rejects relative URLs, other schemes and non-strings', () => {
      expect(isHttpUrl('/words/order')).toBe(false);
      expect(isHttpUrl('www.wordnik.com/words/order')).toBe(false);
      expect(isHttpUrl('javascript:alert(1)')).toBe(false);
      expect(isHttpUrl('')).toBe(false);
      expect(isHttpUrl(undefined)).toBe(false);
    });
  });

  describe('isOptional', () => {
    it('accepts an absent value', () => {
      expect(isOptional(undefined, isString)).toBe(true);
    });

    it('defers to the guard for a present value', () => {
      expect(isOptional('a', isString)).toBe(true);
      expect(isOptional(1, isString)).toBe(false);
    });

    it('rejects null, which is present but malformed', () => {
      expect(isOptional(null, isString)).toBe(false);
    });
  });
});
