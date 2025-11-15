# Testing Coverage Analysis - Evan's Audit

**Date:** 2025-11-15
**Baseline Performance:** 10.6 seconds wall-clock, 7.76s test execution
**Current Coverage:** 31.67% (WELL BELOW 80% threshold!)
**Tests:** 350 tests across 18 files, all passing

## Critical Issues

### 1. Coverage Thresholds Not Enforced ❌
**Problem:** vitest.config.js specifies 80% thresholds but builds pass with 31.67% coverage
**Impact:** No enforcement = meaningless thresholds
**Root Cause:** Vitest v3.2.4 may require explicit `--coverage.thresholds.autoUpdate=false` or coverage thresholds only apply when `--coverage` flag is used
**Fix Required:** Modify package.json to enforce thresholds in CI/CD

### 2. Two Tests Consume 91% of Execution Time ⚠️
**Bottleneck #1:** `tests/tools/cli-integration.spec.js` - **5.5 seconds**
- Single test "tools can be imported without astro: protocol errors" takes 4.7s (98% of suite time)
- Sequential dynamic imports of tools that execute top-level code
- **Optimization:** Parallelize imports with `Promise.all()`

**Bottleneck #2:** `tests/utils/page-metadata-utils.spec.js` - **3.3 seconds**
- Test "handles BASE_PATH prefixes" takes 3.4s
- Dynamic imports of Astro utility modules are expensive
- **Optimization:** Consider mocking or caching module imports

**Combined Impact:** 8.8 seconds out of 9.69 seconds total test time

### 3. Seven Files with 0% or Near-Zero Coverage 📊
Missing or inadequate tests for:

#### Untested Files (0% coverage):
1. **src/utils/build-utils.ts** (27 lines)
   - `getBuildData()` - Build metadata generation
   - Pure function, easily testable

2. **src/utils/image-utils.ts** (32 lines)
   - `getSocialImageUrl()` - Social image path generation
   - `getStaticPages()` - Static page metadata
   - Simple utilities, should have 100% coverage

3. **src/utils/schema-utils.ts** (140 lines)
   - `getWebsiteSchemaData()` - Schema.org website data
   - `getWordSchemaData()` - Word definition schema
   - `getCollectionSchemaData()` - Collection page schema
   - `getBreadcrumbSchema()` - Breadcrumb navigation schema
   - Critical for SEO, must be tested

4. **src/utils/seo-utils.ts** (76 lines)
   - `getMetaDescription()` - Meta description generation
   - `generateSeoMetadata()` - Complete SEO metadata
   - Critical for SEO, must be tested

5. **src/utils/static-file-utils.ts** (276 lines)
   - Large file with 0% coverage
   - Static file generation utilities
   - High priority for testing

6. **src/utils/static-paths-utils.ts** (163 lines)
   - Static path generation logic
   - Complex file with 0% coverage
   - High priority for testing

#### Partially Tested (Low Coverage):
7. **src/utils/sentry-client.ts** (47 lines, 10.71% coverage)
   - Error tracking initialization
   - Requires environment-specific mocking

## Coverage by Module

| Module | Files | % Stmts | % Branch | % Funcs | % Lines | Status |
|--------|-------|---------|----------|---------|---------|--------|
| **adapters** | 2 | 55.47% | 90.32% | 62.5% | 55.47% | 🟡 Needs improvement |
| **config** | 1 | 100% | 100% | 100% | 100% | ✅ Excellent |
| **src/utils** | 12 | 40.35% | 77.64% | 52.8% | 40.35% | 🔴 **Critical gap** |
| **tools** | 7 | 20.27% | 26.19% | 45.45% | 20.27% | 🔴 **Critical gap** |

## Well-Tested Files ✅
- `config/paths.ts` - 100%
- `tools/help-utils.ts` - 100%
- `src/utils/page-metadata.ts` - 100%
- `src/utils/word-data-utils.ts` - 90.59%
- `adapters/index.ts` - 100%

## Poorly-Tested Files 🔴
- All files in tools/ except help-utils.ts
- 7 src/utils files listed above
- Most src/pages files (acceptable - tested via E2E)

## Performance Metrics

### Test Execution Time Breakdown
```
Total Duration: 7.76s
├─ tests/tools/cli-integration.spec.js: 5.52s (71%)
│  └─ "tools can be imported...": 4.70s (98% of suite)
├─ tests/utils/page-metadata-utils.spec.js: 3.26s (42%)
│  └─ "handles BASE_PATH prefixes": 3.18s (98% of suite)
└─ All other tests: 0.98s (13%)
```

### Test Categories by Speed
- **Fast tests** (<100ms): 16 test files - Architecture, unit, utils
- **Slow tests** (>1s): 2 test files - CLI integration, Astro module loading
- **Average test speed**: 22ms per test (excluding the two outliers)

## Action Items

### Priority 1: Coverage Enforcement (Blocker)
- [ ] Fix Vitest config to actually enforce coverage thresholds
- [ ] Add `npm run test:ci` script that enforces coverage
- [ ] Update AGENTS.md to mandate `npm run test:coverage` in quality gates

### Priority 2: Fill Coverage Gaps
- [ ] Create tests/utils/build-utils.spec.js
- [ ] Create tests/utils/image-utils.spec.js
- [ ] Create tests/utils/schema-utils.spec.js
- [ ] Create tests/utils/seo-utils.spec.js
- [ ] Create tests/utils/static-file-utils.spec.js
- [ ] Create tests/utils/static-paths-utils.spec.js
- [ ] Improve tests/utils/sentry-client.spec.js (or create if missing)

### Priority 3: Performance Optimization
- [ ] Parallelize tool imports in cli-integration.spec.js (4.7s → ~2s estimated)
- [ ] Optimize Astro module loading in page-metadata-utils.spec.js
- [ ] Add test:unit, test:integration, test:arch scripts for targeted runs

### Priority 4: Raise Thresholds
- [ ] Once gaps filled, increase thresholds from 80% to 90%
- [ ] Set per-file thresholds for critical files (100% for utils)

### Priority 5: Documentation
- [ ] Update docs/technical.md "Testing Strategy" section
- [ ] Update docs/README.md with testing quick start
- [ ] Document when to use each test script
- [ ] Add coverage summary to README

## Estimated Impact

### Coverage Improvement
- Current: 31.67% overall
- After filling gaps: ~85-90% estimated
- Target: ≥90% for all metrics

### Performance Improvement
- Current: 10.6s wall-clock, 7.76s test time
- After optimization: ~6s wall-clock, ~4s test time estimated
- Improvement: ~40% faster

### Developer Experience
- Targeted test scripts for fast iteration
- Clear documentation on when to run what
- Actual enforcement preventing coverage regressions
- Measurable quality gates

## Notes

### Why Coverage Is So Low
The current 31.67% coverage is misleading:
- Many src/pages files have 0% coverage (acceptable - tested via build/E2E)
- Large untested files in src/utils and tools/ drag down average
- Well-tested modules (config, core utils) have excellent coverage
- The gap is concentrated in specific modules, not spread evenly

### Known Acceptable Gaps
- `src/content.config.ts` - Build-time only, tested via Astro build
- `src/pages/*.ts` - API routes tested via integration/build tests
- Some tool files - Complex CLI tools better suited for E2E testing

### Regression Prevention
The architecture and CLI integration tests are excellent regression prevention:
- Detect astro: protocol violations immediately
- Enforce import boundaries between utils/ and ~astro-utils/*
- Prevent duplicate words and date violations
- These are more valuable than raw coverage % for certain issues
