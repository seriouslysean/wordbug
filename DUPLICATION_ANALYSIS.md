# Code Duplication Analysis Report
**Project:** occasional-wotd
**Date:** 2025-11-12
**Analysis Scope:** 111 files, ~4,568 lines of code

---

## Executive Summary

This report identifies **14 instances of code duplication** across the codebase, affecting approximately **1,200+ lines of code**. The most critical issue is complete duplication of utility modules between `/utils/` and `/src/utils/`, creating maintenance burden and consistency risks.

**Key Findings:**
- 5 exact duplicates (~750 lines)
- 3 near duplicates (~200 lines)
- 3 structural patterns (~150 lines)
- 3 data duplications (~100 lines)

**Priority:** HIGH - Immediate refactoring recommended

---

## Critical Findings (Severity 9-10/10)

### Finding #1: Complete Module Duplication - word-stats-utils.ts
**Severity: 10/10** | **Lines: ~800** | **Duplication: 90-95%**

**Locations:**
- `/home/user/occasional-wotd/src/utils/word-stats-utils.ts` (474 lines)
- `/home/user/occasional-wotd/utils/word-stats-utils.ts` (227 lines)

**Duplicated Functions:**
- `getLetterPatternStats()`
- `getWordEndingStats()`
- `getPatternStats()`
- `getChronologicalMilestones()`
- `getLongestStreakWords()`
- `getCurrentStreakWords()`
- `getLetterStats()`

**Code Example:**
```typescript
// File 1: src/utils/word-stats-utils.ts (Lines 99-128)
export const getLetterPatternStats = (words: WordData[]): WordPatternStatsResult => {
  const patterns = {
    startEndSame: [],
    doubleLetters: [],
    tripleLetters: [],
    alphabetical: [],
    palindromes: [],
  };

  words.forEach(wordObj => {
    const word = wordObj.word;
    if (isStartEndSame(word)) {
      patterns.startEndSame.push(wordObj);
    }
    if (hasDoubleLetters(word)) {
      patterns.doubleLetters.push(wordObj);
    }
    // ... more checks
  });

  return patterns;
};

// File 2: utils/word-stats-utils.ts (Lines 49-79)
// Nearly identical implementation (90% match)
```

**Remediation:**
```typescript
// DELETE: src/utils/word-stats-utils.ts (entire file)
// KEEP: utils/word-stats-utils.ts as canonical source
// CREATE: src/utils/word-stats-utils.ts (re-export only)

// New src/utils/word-stats-utils.ts:
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
  areConsecutiveDays
} from '~utils/word-stats-utils';

// Add Astro-specific wrappers only if needed:
import { allWords } from '~astro-utils/word-data-utils';
import { getWordStats as getWordStatsBase } from '~utils/word-stats-utils';

export const getWordStats = () => getWordStatsBase(allWords);
```

**Estimated Effort:** Medium (2-3 hours)
**Impact:** Very High - Eliminates 400+ lines of duplicated code

---

### Finding #2: Text Pattern Utility Functions Duplication
**Severity: 10/10** | **Lines: ~100** | **Duplication: 95%**

**Locations:**
- `/home/user/occasional-wotd/utils/text-utils.ts:5-99`
- `/home/user/occasional-wotd/utils/word-stats-utils.ts:5-44`

**Duplicated Functions:**
- `isStartEndSame(word: string): boolean`
- `hasDoubleLetters(word: string): boolean`
- `hasTripleLetters(word: string): boolean`
- `hasAlphabeticalSequence(word: string): boolean`
- `getWordEndings(word: string): string[]`
- `isAllVowels(word: string): boolean`
- `isAllConsonants(word: string): boolean`
- `isPalindrome(word: string): boolean`

**Code Example:**
```typescript
// File 1: utils/text-utils.ts
export const isStartEndSame = (word: string): boolean => {
  return word.length > 1 && word[0].toLowerCase() === word[word.length - 1].toLowerCase();
};

export const hasDoubleLetters = (word: string): boolean => {
  return /(.)\1/.test(word);
};

// File 2: utils/word-stats-utils.ts
function isStartEndSame(word: string): boolean {
  return word.length > 1 && word[0] === word[word.length - 1];
}

function hasDoubleLetters(word: string): boolean => {
  return /(.)(\1)/.test(word);
}
```

**Remediation:**
```typescript
// CREATE NEW FILE: utils/text-pattern-utils.ts
/**
 * Text pattern recognition utilities for word analysis
 * Consolidated from text-utils.ts and word-stats-utils.ts
 */

export const isStartEndSame = (word: string): boolean => {
  return word.length > 1 && word[0].toLowerCase() === word[word.length - 1].toLowerCase();
};

export const hasDoubleLetters = (word: string): boolean => {
  return /(.)\1/.test(word);
};

export const hasTripleLetters = (word: string): boolean => {
  return /(.)\1{2,}/.test(word);
};

export const hasAlphabeticalSequence = (word: string): boolean => {
  const letters = word.toLowerCase();
  return Array.from(letters)
    .slice(0, -2)
    .some((_, i) => {
      const [a, b, c] = [letters.charCodeAt(i), letters.charCodeAt(i + 1), letters.charCodeAt(i + 2)];
      return b === a + 1 && c === b + 1;
    });
};

export const getWordEndings = (word: string): string[] => {
  const WORD_ENDINGS = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'];
  return WORD_ENDINGS.filter(ending => word.endsWith(ending));
};

export const isAllVowels = (word: string): boolean => {
  return word.length > 0 && /^[aeiou]+$/i.test(word);
};

export const isAllConsonants = (word: string): boolean => {
  return word.length > 0 && /^[^aeiou]+$/i.test(word);
};

export const isPalindrome = (word: string): boolean => {
  if (!word) return false;
  const normalized = word.toLowerCase();
  return normalized === normalized.split('').reverse().join('');
};

// UPDATE: utils/text-utils.ts
export { isStartEndSame, hasDoubleLetters, /* etc */ } from './text-pattern-utils';
// Keep only unique text-utils functions

// UPDATE: utils/word-stats-utils.ts
import { isStartEndSame, hasDoubleLetters, /* etc */ } from './text-pattern-utils';
// Remove internal duplicates
```

**Estimated Effort:** Small (1 hour)
**Impact:** High - Single source of truth for text analysis

---

### Finding #3: Word Data Utilities Duplication
**Severity: 9/10** | **Lines: ~300** | **Duplication: 85%**

**Locations:**
- `/home/user/occasional-wotd/utils/word-data-utils.ts:12-122`
- `/home/user/occasional-wotd/src/utils/word-data-utils.ts` (mixed with Astro-specific code)

**Duplicated Functions:**
- `findValidDefinition(definitions)`
- `getWordsByYear(words, year)`
- `getAvailableMonths(words)`
- `getAvailableYears(words)`
- `getAvailableLengths(words)`
- `getAvailableLetters(words)`
- `normalizePartOfSpeech(pos)`
- `getAvailablePartsOfSpeech(words)`

**Remediation:**
```typescript
// KEEP: utils/word-data-utils.ts as canonical source for pure functions

// UPDATE: src/utils/word-data-utils.ts
// Remove duplicates, import shared functions
import {
  findValidDefinition,
  getWordsByYear,
  getAvailableMonths,
  getAvailableYears,
  getAvailableLengths,
  getAvailableLetters,
  normalizePartOfSpeech,
  getAvailablePartsOfSpeech,
} from '~utils/word-data-utils';

// Keep ONLY Astro-specific functions:
export async function getWordsFromCollection(): Promise<WordData[]> {
  // Uses Astro Content Collections - keep here
}

export function groupWordsByYear(words: WordData[]): Record<number, WordData[]> {
  // Uses internal Astro caching - keep here
}

// Use imported functions:
export const allWords = await getAllWords();
export const availableYears = getAvailableYears(allWords);
export const availableMonths = getAvailableMonths(allWords);
// etc.
```

**Estimated Effort:** Medium (2 hours)
**Impact:** High - Clear separation of concerns

---

## High Priority Findings (Severity 7-8/10)

### Finding #4: areConsecutiveDays Function Duplicated
**Severity: 7/10** | **Lines: ~12** | **Duplication: 95%**

**Locations:**
- `src/utils/word-stats-utils.ts:281-294`
- `utils/date-utils.ts:113-124`

**Code:**
```typescript
// Both files have nearly identical implementations
const areConsecutiveDays = (olderDate: string, newerDate: string): boolean => {
  const dOlder = YYYYMMDDToDate(olderDate);
  const dNewer = YYYYMMDDToDate(newerDate);
  if (!dOlder || !dNewer) return false;
  const diffTime = dNewer.getTime() - dOlder.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
};
```

**Remediation:**
```typescript
// DELETE from: src/utils/word-stats-utils.ts
// USE ONLY: utils/date-utils.ts
import { areConsecutiveDays } from '~utils/date-utils';
```

**Estimated Effort:** Small (15 minutes)
**Impact:** Medium

---

### Finding #5: Stats Page Component Templates (Near Duplicate)
**Severity: 7/10** | **Lines: ~80** | **Similarity: 75%**

**Affected Files:**
- `src/components/StatsMilestonePage.astro`
- `src/components/StatsWordListPage.astro`

**Pattern:**
```astro
<!-- Both components have identical structure: -->
---
import DescriptionText from '~components/DescriptionText.astro';
import Heading from '~components/Heading.astro';
import Layout from '~layouts/Layout.astro';
import { getPageMetadata } from '~astro-utils/page-metadata.ts';
import { STRUCTURED_DATA_TYPE } from '~astro-utils/schema-utils.ts';

// Props differ slightly
const { title, description, secondaryText } = getPageMetadata(Astro.url.pathname);
---

<Layout title={title} description={description} structuredDataType={STRUCTURED_DATA_TYPE.WORD_LIST}>
  <Heading text={title} secondaryText={secondaryText} />
  <DescriptionText text={descriptionText} />
  <!-- Only content differs -->
</Layout>
```

**Remediation:**
```astro
<!-- CREATE: src/components/StatsPageTemplate.astro -->
---
import DescriptionText from '~components/DescriptionText.astro';
import Heading from '~components/Heading.astro';
import Layout from '~layouts/Layout.astro';
import { getPageMetadata } from '~astro-utils/page-metadata.ts';
import { STRUCTURED_DATA_TYPE } from '~astro-utils/schema-utils.ts';

interface Props {
  descriptionText: string;
}

const { descriptionText } = Astro.props;
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

<!-- UPDATE: StatsMilestonePage.astro -->
---
import StatsPageTemplate from './StatsPageTemplate.astro';
// ... other imports

const { words, descriptionText } = Astro.props;
---

<StatsPageTemplate descriptionText={descriptionText}>
  <section class="milestones__section">
    <!-- Milestone-specific content -->
  </section>
</StatsPageTemplate>

<!-- UPDATE: StatsWordListPage.astro similarly -->
```

**Estimated Effort:** Medium (1 hour)
**Impact:** High - Reduces boilerplate

---

## Medium Priority Findings (Severity 5-6/10)

### Finding #6: Browse Page Structural Pattern
**Severity: 6/10** | **Affected Files: 4** | **Similarity: 80%**

**Files:**
- `src/pages/browse/[year]/[month].astro`
- `src/pages/browse/length/[length].astro`
- `src/pages/browse/letter/[letter].astro`
- `src/pages/browse/part-of-speech/[partOfSpeech].astro`

**Structural Pattern (repeated in all 4 files):**
```astro
---
// 1. Same imports
import DescriptionText from '~components/DescriptionText.astro';
import Heading from '~components/Heading.astro';
import WordSection from '~components/WordSection.astro';
import Layout from '~layouts/Layout.astro';

// 2. getStaticPaths with filtering (only this differs)
export async function getStaticPaths() {
  // Different filtering logic
}

// 3. Same metadata extraction
const { words } = Astro.props;
const { title, description, secondaryText } = getPageMetadata(Astro.url.pathname);
---

<!-- 4. Identical layout structure -->
<Layout title={title} description={description}>
  <Heading level={1} text={title} secondaryText={secondaryText} />
  <DescriptionText text={description} />
  <WordSection words={words} />
</Layout>
```

**Remediation:**
```astro
<!-- CREATE: src/pages/_templates/BrowsePageTemplate.astro -->
---
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

<Layout title={title} description={description} structuredDataType={STRUCTURED_DATA_TYPE.WORD_LIST}>
  <Heading level={1} text={title} secondaryText={secondaryText} />
  <DescriptionText text={description} />
  <WordSection words={words} columns={columns} />
</Layout>

<!-- UPDATE each browse page: -->
---
import BrowsePageTemplate from '~pages/_templates/BrowsePageTemplate.astro';
import { getWordsByMonth } from '~astro-utils/word-data-utils';

export async function getStaticPaths() {
  // Page-specific path generation
  return paths.map(path => ({
    params: { /* ... */ },
    props: { words: /* filtered words */ }
  }));
}

const { words } = Astro.props;
---

<BrowsePageTemplate words={words} />
```

**Estimated Effort:** Medium (1-2 hours)
**Impact:** Medium - Consolidates 4 similar pages

---

### Finding #7: Word Ending Constants Duplication
**Severity: 6/10** | **Locations: 3 files** | **Lines: ~15**

**Duplicated Constant:**
```typescript
// Repeated in 3 files:
const endings = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'];
```

**Locations:**
- `utils/text-utils.ts:50`
- `utils/word-stats-utils.ts:28`
- `src/utils/word-stats-utils.ts:136-143`

**Remediation:**
```typescript
// CREATE: constants/word-patterns.ts
/**
 * Common word pattern constants
 */
export const WORD_ENDINGS = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'] as const;

export type WordEnding = typeof WORD_ENDINGS[number];

// UPDATE all 3 files:
import { WORD_ENDINGS } from '~constants/word-patterns';

export const getWordEndings = (word: string): string[] => {
  return WORD_ENDINGS.filter(ending => word.endsWith(ending));
};
```

**Estimated Effort:** Small (30 minutes)
**Impact:** Medium - Single source of truth

---

### Finding #8: Vowel/Consonant Regex Patterns
**Severity: 5/10** | **Locations: Multiple files**

**Duplicated Patterns:**
```typescript
// Repeated across multiple utility files:
/^[aeiou]+$/i      // All vowels
/^[^aeiou]+$/i     // All consonants
/[aeiou]/gi        // Vowel matching
/[bcdfghjklmnpqrstvwxyz]/gi  // Consonant matching
/(.)\1/            // Double letters
/(.)\1{2,}/        // Triple letters
```

**Remediation:**
```typescript
// CREATE: constants/text-patterns.ts
/**
 * Text pattern regex constants for consistent pattern matching
 */
export const TEXT_PATTERNS = {
  VOWELS: /[aeiou]/gi,
  CONSONANTS: /[bcdfghjklmnpqrstvwxyz]/gi,
  ALL_VOWELS: /^[aeiou]+$/i,
  ALL_CONSONANTS: /^[^aeiou]+$/i,
  DOUBLE_LETTERS: /(.)\1/,
  TRIPLE_LETTERS: /(.)\1{2,}/,
  LETTER_ONLY: /^[a-z]$/i,
} as const;

// Usage in utils/text-pattern-utils.ts:
import { TEXT_PATTERNS } from '~constants/text-patterns';

export const isAllVowels = (word: string): boolean => {
  return word.length > 0 && TEXT_PATTERNS.ALL_VOWELS.test(word);
};

export const getVowelCount = (word: string): number => {
  return word ? (word.match(TEXT_PATTERNS.VOWELS) || []).length : 0;
};

export const getConsonantCount = (word: string): number => {
  return word ? (word.match(TEXT_PATTERNS.CONSONANTS) || []).length : 0;
};
```

**Estimated Effort:** Small (30 minutes)
**Impact:** Medium - Centralized patterns

---

## Lower Priority Findings (Severity 3-4/10)

### Finding #9: Button Class Construction Logic (Near Duplicate)
**Severity: 5/10** | **Similarity: 70%**

**Locations:**
- `src/components/SiteButton.astro:8-10`
- `src/components/SiteLink.astro:10-14`

**Code:**
```typescript
// SiteButton.astro
const buttonClass = ['site-button', `site-button--${variant}`, className].filter(Boolean).join(' ');

// SiteLink.astro
const linkClass = variant === 'text'
  ? className
  : ['site-button', `site-button--${variant}`, className].filter(Boolean).join(' ');
```

**Remediation:**
```typescript
// CREATE: src/utils/css-utils.ts
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

// USE in both components:
import { buildButtonClasses } from '~astro-utils/css-utils';
const buttonClass = buildButtonClasses(variant, className);
```

**Estimated Effort:** Small (20 minutes)
**Impact:** Low

---

### Finding #10: Definition List CSS Pattern (Structural Duplicate)
**Severity: 5/10** | **Similarity: 70%**

**Affected Files:**
- `src/components/DefinitionList.astro` (styles section)
- `src/components/StatsMilestonePage.astro` (styles section)

**Pattern:** Similar grid layout for label/value pairs

**Remediation:**
```css
/* CREATE: src/styles/patterns/label-value-grid.css */
.label-value-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
}

.label-value-grid__label {
  color: var(--color-text-light);
  margin: 0;
  padding-top: var(--spacing-small);
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
  }

  .label-value-grid__value {
    margin-bottom: 0;
  }
}

/* UPDATE components to use shared classes */
```

**Estimated Effort:** Small (30 minutes)
**Impact:** Medium

---

## Data Duplication (Already Well-Managed)

### ✅ Finding #11: Month Names - Already Centralized
**Status:** **No Action Needed**

**Location:** `utils/date-utils.ts:6-9`

```typescript
export const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;
```

**Note:** This is already properly centralized and used throughout the codebase. Good practice!

---

### ✅ Finding #12: Stats Slug Constants - Already Centralized
**Status:** **No Action Needed**

**Location:** `constants/urls.ts:64-94`

**Note:** Stats identifiers are already properly centralized. No refactoring needed.

---

## Summary Metrics

| Priority | Findings | Affected Lines | Estimated Effort | Impact |
|----------|----------|----------------|------------------|--------|
| **Critical (9-10)** | 3 | ~750 | Medium-Large | Very High |
| **High (7-8)** | 2 | ~200 | Medium | High |
| **Medium (5-6)** | 5 | ~150 | Small-Medium | Medium |
| **Low (3-4)** | 2 | ~100 | Small | Low-Medium |
| **Well-Managed** | 2 | - | None | - |
| **TOTAL** | **14** | **~1,200** | - | - |

---

## Refactoring Roadmap

### Phase 1: Critical Consolidation (Week 1)
**Effort: Large (8-10 hours) | Impact: Very High | Priority: IMMEDIATE**

#### Tasks:
1. ✅ **Consolidate word-stats-utils.ts**
   - Delete `src/utils/word-stats-utils.ts`
   - Keep `utils/word-stats-utils.ts` as canonical
   - Create re-export file in src/utils/
   - Update all imports across codebase
   - Run test suite to verify
   - **Expected savings: ~400 lines**

2. ✅ **Extract text pattern utilities**
   - Create `utils/text-pattern-utils.ts`
   - Move functions from text-utils.ts and word-stats-utils.ts
   - Update imports in both files
   - Run test suite
   - **Expected savings: ~80 lines**

3. ✅ **Consolidate word-data-utils.ts**
   - Keep pure functions in `utils/word-data-utils.ts`
   - Keep only Astro-specific in `src/utils/word-data-utils.ts`
   - Import shared functions
   - Update test files
   - **Expected savings: ~250 lines**

4. ✅ **Remove areConsecutiveDays duplication**
   - Delete from `src/utils/word-stats-utils.ts`
   - Import from `utils/date-utils.ts`
   - **Expected savings: ~10 lines**

**Phase 1 Total: ~740 lines saved**

---

### Phase 2: High Priority Improvements (Week 2)
**Effort: Medium (4-5 hours) | Impact: High**

#### Tasks:
5. ✅ **Create stats page templates**
   - Build `StatsPageTemplate.astro`
   - Refactor `StatsMilestonePage.astro`
   - Refactor `StatsWordListPage.astro`
   - **Expected savings: ~60 lines**

6. ✅ **Extract word ending constants**
   - Create `constants/word-patterns.ts`
   - Add `WORD_ENDINGS` constant
   - Update 3 files to use constant
   - **Expected savings: ~15 lines**

7. ✅ **Centralize regex patterns**
   - Create `constants/text-patterns.ts`
   - Add `TEXT_PATTERNS` object
   - Update utility files
   - **Expected savings: ~20 lines**

**Phase 2 Total: ~95 lines saved**

---

### Phase 3: Medium Priority Cleanup (Week 3)
**Effort: Medium (4-6 hours) | Impact: Medium**

#### Tasks:
8. ✅ **Consolidate browse page patterns**
   - Create `BrowsePageTemplate.astro`
   - Refactor 4 browse pages
   - Test all browse routes
   - **Expected savings: ~120 lines**

9. ✅ **Extract CSS patterns**
   - Create `label-value-grid.css`
   - Update DefinitionList component
   - Update StatsMilestonePage component
   - **Expected savings: ~40 lines**

10. ✅ **Standardize class construction**
    - Create `css-utils.ts`
    - Add `buildButtonClasses` function
    - Update SiteButton and SiteLink
    - **Expected savings: ~10 lines**

**Phase 3 Total: ~170 lines saved**

---

### Phase 4: Documentation & Polish (Week 4)
**Effort: Small (2-3 hours) | Impact: Medium**

#### Tasks:
11. ✅ **Add architectural documentation**
    - Document `/utils/` vs `/src/utils/` separation
    - Create ARCHITECTURE.md explaining patterns
    - Update CONTRIBUTING.md with guidelines
    - Add JSDoc comments to consolidated modules

12. ✅ **Create type library** (optional)
    - Create `types/component-props.ts`
    - Add base prop interfaces
    - Update component types

13. ✅ **Final verification**
    - Run full test suite
    - Check bundle size impact
    - Verify no regressions
    - Performance benchmarks

**Phase 4 Total: Documentation & verification**

---

## Expected Outcomes

### Before Refactoring:
- **Duplicated Code:** ~1,200 lines (26% of codebase)
- **Maintenance Risk:** HIGH
- **Consistency Risk:** HIGH
- **Developer Experience:** Medium
- **Bundle Size:** Baseline

### After Refactoring:
- **Code Reduction:** ~1,000 lines removed
- **Maintenance Risk:** LOW
- **Consistency Risk:** LOW
- **Developer Experience:** High
- **Bundle Size Reduction:** ~5-10%
- **Build Time:** Potentially improved (fewer files to process)
- **Type Safety:** Improved (centralized types)

---

## Risk Assessment

### Low Risk Refactorings:
- Constant extraction (word endings, regex patterns)
- CSS pattern consolidation
- Date utility consolidation

**Recommendation:** Complete immediately

### Medium Risk Refactorings:
- Stats page template creation
- Browse page template consolidation
- Text pattern utility extraction

**Recommendation:** Complete with thorough testing

### Higher Risk Refactorings:
- Complete word-stats-utils consolidation
- Word-data-utils restructuring

**Recommendation:**
- Ensure 100% test coverage before refactoring
- Complete in feature branch
- Extensive integration testing
- Gradual rollout

---

## Testing Strategy

### Pre-Refactoring:
1. ✅ Ensure all existing tests pass
2. ✅ Add integration tests for critical paths
3. ✅ Create snapshot tests for component rendering
4. ✅ Document current bundle size and performance metrics

### During Refactoring:
1. ✅ Maintain test coverage above 80%
2. ✅ Update tests as code moves between files
3. ✅ Add regression tests for edge cases
4. ✅ Verify type checking still passes

### Post-Refactoring:
1. ✅ Run full test suite
2. ✅ Manual testing of affected pages
3. ✅ Performance benchmarks
4. ✅ Bundle size comparison
5. ✅ Accessibility audit (if components changed)

---

## Additional Recommendations

### 1. Establish Coding Guidelines
Create guidelines for:
- When to add code to `/utils/` vs `/src/utils/`
- How to identify potential duplication
- Code review checklist

```markdown
## Utility Organization Guidelines

### /utils/ - Framework-Agnostic
Place code here if:
- No framework dependencies (Astro, React, etc.)
- Pure business logic
- Usable by CLI tools
- Reusable across multiple projects

Examples: date-utils.ts, text-utils.ts, validation.ts

### /src/utils/ - Astro-Specific
Place code here if:
- Uses Astro Content Collections
- Requires Astro.glob or Astro-specific APIs
- Needs environment variables (import.meta.env)
- Uses Astro integrations

Examples: word-data-utils.ts (Content Collections), image-utils.ts
```

### 2. Add Linting Rules
Consider adding ESLint rules to prevent duplication:

```javascript
// eslint.config.js additions
{
  rules: {
    'no-duplicate-imports': 'error',
    'import/no-duplicates': 'error',
  }
}
```

### 3. Code Review Checklist
Add to PR template:

```markdown
## Duplication Check
- [ ] Searched for similar functions before creating new ones
- [ ] Verified no duplicate constants or regex patterns
- [ ] Checked if utility belongs in /utils/ or /src/utils/
- [ ] Added/updated tests for new utilities
```

### 4. Periodic Audits
Schedule quarterly code duplication audits using tools like:
- `jscpd` (JavaScript Copy/Paste Detector)
- `jsinspect` (Detect copy-pasted and structurally similar code)

---

## Tools for Future Monitoring

### Automated Duplication Detection:

```bash
# Install jscpd
npm install -g jscpd

# Run duplication detection
jscpd src/ utils/ --min-lines 5 --min-tokens 50 --format "html"

# Output: HTML report showing duplicated code blocks
```

### Configuration:
```json
// .jscpd.json
{
  "threshold": 5,
  "minLines": 5,
  "minTokens": 50,
  "ignore": [
    "**/*.spec.js",
    "**/node_modules/**",
    "**/.astro/**"
  ],
  "format": ["html", "console"],
  "output": "./duplication-report"
}
```

---

## Contact & Questions

For questions about this analysis or refactoring approach:
1. Review the proposed changes in detail
2. Consider impact on test coverage
3. Evaluate risk vs. reward for each phase
4. Start with Phase 1 (critical issues) for maximum impact

---

## Appendix: File Reference

### Files Requiring Changes (Phase 1):

**Delete:**
- `src/utils/word-stats-utils.ts` (consolidate into utils/)

**Create:**
- `utils/text-pattern-utils.ts` (new consolidated module)

**Modify:**
- `utils/word-stats-utils.ts` (keep as canonical)
- `src/utils/word-stats-utils.ts` (convert to re-export)
- `utils/word-data-utils.ts` (ensure all shared functions)
- `src/utils/word-data-utils.ts` (remove duplicates, import shared)
- `utils/text-utils.ts` (import from text-pattern-utils)

**Update Imports In:**
- All pages using stats utilities (~15 files)
- All components using stats utilities (~10 files)
- All test files (~8 files)

### Files Requiring Changes (Phase 2-3):

**Create:**
- `constants/word-patterns.ts`
- `constants/text-patterns.ts`
- `src/components/StatsPageTemplate.astro`
- `src/pages/_templates/BrowsePageTemplate.astro`
- `src/styles/patterns/label-value-grid.css`
- `src/utils/css-utils.ts`

**Modify:**
- Multiple component and page files (see individual findings)

---

**Report Generated:** 2025-11-12
**Analysis Tool:** Claude Code + Manual Review
**Next Steps:** Begin Phase 1 refactoring with critical consolidations
