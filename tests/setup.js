import { vi } from 'vitest';
import mockTranslations from '#tests/locales/en-us.fixtures.json';

// Mock astro:env/client with mutable defaults for all tests
// Individual tests can override via mockEnv.FIELD = 'value'
export const mockEnv = {
  SITE_TITLE: 'Test Site',
  SITE_DESCRIPTION: 'Test Description',
  SITE_ID: 'test-site',
  SITE_URL: 'https://test.com',
  SITE_LOCALE: 'en',
  SITE_KEYWORDS: 'test,keywords',
  SITE_AUTHOR: 'Test Author',
  SITE_AUTHOR_URL: 'https://test.com',
  SITE_ATTRIBUTION_MESSAGE: 'Test Attribution',
  HUMANS_WORD_CURATOR: '',
  HUMANS_DEVELOPER_NAME: '',
  HUMANS_DEVELOPER_CONTACT: '',
  HUMANS_DEVELOPER_SITE: '',
  COLOR_PRIMARY: '#9a3412',
  COLOR_PRIMARY_LIGHT: '#c2410c',
  COLOR_PRIMARY_DARK: '#7c2d12',
  COLOR_DARK_PRIMARY: undefined,
  COLOR_DARK_PRIMARY_LIGHT: undefined,
  COLOR_DARK_PRIMARY_DARK: undefined,
  COLOR_DARK_BACKGROUND: undefined,
  COLOR_DARK_BACKGROUND_LIGHT: undefined,
  COLOR_DARK_TEXT: undefined,
  COLOR_DARK_TEXT_LIGHT: undefined,
  COLOR_DARK_BORDER: undefined,
  GA_ENABLED: false,
  GA_MEASUREMENT_ID: undefined,
  SENTRY_ENABLED: false,
  SENTRY_DSN: undefined,
  BASE_PATH: '/',
};

vi.mock('astro:env/client', () => mockEnv);

// Expose for tests that need to override env values
global.mockEnv = mockEnv;

// Mock fixture data for testing
const mockWordData = [
  {
    id: '2025/20250121.json',
    data: {
      word: 'occasional',
      date: '20250121',
      adapter: 'wordnik',
      data: [
        {
          text: 'Occurring or appearing at irregular or infrequent intervals.',
          partOfSpeech: 'adjective',
          sourceDictionary: 'wordnik',
        },
      ],
    },
  },
  {
    id: '2025/20250120.json',
    data: {
      word: 'word',
      date: '20250120',
      adapter: 'wordnik',
      data: [
        {
          text: 'A unit of language.',
          partOfSpeech: 'noun',
          sourceDictionary: 'wordnik',
        },
      ],
    },
  },
  {
    id: '2025/20250119.json',
    data: {
      word: 'serendipity',
      date: '20250119',
      adapter: 'wordnik',
      data: [
        {
          text: 'The faculty of making fortunate discoveries by accident.',
          partOfSpeech: 'noun',
          sourceDictionary: 'wordnik',
        },
      ],
    },
  },
];

// Mock astro:content module
vi.mock('astro:content', () => ({
  getCollection: vi.fn().mockImplementation((collectionName) => {
    if (collectionName === 'words') {
      return Promise.resolve(mockWordData);
    }
    return Promise.resolve([]);
  }),
}));

// Mock translations with educational/word-focused fixtures
vi.mock('#locales/en.json', () => ({ default: mockTranslations }));

// Expose mock data for tests that need it
global.mockWordData = mockWordData;