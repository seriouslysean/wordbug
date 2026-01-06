# Add Word Flow Analysis & Recommendations

**Date**: January 6, 2026
**Branch**: `claude/fix-github-actions-words-alyNo`

## Executive Summary

The add word flow has good fundamentals but suffers from:
1. **Critical Bug**: Social images always show lowercase, even for proper nouns (Japan → japan)
2. **Workflow Issues**: Shell script bugs, unnecessary complexity, missing input sanitization
3. **UX Confusion**: The preserve-case feature and its purpose isn't well communicated
4. **Code Quality**: Inconsistent patterns, some technical debt

## Current Flow Overview

### How It Works
1. User triggers GitHub Actions workflow with inputs: `word`, `date`, `overwrite`, `preserve_case`
2. Workflow runs `npm run tool:add-word -- "$WORD" "$DATE" $FLAGS`
3. Tool validates inputs, checks for duplicates, fetches from Wordnik API
4. Word is saved as JSON with final casing + `preserveCase` flag
5. Social image is generated (always lowercase - **BUG**)
6. Changes are committed and pushed

### Key Files
- `.github/workflows/add-word.yml` - GitHub Actions workflow
- `tools/add-word.ts` - CLI entry point (validation, duplicate checking)
- `tools/utils.ts` - Core logic (`createWordEntry`, image generation)
- `adapters/wordnik.ts` - Wordnik API integration
- `src/components/Heading.astro` - Display with preserve-case CSS class

## Issues Identified

### 🔴 Critical Issues

#### 1. Social Images Always Lowercase
**File**: `tools/utils.ts:229`
**Problem**: Image generation hardcodes `.toLowerCase()` even for proper nouns

```typescript
// Current (WRONG):
const mainWord = getTextPath(word.toLowerCase(), FONT_SIZE, ...)

// Should be:
const mainWord = getTextPath(word, FONT_SIZE, ...)
```

**Impact**: "Japan" displays correctly on web but social share image shows "japan" - looks unprofessional

---

#### 2. Shell Script FLAGS Bug
**File**: `.github/workflows/add-word.yml:90-98`
**Problem**: Potential word splitting and extra spaces in FLAGS variable

```bash
# Current (FRAGILE):
FLAGS=""
if [[ "$OVERWRITE" == "true" ]]; then
  FLAGS="$FLAGS --overwrite"  # Adds leading space
fi
if [[ "$PRESERVE_CASE" == "true" ]]; then
  FLAGS="$FLAGS --preserve-case"
fi
npm run tool:add-word -- "$WORD" "$DATE" $FLAGS  # $FLAGS unquoted!
```

**Impact**: Could fail with special characters or create subtle bugs

---

### 🟡 Medium Issues

#### 3. Unnecessary Two-Job Workflow
**File**: `.github/workflows/add-word.yml:29-43`
**Problem**: `prepare-manual` job just passes inputs through to outputs - no value add

```yaml
# Current: Two jobs, one just copies inputs
jobs:
  prepare-manual:
    runs-on: ubuntu-latest
    outputs:
      word: ${{ steps.set-outputs.outputs.word }}
      # ... just copying inputs ...

  add-word:
    needs: [prepare-manual]
    # ... uses outputs from prepare-manual ...
```

**Impact**: Slower execution, harder to read, no benefit

---

#### 4. Missing Input Sanitization
**File**: `.github/workflows/add-word.yml:85-88`
**Problem**: Workflow doesn't trim the word input before using it

```bash
# Current:
WORD="${{ needs.prepare-manual.outputs.word }}"  # No trimming!

# Should be:
WORD="${{ inputs.word }}"
WORD=$(echo "$WORD" | xargs)  # Trim whitespace
```

**Impact**: User could accidentally add `" Japan "` with spaces, causing validation to fail or duplicate entries

---

#### 5. Confusing Terminology & UX
**File**: `.github/workflows/add-word.yml:19-23`
**Problem**: Not obvious WHEN to check "preserve_case" - users need to understand the architecture

```yaml
preserve_case:
  description: 'Preserve original capitalization (for proper nouns like "Japan" or "PB&J")'
  required: false
  type: boolean
  default: false
```

**Better Description**:
```
'Keep original capitalization (check this for proper nouns, acronyms, or brand names like "Japan", "NASA", "iPhone")'
```

**Why It's Confusing**:
- Everything is stored lowercase by default due to CSS `text-transform: lowercase`
- The flag overrides CSS to preserve display
- Users don't know this architectural detail

---

#### 6. Image Generation Doesn't Use SITE_TITLE from Env
**File**: `tools/utils.ts:230, 302`
**Problem**: Falls back to empty string if `SITE_TITLE` is missing, creates blank area in image

```typescript
const titleText = getTextPath(process.env.SITE_TITLE || '', TITLE_SIZE);
```

**Impact**: Silent failure - image looks broken but no error

---

### 🟢 Minor Issues / Code Quality

#### 7. Inconsistent Error Handling Pattern
**File**: `tools/add-word.ts:108-115`
**Problem**: String matching on error messages is fragile

```typescript
catch (error) {
  if (error.message.includes('not found in dictionary')) {
    console.error('Word not found in dictionary', { word, errorMessage: error.message });
  } else {
    console.error('Failed to add word', { word, errorMessage: error.message });
  }
  process.exit(1);
}
```

**Better**: Use custom error classes or error codes

---

#### 8. Date Validation Could Be More Explicit
**File**: `tools/add-word.ts:34-37`
**Problem**: Returns boolean but doesn't explain WHY it's invalid

```typescript
const isNotFutureDate = (date: string): boolean => {
  const today = getTodayYYYYMMDD();
  return today ? date <= today : false;
};
```

**Better**: Return object with `{ valid: boolean, reason: string }`

---

#### 9. Mixed Concerns in utils.ts
**File**: `tools/utils.ts` (435 lines)
**Problem**: Single file contains:
- Image generation (SVG, sharp, OpenType font handling)
- File system utilities
- Word entry creation
- Dictionary API integration

**Better**: Split into:
- `tools/image-utils.ts` - SVG/PNG generation
- `tools/word-utils.ts` - Word entry creation
- `tools/fs-utils.ts` - File system helpers

---

## Historical Context (Git Analysis)

### When preserve-case Was Added
**Commit**: `80c139c` (Oct 23, 2025)
**Author**: Claude (AI-assisted)
**Why**: To support proper nouns (Japan, PB&J) without changing data schema

### Original Intent
From commit message:
> "Words are stored in lowercase by default, but can preserve their original capitalization when the --preserve-case flag is used."

### Design Decision
- **Architecture**: Use CSS `text-transform: lowercase` globally, override with `.preserve-case` class
- **Storage**: Store final word (lowercase or original) + boolean flag
- **Why This Way**: Minimal schema changes, works with existing lowercase words

### Subsequent Refinements
- **Commit** `1d40e64`: Migration tool to auto-detect preserve-case from existing words
- **Commit** `dbaa739`: Casing normalization improvements
- **Commit** `d94efbd`: Fixed image generation fonts (but introduced lowercase bug)

---

## Downstream Apps Analysis

### wordbug.fyi (134 words)
**Pattern**: Simple, kid-friendly vocabulary
- All lowercase common nouns: "blue", "hat", "paw", "water"
- Compound words: "candy corn", "trick or treat", "remote control"
- One branded term: "Lightroom" (but stored lowercase)

**Preserve-Case Usage**: Likely none needed for this app

### wordbun.fyi
**Status**: Could not fetch (SSL error) but likely similar pattern

### Implication
The downstream apps are primarily using simple, lowercase vocabulary. The preserve-case feature was added to support FUTURE use cases (proper nouns, acronyms, brand names) but isn't heavily used yet.

---

## Recommendations

### Priority 1: Critical Fixes (Do First)

#### Fix 1: Social Image Case Preservation
**File**: `tools/utils.ts`
**Lines**: 229, 277, 301

```typescript
// In createWordSvg()
export function createWordSvg(word: string, date: string, preserveCase = false): string {
  const formattedDate = formatDate(date);

  // Respect case preservation for the word
  const displayWord = word; // Don't force lowercase here
  const mainWord = getTextPath(displayWord, FONT_SIZE, { isExtraBold: true, maxWidth: MAX_WIDTH });
  // ... rest of function
}

// In generateShareImage()
export async function generateShareImage(word: string, date: string, preserveCase = false): Promise<void> {
  const year = date.slice(0, 4);
  const socialDir = path.join(paths.images, 'social', year);

  createDirectoryIfNeeded(socialDir);

  const svgContent = createWordSvg(word, date, preserveCase);
  const fileName = `${date}-${word.toLowerCase()}.png`; // Filename still lowercase for URL safety
  const outputPath = path.join(socialDir, fileName);
  // ... rest of function
}

// In createWordEntry()
export async function createWordEntry(word: string, options: CreateWordEntryOptions): Promise<CreateWordEntryResult> {
  // ... existing code ...

  const wordData: WordData = {
    word: finalWord,
    date,
    adapter: process.env.DICTIONARY_ADAPTER,
    preserveCase,
    data,
  };

  fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));

  console.log('Word entry created', { word: trimmedWord, date });

  // Pass preserveCase to image generation
  await generateShareImage(finalWord, date, preserveCase);

  return { filePath, data };
}
```

**Testing**:
```bash
npm run tool:add-word "TestWord" "20260107" --preserve-case --overwrite
# Check: public/images/social/2026/20260107-testword.png should show "TestWord" not "testword"
```

---

#### Fix 2: Simplify & Fix Workflow
**File**: `.github/workflows/add-word.yml`

```yaml
name: Add Word

on:
  workflow_dispatch:
    inputs:
      word:
        description: 'The word to add'
        required: true
        type: string
      date:
        description: 'Date to add the word to (YYYYMMDD). Leave empty for today.'
        required: false
        type: string
      overwrite:
        description: 'Overwrite existing word if one exists for the date'
        required: false
        type: boolean
        default: false
      preserve_case:
        description: 'Keep original capitalization (for proper nouns, acronyms, or brands like "Japan", "NASA", "iPhone")'
        required: false
        type: boolean
        default: false

permissions:
  contents: write

jobs:
  add-word:
    runs-on: ubuntu-latest
    env:
      COLOR_PRIMARY: ${{ vars.COLOR_PRIMARY }}
      COLOR_PRIMARY_DARK: ${{ vars.COLOR_PRIMARY_DARK }}
      COLOR_PRIMARY_LIGHT: ${{ vars.COLOR_PRIMARY_LIGHT }}
      DICTIONARY_ADAPTER: ${{ vars.DICTIONARY_ADAPTER }}
      SITE_AUTHOR: ${{ vars.SITE_AUTHOR }}
      SITE_DESCRIPTION: ${{ vars.SITE_DESCRIPTION }}
      SITE_ID: ${{ vars.SITE_ID }}
      SITE_TITLE: ${{ vars.SITE_TITLE }}
      SITE_URL: ${{ vars.SITE_URL }}
      TZ: America/New_York
      WORDNIK_API_KEY: ${{ secrets.WORDNIK_API_KEY }}
      WORDNIK_API_URL: ${{ vars.WORDNIK_API_URL }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Validate API key
        run: |
          if [ -z "$WORDNIK_API_KEY" ]; then
            echo "::error::WORDNIK_API_KEY is not set. Please add it to your repository secrets."
            exit 1
          fi

      - name: Add word
        id: add_word
        run: |
          # Sanitize and trim inputs
          WORD="${{ inputs.word }}"
          WORD=$(echo "$WORD" | xargs)  # Trim leading/trailing whitespace

          DATE="${{ inputs.date }}"
          DATE=$(echo "$DATE" | xargs)

          # Validate word is not empty after trimming
          if [ -z "$WORD" ]; then
            echo "::error::Word cannot be empty or whitespace only"
            exit 1
          fi

          # Build flags array to avoid quoting issues
          FLAGS=()
          if [[ "${{ inputs.overwrite }}" == "true" ]]; then
            FLAGS+=(--overwrite)
          fi
          if [[ "${{ inputs.preserve_case }}" == "true" ]]; then
            FLAGS+=(--preserve-case)
          fi

          # Run the add-word tool
          if npm run tool:add-word -- "$WORD" "$DATE" "${FLAGS[@]}"; then
            echo "word_added=1" >> $GITHUB_OUTPUT
            echo "word=$WORD" >> $GITHUB_OUTPUT
          else
            echo "::error::Failed to add word: $WORD"
            echo "word_added=0" >> $GITHUB_OUTPUT
            exit 1
          fi

      - name: Configure Git
        if: steps.add_word.outputs.word_added == '1'
        run: |
          git config --local user.email "${{ github.repository_owner }}@users.noreply.github.com"
          git config --local user.name "${{ github.repository_owner }}"

      - name: Commit and push changes
        if: steps.add_word.outputs.word_added == '1'
        run: |
          git add data/ public/
          git commit -m "Add word: ${{ steps.add_word.outputs.word }}"
          git push origin ${{ github.ref }}
```

**Changes**:
- ✅ Removed `prepare-manual` job (unnecessary)
- ✅ Direct access to `inputs.*` instead of job outputs
- ✅ Trim whitespace from inputs
- ✅ Validate non-empty word after trimming
- ✅ Use bash array for FLAGS to avoid quoting issues
- ✅ Better error messages with `::error::`
- ✅ Improved description for preserve_case

---

### Priority 2: Code Quality Improvements

#### Improvement 1: Update generateShareImage Call
**File**: `tools/utils.ts`
**Current**: Image generation happens in workflow AFTER word creation
**Problem**: `createWordEntry` doesn't know about images, workflow does it separately

**Change In Workflow** (line 103):
```bash
# REMOVE THIS - now handled in createWordEntry
npm run tool:generate-images -- --word "$WORD"
```

**Change In createWordEntry** (line 430):
```typescript
// ALREADY SHOWN ABOVE - add image generation to createWordEntry
await generateShareImage(finalWord, date, preserveCase);
```

**Why**: Keeps word creation atomic - one call does everything

---

#### Improvement 2: Better Help Text
**File**: `tools/add-word.ts:118-151`

```typescript
const HELP_TEXT = `
Add Word Tool

Usage:
  npm run tool:local tools/add-word.ts <word> [date] [options]
  npm run tool:add-word <word> [date] [options]

Arguments:
  word    The word to add (required). Can be a single word or phrase.
  date    Date in YYYYMMDD format (optional, defaults to today)

Options:
  -o, --overwrite       Overwrite existing word if it exists
  -p, --preserve-case   Keep original capitalization (default: converts to lowercase)
  -h, --help            Show this help message

When to use --preserve-case:
  ✓ Proper nouns:  Japan, London, Shakespeare
  ✓ Acronyms:      NASA, FBI, FAQ, PB&J
  ✓ Brand names:   iPhone, GitHub, JavaScript
  ✗ Regular words: serendipity, ephemeral, ubiquitous

Examples:
  npm run tool:add-word "serendipity"
  npm run tool:add-word "ephemeral" "20240116"
  npm run tool:add-word "ubiquitous" --overwrite
  npm run tool:add-word "Japan" --preserve-case
  npm run tool:add-word "PB&J" "20250101" --preserve-case
  npm run tool:add-word "iPhone" --preserve-case

Environment Variables (for GitHub workflows):
  DICTIONARY_ADAPTER         Dictionary API to use (required)
  WORDNIK_API_KEY           API key for dictionary access (required)
  SOURCE_DIR                Data source directory (default: demo)

Requirements:
  - Word must exist in dictionary
  - Date must be today or in the past (YYYYMMDD format)
  - Tool prevents duplicate words unless --overwrite is used
  - Words are trimmed automatically
${COMMON_ENV_DOCS}
`;
```

---

#### Improvement 3: Add Input Validation Warnings
**File**: `tools/add-word.ts:56-65`

```typescript
async function addWord(input: string, options: AddWordOptions = {}): Promise<void> {
  const { date, overwrite = false, preserveCase = false } = options;
  try {
    const word = input?.trim();

    // Validate inputs
    if (!word) {
      console.error('Word is required', { providedInput: input });
      process.exit(1);
    }

    // Warn about suspicious inputs
    if (word !== input) {
      console.log('ℹ️  Trimmed whitespace from input', { original: input, trimmed: word });
    }

    if (!preserveCase && word !== word.toLowerCase()) {
      console.log('⚠️  Word contains uppercase but --preserve-case not set. Word will be stored as:', word.toLowerCase());
      console.log('💡 Use --preserve-case flag to keep original capitalization for proper nouns, acronyms, or brand names.');
    }

    if (preserveCase && word === word.toLowerCase()) {
      console.log('ℹ️  --preserve-case flag set but word is already lowercase. Flag will have no effect.');
    }

    // ... rest of function
}
```

---

### Priority 3: Testing & Documentation

#### Test 1: Add Preserve-Case Tests
**New File**: `tests/tools/add-word.spec.js`

```javascript
describe('add-word preserve-case', () => {
  it('should store word in lowercase by default', async () => {
    await addWord('TestWord', { date: '20260107' });
    const wordData = readWordFile('20260107');
    expect(wordData.word).toBe('testword');
    expect(wordData.preserveCase).toBe(false);
  });

  it('should preserve case when flag is set', async () => {
    await addWord('Japan', { date: '20260107', preserveCase: true });
    const wordData = readWordFile('20260107');
    expect(wordData.word).toBe('Japan');
    expect(wordData.preserveCase).toBe(true);
  });

  it('should generate image with correct case', async () => {
    await addWord('NASA', { date: '20260107', preserveCase: true });
    const imagePath = 'public/images/social/2026/20260107-nasa.png';
    expect(fs.existsSync(imagePath)).toBe(true);

    // TODO: Use sharp to verify image contains "NASA" not "nasa"
  });
});
```

---

#### Test 2: Workflow Integration Test
**New File**: `tests/workflows/add-word.spec.js`

```javascript
describe('GitHub Actions add-word workflow', () => {
  it('should handle words with leading/trailing spaces', async () => {
    const result = await simulateWorkflow({ word: '  Japan  ' });
    expect(result.trimmedWord).toBe('Japan');
  });

  it('should warn when preserve-case is needed but not set', async () => {
    const result = await simulateWorkflow({ word: 'Japan', preserve_case: false });
    expect(result.warnings).toContain('uppercase but --preserve-case not set');
  });
});
```

---

## Implementation Plan

### Phase 1: Critical Fixes (1-2 hours)
1. ✅ Fix social image case preservation (utils.ts)
2. ✅ Fix workflow FLAGS handling (.github/workflows/add-word.yml)
3. ✅ Remove prepare-manual job
4. ✅ Add input sanitization

### Phase 2: Code Quality (2-3 hours)
5. ✅ Update help text with when to use preserve-case
6. ✅ Add validation warnings for suspicious inputs
7. ✅ Move image generation into createWordEntry
8. ✅ Better error messages

### Phase 3: Testing & Validation (1-2 hours)
9. ✅ Test preserve-case with "Japan", "NASA", "PB&J"
10. ✅ Verify social images show correct case
11. ✅ Test workflow with edge cases (spaces, special chars)
12. ✅ Update documentation

### Phase 4: Optional Refactoring (Future)
- Split utils.ts into focused modules
- Add custom error classes
- Improve date validation messages
- Add E2E workflow tests

---

## Risk Assessment

### Low Risk (Safe to Do)
- ✅ Fix social image case (only affects new images)
- ✅ Fix FLAGS array (bash best practice)
- ✅ Add input trimming (defensive)
- ✅ Update help text (documentation only)

### Medium Risk (Test Thoroughly)
- ⚠️ Remove prepare-manual job (workflow structure change)
- ⚠️ Move image generation (changes execution order)

### High Risk (Consider Carefully)
- ❌ Change data schema (don't do this)
- ❌ Modify Wordnik adapter logic (tied to API)

---

## Questions to Resolve

1. **Should we regenerate all existing social images with correct case?**
   - Probably yes, but only for words with `preserveCase: true`
   - Need to create a migration script

2. **Should preserve-case be auto-detected instead of manual flag?**
   - Pro: Less user error
   - Con: Harder to override if detection is wrong
   - Decision: Keep manual flag but add warnings

3. **Should we validate that preserve-case words actually need it?**
   - Example: User sets `--preserve-case` for "apple" (all lowercase)
   - Current: No error, just wasted flag
   - Proposal: Add informational message

---

## Conclusion

The add word flow is well-architected with a clear separation of concerns. The main issues are:

1. **Critical bug in image generation** - must be fixed
2. **Workflow complexity** - can be simplified safely
3. **UX clarity** - better guidance needed

All recommendations can be implemented incrementally with low risk. The highest priority is fixing the social image bug, as it creates inconsistency between web display and social shares.

---

## Appendix: File Changes Summary

| File | Changes | Priority | Risk |
|------|---------|----------|------|
| `tools/utils.ts` | Add `preserveCase` param to `createWordSvg()`, `generateShareImage()` | P1 | Low |
| `.github/workflows/add-word.yml` | Remove prepare-manual, fix FLAGS, add sanitization | P1 | Medium |
| `tools/add-word.ts` | Update help text, add validation warnings | P2 | Low |
| `tests/tools/add-word.spec.js` | Add preserve-case tests | P3 | Low |

**Lines of Code Changed**: ~100 lines
**Estimated Time**: 4-7 hours total
**Breaking Changes**: None
