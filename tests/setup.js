import { vi } from 'vitest';
import mockTranslations from '~tests/locales/en-us.fixtures.json';

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
vi.mock('~locales/en.json', () => ({ default: mockTranslations }));

// Expose mock data for tests that need it
global.mockWordData = mockWordData;