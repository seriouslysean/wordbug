# Proposed Utilities Module Structure

This document outlines the recommended consolidated utilities structure after eliminating code duplication.

---

## Directory Structure

```
occasional-wotd/
├── constants/                    # Application constants (NEW organization)
│   ├── parts-of-speech.ts       # ✅ Existing
│   ├── stats.ts                 # ✅ Existing
│   ├── urls.ts                  # ✅ Existing
│   ├── word-patterns.ts         # 🆕 NEW - Word ending patterns
│   └── text-patterns.ts         # 🆕 NEW - Regex patterns
│
├── utils/                        # Framework-agnostic utilities
│   ├── date-utils.ts            # ✅ Keep - Date manipulation
│   ├── text-utils.ts            # ✅ Keep - String formatting (updated imports)
│   ├── text-pattern-utils.ts   # 🆕 NEW - Text pattern recognition (consolidated)
│   ├── word-data-utils.ts       # ✅ Keep - Pure word data functions
│   ├── word-stats-utils.ts      # ✅ Keep - Statistics algorithms (CANONICAL)
│   ├── word-validation.ts       # ✅ Keep - Validation rules
│   ├── page-metadata-utils.ts   # ✅ Keep - Metadata generation logic
│   ├── breadcrumb-utils.ts      # ✅ Keep - Breadcrumb generation
│   ├── i18n-utils.ts            # ✅ Keep - Internationalization
│   └── url-utils.ts             # ✅ Keep - URL handling
│
└── src/
    ├── utils/                    # Astro-specific utilities
    │   ├── word-data-utils.ts   # ♻️ Refactor - Astro Content Collections only
    │   ├── word-stats-utils.ts  # ♻️ Refactor - Re-export only
    │   ├── page-metadata.ts     # ✅ Keep - Astro wrapper (acceptable)
    │   ├── build-utils.ts       # ✅ Keep - Build-time utilities
    │   ├── logger.ts            # ✅ Keep - Sentry integration
    │   ├── sentry-client.ts     # ✅ Keep - Error tracking
    │   ├── seo-utils.ts         # ✅ Keep - SEO generation
    │   ├── image-utils.ts       # ✅ Keep - Image processing
    │   ├── url-utils.ts         # ✅ Keep - BASE_PATH handling
    │   ├── schema-utils.ts      # ✅ Keep - Schema.org data
    │   ├── static-paths-utils.ts # ✅ Keep - Static path generation
    │   ├── static-file-utils.ts # ✅ Keep - Static file handling
    │   └── css-utils.ts         # 🆕 NEW - CSS class helpers
    │
    ├── components/               # Astro components
    │   ├── StatsPageTemplate.astro  # 🆕 NEW - Shared stats template
    │   └── ... (other components)
    │
    ├── pages/
    │   ├── _templates/           # 🆕 NEW - Page templates directory
    │   │   └── BrowsePageTemplate.astro
    │   └── ... (other pages)
    │
    └── styles/
        ├── patterns/             # 🆕 NEW - Shared CSS patterns
        │   └── label-value-grid.css
        └── ... (other styles)
```

---

## New Modules to Create

### 1. constants/word-patterns.ts

**Purpose:** Centralized word pattern constants (endings, prefixes, etc.)

```typescript
/**
 * Common word pattern constants for linguistic analysis
 */

export const WORD_ENDINGS = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'] as const;

export type WordEnding = typeof WORD_ENDINGS[number];

export const WORD_PREFIXES = ['un', 're', 'pre', 'dis', 'mis', 'over'] as const;

export type WordPrefix = typeof WORD_PREFIXES[number];

/**
 * Check if a word has any of the common endings
 */
export const hasCommonEnding = (word: string): boolean => {
  return WORD_ENDINGS.some(ending => word.endsWith(ending));
};

/**
 * Check if a word has any of the common prefixes
 */
export const hasCommonPrefix = (word: string): boolean => {
  return WORD_PREFIXES.some(prefix => word.startsWith(prefix));
};
```

**Used By:** text-pattern-utils.ts, word-stats-utils.ts

---

### 2. constants/text-patterns.ts

**Purpose:** Centralized regex patterns for text analysis

```typescript
/**
 * Centralized regex patterns for consistent text analysis
 */

export const TEXT_PATTERNS = {
  // Letter patterns
  VOWELS: /[aeiou]/gi,
  CONSONANTS: /[bcdfghjklmnpqrstvwxyz]/gi,
  ALL_VOWELS: /^[aeiou]+$/i,
  ALL_CONSONANTS: /^[^aeiou]+$/i,
  LETTER_ONLY: /^[a-z]$/i,

  // Repetition patterns
  DOUBLE_LETTERS: /(.)\1/,
  TRIPLE_LETTERS: /(.)\1{2,}/,

  // Word structure
  STARTS_WITH_VOWEL: /^[aeiou]/i,
  ENDS_WITH_VOWEL: /[aeiou]$/i,

  // Sequences
  ALPHABETICAL_SEQUENCE: /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i,
} as const;

export type TextPattern = keyof typeof TEXT_PATTERNS;

/**
 * Test a word against a specific pattern
 */
export const matchesPattern = (word: string, pattern: TextPattern): boolean => {
  return TEXT_PATTERNS[pattern].test(word);
};
```

**Used By:** text-pattern-utils.ts, text-utils.ts

---

### 3. utils/text-pattern-utils.ts

**Purpose:** Consolidated text pattern recognition functions

```typescript
/**
 * Text pattern recognition utilities for word analysis
 * Consolidated from text-utils.ts and word-stats-utils.ts
 */

import { TEXT_PATTERNS } from '~constants/text-patterns';
import { WORD_ENDINGS } from '~constants/word-patterns';

/**
 * Check if word's first and last letters are the same
 */
export const isStartEndSame = (word: string): boolean => {
  return word.length > 1 && word[0].toLowerCase() === word[word.length - 1].toLowerCase();
};

/**
 * Check if word contains consecutive repeated letters (aa, bb, etc.)
 */
export const hasDoubleLetters = (word: string): boolean => {
  return TEXT_PATTERNS.DOUBLE_LETTERS.test(word);
};

/**
 * Check if word contains three or more consecutive repeated letters
 */
export const hasTripleLetters = (word: string): boolean => {
  return TEXT_PATTERNS.TRIPLE_LETTERS.test(word);
};

/**
 * Check if word contains an alphabetical sequence (abc, bcd, etc.)
 */
export const hasAlphabeticalSequence = (word: string): boolean => {
  const letters = word.toLowerCase();
  return Array.from(letters)
    .slice(0, -2)
    .some((_, i) => {
      const [a, b, c] = [
        letters.charCodeAt(i),
        letters.charCodeAt(i + 1),
        letters.charCodeAt(i + 2),
      ];
      return b === a + 1 && c === b + 1;
    });
};

/**
 * Get all common endings that the word has
 */
export const getWordEndings = (word: string): string[] => {
  return WORD_ENDINGS.filter(ending => word.endsWith(ending));
};

/**
 * Check if word contains only vowels
 */
export const isAllVowels = (word: string): boolean => {
  return word.length > 0 && TEXT_PATTERNS.ALL_VOWELS.test(word);
};

/**
 * Check if word contains only consonants
 */
export const isAllConsonants = (word: string): boolean => {
  return word.length > 0 && TEXT_PATTERNS.ALL_CONSONANTS.test(word);
};

/**
 * Check if word is a palindrome (reads same forwards and backwards)
 */
export const isPalindrome = (word: string): boolean => {
  if (!word) return false;
  const normalized = word.toLowerCase();
  return normalized === normalized.split('').reverse().join('');
};

/**
 * Get vowel count in word
 */
export const getVowelCount = (word: string): number => {
  return word ? (word.match(TEXT_PATTERNS.VOWELS) || []).length : 0;
};

/**
 * Get consonant count in word
 */
export const getConsonantCount = (word: string): number => {
  return word ? (word.match(TEXT_PATTERNS.CONSONANTS) || []).length : 0;
};

/**
 * Check if word starts with a vowel
 */
export const startsWithVowel = (word: string): boolean => {
  return TEXT_PATTERNS.STARTS_WITH_VOWEL.test(word);
};

/**
 * Check if word ends with a vowel
 */
export const endsWithVowel = (word: string): boolean => {
  return TEXT_PATTERNS.ENDS_WITH_VOWEL.test(word);
};
```

**Replaces:** Functions previously duplicated across:
- utils/text-utils.ts
- utils/word-stats-utils.ts
- src/utils/word-stats-utils.ts

---

### 4. src/utils/word-stats-utils.ts (Refactored - Re-export)

**Purpose:** Astro-specific wrapper and re-export

```typescript
/**
 * Astro-specific word statistics utilities
 *
 * This module provides statistics functions for the Astro build process.
 * Core algorithms live in /utils/word-stats-utils.ts (framework-agnostic).
 *
 * This wrapper exists to:
 * - Provide Astro-specific word data injection
 * - Handle Astro Content Collection integration
 * - Maintain clean API for Astro components
 */

import { allWords } from '~astro-utils/word-data-utils';

// Re-export all statistics functions from canonical source
export {
  getLetterPatternStats,
  getWordEndingStats,
  getPatternStats,
  getChronologicalMilestones,
  getLongestStreakWords,
  getCurrentStreakWords,
  getLetterStats,
  getWordStats,
  getCurrentStreakStats,
  getAntiStreakStats,
  getSyllableStats,
  getLetterTypeStats,
  findWordDate,
  // Note: areConsecutiveDays moved to date-utils.ts
} from '~utils/word-stats-utils';

// Astro-specific convenience wrappers (optional)
import {
  getWordStats as getWordStatsBase,
  getLetterStats as getLetterStatsBase,
} from '~utils/word-stats-utils';

/**
 * Get word statistics for all words in the collection
 * Convenience wrapper that auto-injects Astro word data
 */
export const getAllWordStats = () => getWordStatsBase(allWords);

/**
 * Get letter statistics for all words in the collection
 * Convenience wrapper that auto-injects Astro word data
 */
export const getAllLetterStats = () => getLetterStatsBase(allWords);
```

**Changes:**
- Remove 400+ lines of duplicated code
- Import from canonical source
- Keep only Astro-specific wrappers if needed

---

### 5. src/utils/word-data-utils.ts (Refactored)

**Purpose:** Astro Content Collection integration ONLY

```typescript
/**
 * Astro-specific word data utilities
 *
 * This module handles Astro Content Collection integration.
 * Pure word data manipulation functions live in /utils/word-data-utils.ts.
 *
 * Responsibilities:
 * - Load words from Astro Content Collections
 * - Cache word data for build performance
 * - Provide Astro-specific word data APIs
 */

import { getCollection } from 'astro:content';
import type { WordData } from '~types';

// Import shared pure functions
import {
  findValidDefinition,
  getWordsByYear,
  getAvailableMonths,
  getAvailableYears,
  getAvailableLengths,
  getAvailableLetters,
  normalizePartOfSpeech,
  getAvailablePartsOfSpeech,
  getWordsByMonth as getWordsByMonthBase,
  getWordsByLength as getWordsByLengthBase,
  getWordsByLetter as getWordsByLetterBase,
  getWordsByPartOfSpeech as getWordsByPartOfSpeechBase,
} from '~utils/word-data-utils';

// Re-export pure functions for convenience
export {
  findValidDefinition,
  normalizePartOfSpeech,
};

/**
 * Load all words from Astro Content Collections
 * This is Astro-specific and cannot be in /utils/
 */
export async function getWordsFromCollection(): Promise<WordData[]> {
  const wordCollection = await getCollection('words');
  return wordCollection.map(entry => ({
    ...entry.data,
    id: entry.id,
  }));
}

/**
 * Get all words (cached for build performance)
 * Astro-specific caching mechanism
 */
export async function getAllWords(): Promise<WordData[]> {
  // This uses Astro's import.meta.glob or Content Collections
  return await getWordsFromCollection();
}

// Pre-load all words at build time (Astro-specific)
export const allWords = await getAllWords();

// Convenience exports using cached data
export const availableYears = getAvailableYears(allWords);
export const availableMonths = getAvailableMonths(allWords);
export const availableLengths = getAvailableLengths(allWords);
export const availableLetters = getAvailableLetters(allWords);
export const availablePartsOfSpeech = getAvailablePartsOfSpeech(allWords);

/**
 * Group words by year (uses cached allWords)
 */
export function groupWordsByYear(): Record<number, WordData[]> {
  return getWordsByYear(allWords);
}

/**
 * Get words for a specific month (uses cached allWords)
 */
export function getWordsByMonth(year: number, month: number): WordData[] {
  return getWordsByMonthBase(allWords, year, month);
}

/**
 * Get words by length (uses cached allWords)
 */
export function getWordsByLength(length: number): WordData[] {
  return getWordsByLengthBase(allWords, length);
}

/**
 * Get words by first letter (uses cached allWords)
 */
export function getWordsByLetter(letter: string): WordData[] {
  return getWordsByLetterBase(allWords, letter);
}

/**
 * Get words by part of speech (uses cached allWords)
 */
export function getWordsByPartOfSpeech(partOfSpeech: string): WordData[] {
  return getWordsByPartOfSpeechBase(allWords, normalizePartOfSpeech(partOfSpeech));
}

/**
 * Extract definition and part of speech from word data
 * Astro-specific because it handles Content Collection data structure
 */
export function extractWordDefinition(wordData: WordData): { definition: string; partOfSpeech: string } {
  if (!wordData?.data) {
    return { definition: '', partOfSpeech: '' };
  }

  const validDef = findValidDefinition(wordData.data);

  if (!validDef) {
    return { definition: '', partOfSpeech: '' };
  }

  return {
    definition: validDef.text,
    partOfSpeech: validDef.partOfSpeech,
  };
}
```

**Changes:**
- Remove ~250 lines of duplicated pure functions
- Import from /utils/word-data-utils.ts
- Keep only Astro-specific functions
- Keep caching and Content Collection logic

---

### 6. utils/text-utils.ts (Updated Imports)

**Purpose:** String formatting and text utilities (updated to use consolidated functions)

```typescript
/**
 * Text formatting and manipulation utilities
 */

import type { WordData } from '~types';

// Import pattern recognition from consolidated module
export {
  isStartEndSame,
  hasDoubleLetters,
  hasTripleLetters,
  hasAlphabeticalSequence,
  getWordEndings,
  isAllVowels,
  isAllConsonants,
  isPalindrome,
  getVowelCount,
  getConsonantCount,
  startsWithVowel,
  endsWithVowel,
} from './text-pattern-utils';

/**
 * Capitalize first letter of string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert string to title case
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Truncate string to specified length with ellipsis
 */
export const truncate = (str: string, maxLength: number): string => {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
};

/**
 * Get word length without special characters
 */
export const getWordLength = (word: string): number => {
  return word.replace(/[^a-zA-Z]/g, '').length;
};

/**
 * Format word for display (capitalize, clean)
 */
export const formatWordDisplay = (word: string): string => {
  return capitalize(word.trim());
};

/**
 * Create URL-safe slug from string
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

/**
 * Pluralize word (simple English rules)
 */
export const pluralize = (word: string, count: number): string => {
  if (count === 1) return word;

  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }

  if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch')) {
    return word + 'es';
  }

  return word + 's';
};

/**
 * Format list of strings with proper grammar
 */
export const formatList = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  return `${allButLast}, and ${last}`;
};
```

**Changes:**
- Remove duplicated pattern functions
- Import from text-pattern-utils.ts
- Keep unique formatting functions

---

### 7. src/components/StatsPageTemplate.astro

**Purpose:** Shared template for statistics pages

```astro
---
/**
 * Shared template component for statistics pages
 * Provides consistent layout and metadata handling
 */
import DescriptionText from '~components/DescriptionText.astro';
import Heading from '~components/Heading.astro';
import Layout from '~layouts/Layout.astro';
import { getPageMetadata } from '~astro-utils/page-metadata.ts';
import { STRUCTURED_DATA_TYPE } from '~astro-utils/schema-utils.ts';

interface Props {
  descriptionText: string;
  columns?: number;
}

const { descriptionText, columns = 2 } = Astro.props;
const { title, description, secondaryText } = getPageMetadata(Astro.url.pathname);
---

<Layout
  title={title}
  description={description}
  structuredDataType={STRUCTURED_DATA_TYPE.WORD_LIST}
>
  <Heading text={title} secondaryText={secondaryText} />
  <DescriptionText text={descriptionText} />
  <slot />
</Layout>
```

**Used By:**
- StatsMilestonePage.astro
- StatsWordListPage.astro

---

### 8. src/pages/_templates/BrowsePageTemplate.astro

**Purpose:** Shared template for browse pages

```astro
---
/**
 * Shared template component for browse pages
 * Handles common layout, metadata, and word section rendering
 */
import DescriptionText from '~components/DescriptionText.astro';
import Heading from '~components/Heading.astro';
import WordSection from '~components/WordSection.astro';
import Layout from '~layouts/Layout.astro';
import { getPageMetadata } from '~astro-utils/page-metadata.ts';
import { STRUCTURED_DATA_TYPE } from '~astro-utils/schema-utils.ts';
import type { WordData } from '~types';

interface Props {
  words: WordData[];
  columns?: number;
}

const { words, columns = 2 } = Astro.props;
const { title, description, secondaryText } = getPageMetadata(Astro.url.pathname);
---

<Layout
  title={title}
  description={description}
  structuredDataType={STRUCTURED_DATA_TYPE.WORD_LIST}
>
  <Heading level={1} text={title} secondaryText={secondaryText} />
  <DescriptionText text={description} />
  <WordSection words={words} columns={columns} />
</Layout>
```

**Used By:**
- browse/[year]/[month].astro
- browse/length/[length].astro
- browse/letter/[letter].astro
- browse/part-of-speech/[partOfSpeech].astro

---

### 9. src/utils/css-utils.ts

**Purpose:** CSS class construction helpers

```typescript
/**
 * CSS utility functions for dynamic class construction
 */

/**
 * Build button CSS classes based on variant
 */
export const buildButtonClasses = (
  variant: 'text' | 'primary' | 'secondary',
  additionalClasses?: string
): string => {
  if (variant === 'text' && additionalClasses) {
    return additionalClasses;
  }

  return ['site-button', `site-button--${variant}`, additionalClasses]
    .filter(Boolean)
    .join(' ');
};

/**
 * Conditionally join CSS classes
 */
export const classNames = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Build grid column classes
 */
export const buildGridClasses = (columns: number): string => {
  return `grid grid-cols-${columns}`;
};
```

**Used By:**
- SiteButton.astro
- SiteLink.astro

---

### 10. src/styles/patterns/label-value-grid.css

**Purpose:** Reusable CSS pattern for label-value grids

```css
/**
 * Label-value grid pattern
 * Used for definition lists, milestone displays, etc.
 */

.label-value-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
}

.label-value-grid__label {
  color: var(--color-text-light);
  margin: 0;
  padding-top: var(--spacing-small);
  font-size: var(--font-size-small);
}

.label-value-grid__value {
  font-size: var(--font-size-medium);
  font-weight: 500;
  text-align: right;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-small);
  margin-bottom: var(--spacing-small);
}

@media (min-width: 1025px) {
  .label-value-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 1rem;
    row-gap: 0;
  }

  .label-value-grid__label,
  .label-value-grid__value {
    padding-top: 0;
    padding-bottom: var(--spacing-small);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0;
  }
}

/* Variants */
.label-value-grid--compact {
  gap: var(--spacing-xs);
}

.label-value-grid--spacious {
  gap: var(--spacing-medium);
}
```

**Used By:**
- DefinitionList.astro
- StatsMilestonePage.astro

---

## Updated Import Paths

### Example Component Using New Structure:

**Before:**
```typescript
// StatsMilestonePage.astro (old)
---
import DescriptionText from '~components/DescriptionText.astro';
import Heading from '~components/Heading.astro';
import WordLink from '~components/WordLink.astro';
import Layout from '~layouts/Layout.astro';
import type { WordMilestoneItem } from '~types';
import { getPageMetadata } from '~astro-utils/page-metadata.ts';
import { STRUCTURED_DATA_TYPE } from '~astro-utils/schema-utils.ts';

interface Props {
  words: WordMilestoneItem[];
  descriptionText: string;
}

const { words, descriptionText } = Astro.props;
const metadata = getPageMetadata(Astro.url.pathname);
const { title, description, secondaryText } = metadata;
---

<Layout title={title} description={description} structuredDataType={STRUCTURED_DATA_TYPE.WORD_LIST}>
  <Heading text={title} secondaryText={secondaryText} />
  <DescriptionText text={descriptionText} />
  <section class="milestones__section">
    <!-- Content -->
  </section>
</Layout>
```

**After:**
```typescript
// StatsMilestonePage.astro (new)
---
import StatsPageTemplate from '~components/StatsPageTemplate.astro';
import WordLink from '~components/WordLink.astro';
import type { WordMilestoneItem } from '~types';

interface Props {
  words: WordMilestoneItem[];
  descriptionText: string;
}

const { words, descriptionText } = Astro.props;
---

<StatsPageTemplate descriptionText={descriptionText}>
  <section class="milestones__section">
    <!-- Content -->
  </section>
</StatsPageTemplate>
```

---

## Architecture Decision Record

### Utils Directory Separation

**Decision:** Maintain separate `/utils/` and `/src/utils/` directories

**Rationale:**
1. **Framework Independence:** `/utils/` contains pure functions usable by CLI tools
2. **Build Optimization:** Astro-specific code stays in `/src/`
3. **Testing:** Pure functions easier to test without Astro context
4. **Reusability:** Core logic can be extracted to separate packages

**Guidelines:**

#### Use `/utils/` (Framework-Agnostic) When:
- ✅ No Astro imports (`astro:*` or `@astrojs/*`)
- ✅ No environment variables (`import.meta.env`)
- ✅ Pure functions with clear inputs/outputs
- ✅ Usable by CLI tools in `/tools/`
- ✅ Reusable across different projects

#### Use `/src/utils/` (Astro-Specific) When:
- ✅ Uses Astro Content Collections
- ✅ Requires `import.meta.env` variables
- ✅ Uses Astro integrations or plugins
- ✅ Caches data at build time
- ✅ Depends on Astro context

---

## Migration Checklist

### Phase 1: Constants
- [ ] Create `constants/word-patterns.ts`
- [ ] Create `constants/text-patterns.ts`
- [ ] Update imports in affected files (3 files)
- [ ] Run tests

### Phase 2: Text Pattern Utilities
- [ ] Create `utils/text-pattern-utils.ts`
- [ ] Move functions from text-utils.ts
- [ ] Move functions from word-stats-utils.ts
- [ ] Update imports in text-utils.ts
- [ ] Update imports in word-stats-utils.ts
- [ ] Run tests

### Phase 3: Word Stats Utilities
- [ ] Keep `utils/word-stats-utils.ts` as canonical
- [ ] Refactor `src/utils/word-stats-utils.ts` to re-export
- [ ] Update imports in all pages (~15 files)
- [ ] Update imports in all components (~10 files)
- [ ] Update imports in all tests (~8 files)
- [ ] Run full test suite

### Phase 4: Word Data Utilities
- [ ] Update `src/utils/word-data-utils.ts`
- [ ] Remove duplicated functions
- [ ] Import from `utils/word-data-utils.ts`
- [ ] Keep only Astro-specific functions
- [ ] Update tests
- [ ] Run full test suite

### Phase 5: Component Templates
- [ ] Create `src/components/StatsPageTemplate.astro`
- [ ] Refactor StatsMilestonePage.astro
- [ ] Refactor StatsWordListPage.astro
- [ ] Create `src/pages/_templates/BrowsePageTemplate.astro`
- [ ] Refactor 4 browse pages
- [ ] Test all affected routes

### Phase 6: CSS Patterns
- [ ] Create `src/styles/patterns/label-value-grid.css`
- [ ] Update DefinitionList.astro
- [ ] Update StatsMilestonePage.astro
- [ ] Create `src/utils/css-utils.ts`
- [ ] Update SiteButton.astro
- [ ] Update SiteLink.astro
- [ ] Test component rendering

### Phase 7: Date Utilities
- [ ] Remove `areConsecutiveDays` from word-stats-utils.ts
- [ ] Import from date-utils.ts
- [ ] Run tests

### Phase 8: Documentation & Verification
- [ ] Update ARCHITECTURE.md
- [ ] Update CONTRIBUTING.md
- [ ] Run full test suite
- [ ] Check bundle size
- [ ] Performance benchmarks
- [ ] Create PR with changes

---

## Import Path Reference

### Common Import Paths:

```typescript
// Constants
import { WORD_ENDINGS } from '~constants/word-patterns';
import { TEXT_PATTERNS } from '~constants/text-patterns';

// Framework-agnostic utilities
import { isStartEndSame, isPalindrome } from '~utils/text-pattern-utils';
import { getLetterPatternStats } from '~utils/word-stats-utils';
import { findValidDefinition } from '~utils/word-data-utils';
import { areConsecutiveDays } from '~utils/date-utils';

// Astro-specific utilities
import { getAllWords } from '~astro-utils/word-data-utils';
import { getAllWordStats } from '~astro-utils/word-stats-utils';
import { buildButtonClasses } from '~astro-utils/css-utils';

// Components
import StatsPageTemplate from '~components/StatsPageTemplate.astro';
import BrowsePageTemplate from '~pages/_templates/BrowsePageTemplate.astro';
```

---

## Expected Outcomes

### Before Consolidation:
```
utils/
  text-utils.ts (150 lines)
  word-stats-utils.ts (227 lines)
src/utils/
  word-stats-utils.ts (474 lines)

Total: 851 lines
Duplication: ~400 lines (47%)
```

### After Consolidation:
```
constants/
  word-patterns.ts (30 lines) - NEW
  text-patterns.ts (25 lines) - NEW
utils/
  text-utils.ts (80 lines) - reduced
  text-pattern-utils.ts (120 lines) - NEW
  word-stats-utils.ts (250 lines) - updated
src/utils/
  word-stats-utils.ts (50 lines) - re-export only
  css-utils.ts (30 lines) - NEW

Total: 585 lines
Duplication: 0 lines (0%)
Reduction: 266 lines (31% decrease)
```

---

## Testing Strategy

### Unit Tests to Update:

1. **text-pattern-utils.spec.js** (NEW)
   - Test all pattern recognition functions
   - Test edge cases (empty strings, special characters)

2. **word-stats-utils.spec.js** (UPDATE)
   - Ensure imports from canonical source work
   - Test Astro-specific wrappers

3. **word-data-utils.spec.js** (UPDATE)
   - Update import paths
   - Test separation of concerns

4. **css-utils.spec.js** (NEW)
   - Test class construction functions

### Integration Tests:

1. **Browse pages**
   - Verify all browse routes render correctly
   - Test filtering logic

2. **Stats pages**
   - Verify stats calculations
   - Test milestone displays

3. **Component rendering**
   - Verify templates render correctly
   - Test slot content

### Performance Tests:

1. **Bundle size**
   - Compare before/after bundle sizes
   - Verify tree-shaking works

2. **Build time**
   - Measure build duration
   - Verify caching still works

---

## Rollback Plan

If issues arise during migration:

1. **Keep original files as `.backup`**
   ```bash
   cp src/utils/word-stats-utils.ts src/utils/word-stats-utils.ts.backup
   ```

2. **Create feature branch**
   ```bash
   git checkout -b refactor/consolidate-utilities
   ```

3. **Commit incrementally**
   ```bash
   git commit -m "Phase 1: Extract text pattern constants"
   git commit -m "Phase 2: Create text-pattern-utils.ts"
   # etc.
   ```

4. **If rollback needed**
   ```bash
   git checkout main
   git branch -D refactor/consolidate-utilities
   ```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Proposed - Pending Implementation
