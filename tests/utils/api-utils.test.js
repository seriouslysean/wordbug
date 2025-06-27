import { describe, it, expect } from 'vitest';
import { sanitizeHTML, validateEnvironment, WORDNIK_CONFIG } from '~/utils/api-utils';

describe('api-utils', () => {
  describe('sanitizeHTML', () => {
    it('handles basic HTML sanitization', () => {
      const input = '<p>This is <strong>bold</strong> text.</p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('bold');
      expect(typeof result).toBe('string');
    });

    it('handles cross-references when preserveXrefs is true', () => {
      const input = 'See <xref>example</xref> for details.';
      const result = sanitizeHTML(input, true);
      expect(result).toContain('href="https://www.wordnik.com/words/example"');
      expect(result).toContain('class="xref-link"');
    });

    it('removes xrefs when preserveXrefs is false', () => {
      const input = 'See <xref>example</xref> for details.';
      const result = sanitizeHTML(input, false);
      expect(result).not.toContain('<xref>');
      expect(result).not.toContain('</xref>');
      expect(result).toContain('example'); // Content preserved
    });

    it('handles empty input', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null)).toBe(null);
      expect(sanitizeHTML(undefined)).toBe(undefined);
    });
  });

  describe('validateEnvironment', () => {
    it('does not throw when all variables are present', () => {
      const originalEnv = process.env.TEST_VAR;
      process.env.TEST_VAR = 'test-value';
      
      expect(() => validateEnvironment(['TEST_VAR'])).not.toThrow();
      
      // Cleanup
      if (originalEnv) {
        process.env.TEST_VAR = originalEnv;
      } else {
        delete process.env.TEST_VAR;
      }
    });

    it('throws when required variables are missing', () => {
      expect(() => validateEnvironment(['MISSING_VAR'])).toThrow();
    });
  });

  describe('WORDNIK_CONFIG', () => {
    it('exports configuration constants', () => {
      expect(WORDNIK_CONFIG).toHaveProperty('BASE_URL');
      expect(WORDNIK_CONFIG).toHaveProperty('DEFAULT_LIMIT');
      expect(WORDNIK_CONFIG.DEFAULT_LIMIT).toBe(10);
    });
  });
});