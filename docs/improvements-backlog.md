# Technical Improvements Backlog

## Implementation Gaps

**Client-Side Search**
- src/pages/words.json.ts endpoint exists
- No search component implementation
- No fuzzy search functionality

**Cross-Page Navigation Links**
- src/pages/word/[word].astro lacks contextual discovery links
- Missing "Other X-letter words" links
- Missing "Words from [Month Year]" navigation
- Missing "More words starting with [letter]" suggestions

**Word Discovery Enhancement**
- No implementation of word filtering by multiple criteria
- Browse page lacks visual hierarchy for discovery
- Missing word relationship suggestions (similar length, same starting letter)

**SEO Internal Linking**
- No systematic internal linking between related content
- Missing contextual navigation between word attributes
- No breadcrumb implementation for deep navigation

**Build Performance**
- Multiple getStaticPaths functions independently load word collections
- No shared data caching between route generation
- Stats calculations without pre-computation

**Test Coverage** (Updated 2025-11-15 - Significant Progress!)
- ✅ COMPLETED: tests/src/utils/build-utils.spec.js (100% coverage)
- ✅ COMPLETED: tests/src/utils/image-utils.spec.js (100% coverage)
- ✅ COMPLETED: tests/src/utils/schema-utils.spec.js (100% coverage)
- ✅ COMPLETED: tests/src/utils/seo-utils.spec.js (100% coverage)
- ✅ COMPLETED: Coverage threshold enforcement via npm run test:coverage-check
- ✅ COMPLETED: Added test:unit, test:integration, test:arch scripts
- ⚠️ REMAINING: src/utils/static-file-utils.ts (276 lines, 0%)
- ⚠️ REMAINING: src/utils/static-paths-utils.ts (163 lines, 0%)
- ⚠️ REMAINING: src/utils/sentry-client.ts (47 lines, 10.71%)
- **Coverage improved from 31.67% → 57.13% (+25.5%)**
- **Tests increased from 350 → 404 (+54 tests)**

**Error Handling**
- 117 instances of mixed patterns (throw/return null/console.log)
- No standardized error types
- No error handling utilities

**HTML/SEO Technical Issues**
- src/layouts/Layout.astro:117-119 contains three redundant hreflang tags
- src/components/StructuredData.astro:60 hardcodes numberOfItems: 0
- src/components/Header.astro lacks semantic nav element

**Performance Monitoring**
- No build-time performance tracking
- No bundle size analysis in CI/CD
- No metrics for static generation efficiency

## Documentation Gaps

**Undocumented Environment Variables**
- SITE_DESCRIPTION, SITE_ID, SITE_LOCALE not in technical.md
- GA_MEASUREMENT_ID, GA_ENABLED not in technical.md
- HUMANS_* variables not in technical.md

**Architecture Decisions Lacking Documentation**
- utils/word-data-utils.ts vs src/utils/word-data-utils.ts difference not explained
- Caching strategy in src/utils/word-data-utils.ts:72-83 undocumented
- Build-time vs runtime data loading patterns not clarified

**Content Collections Integration**
- Dynamic path injection via __WORD_DATA_PATH__ undocumented
- Collection loading patterns for different environments not covered
- Error handling for missing or malformed word data not documented

**Environment Variable Processing**
- astro.config.mjs defines 40+ build-time variables
- Processing logic for defaults and validation undocumented
- Relationship between env vars and __VARIABLE__ defines not explained

## Migration Opportunities

**Astro 5 Features Available**
- Content Layer API not utilized (5x faster builds)
- Responsive image component not used
- Type-safe environment variables not implemented

---

# Prompt for Next Agent

## Task: Implement Client-Side Search

### Context
The codebase is a static word-of-the-day site generator powering wordbug.fyi and wordbun.fyi. A JSON endpoint with all word names exists at src/pages/words.json.ts but no search functionality uses it.

### Requirements
1. Create a lightweight search component that uses the existing /words.json endpoint
2. Implement fuzzy search for word discovery
3. Add the search to the browse page (src/pages/words/browse.astro)
4. Keep it minimal - vanilla JS, no heavy dependencies
5. Ensure it works with the lowercase aesthetic

### Files to Modify
- Create: src/components/WordSearch.astro
- Update: src/pages/words/browse.astro to include search
- Existing endpoint: src/pages/words.json.ts (returns array of word strings)

### Success Criteria
- Users can type partial word matches
- Results update as they type
- Clicking a result navigates to that word's page
- Works without JavaScript (graceful degradation)
- Maintains the site's minimalist design