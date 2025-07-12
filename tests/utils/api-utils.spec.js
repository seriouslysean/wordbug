import { describe, expect,it } from 'vitest';

import { validateEnvironment } from '~config/environment';

describe('api-utils', () => {

  describe('validateEnvironment', () => {
    it('does not throw when all variables are present', () => {
      const originalEnv = process.env.TEST_VAR;
      process.env.TEST_VAR = 'test-value';

      expect(() => validateEnvironment(['TEST_VAR'])).not.toThrow();

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
});
