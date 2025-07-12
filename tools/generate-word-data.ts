import fs from 'fs';

import { getAdapter } from '~adapters/factory';
import { paths } from '~config/paths';
import { getAllWordFiles, getAllWords, updateWordFile } from '~tools/utils';
import { generateWordDataHash } from '~utils/word-data-utils';

/**
 * Reprocesses all word data with fresh API data from the configured dictionary adapter
 * @param options - Configuration options for processing
 * @param options.timeout - Standard timeout between API calls in milliseconds
 * @param options.rateLimitTimeout - Timeout when rate limit is hit, in milliseconds
 * @param options.batchSize - Number of words to process before taking a longer break
 * @param options.batchTimeout - Timeout between batches in milliseconds
 */
async function reprocessWords(options: Record<string, unknown> = {}): Promise<void> {
  const defaultOptions = {
    timeout: 1000, // Default timeout of 1 second between each API call
    rateLimitTimeout: 65000, // Default timeout of 65 seconds when rate limit is hit
    batchSize: 4, // Process 4 words before taking a longer break (slightly below the 5/min limit)
    batchTimeout: 10000, // Wait 10 seconds between batches
  };

  const config = { ...defaultOptions, ...options };

  try {
    const wordFiles = getAllWordFiles();
    console.log(`Found ${wordFiles.length} words to reprocess`);
    console.log('Configuration:');
    console.log(`- Standard timeout: ${config.timeout}ms between API calls`);
    console.log(`- Rate limit timeout: ${config.rateLimitTimeout}ms when rate limit is hit`);
    console.log(`- Batch size: ${config.batchSize} words`);
    console.log(`- Batch timeout: ${config.batchTimeout}ms between batches`);

    // Process words in batches to avoid rate limits
    let currentBatch = 0;

    for (let i = 0; i < wordFiles.length; i++) {
      const file = wordFiles[i];
      try {
        // Check if we need to take a longer break between batches
        if (i > 0 && i % config.batchSize === 0) {
          currentBatch++;
          console.log(`\nCompleted batch ${currentBatch}. Waiting ${config.batchTimeout/1000} seconds before next batch...\n`);
          await new Promise(resolve => setTimeout(resolve, config.batchTimeout));
        }

        console.log(`Fetching data for: ${file.word}`);

        const adapter = getAdapter();
        const data = await adapter.fetchWordData(file.word);
        updateWordFile(file.path, data.definitions, file.date);

        // Use standard delay between requests within a batch
        if (i < wordFiles.length - 1 && (i + 1) % config.batchSize !== 0) {
          console.log(`Waiting ${config.timeout}ms before next request...`);
          await new Promise(resolve => setTimeout(resolve, config.timeout));
        }
      } catch (error) {
        console.error(`Error processing ${file.word}:`, error.message);

        // If it's a rate limit error, wait for the specified timeout
        if (error.message.includes('Rate limit exceeded') || error.status === 429) {
          console.log(`Rate limit hit, waiting for ${config.rateLimitTimeout/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, config.rateLimitTimeout));
        }
      }
    }

    console.log('Finished reprocessing words');
  } catch (error) {
    console.error('Error reprocessing words:', error.message);
    process.exit(1);
  }
}

/**
 * Generates and writes build metadata to file including word count and hash
 */
async function writeBuildData(): Promise<void> {
  const words = getAllWords();
  const wordsCount = words.length;
  const wordsHash = generateWordDataHash(words.map(w => w.word));
  const generatedAt = new Date().toISOString();
  const buildData = {
    words_count: wordsCount,
    words_hash: wordsHash,
    generated_at: generatedAt,
  };
  const outPath = paths.buildData;
  fs.writeFileSync(outPath, JSON.stringify(buildData, null, 2));
  console.log(`Wrote build data to ${outPath}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Map of command line flags to option properties
const flagMap = {
  '--timeout': 'timeout',
  '-t': 'timeout',
  '--rate-limit-timeout': 'rateLimitTimeout',
  '-r': 'rateLimitTimeout',
  '--batch-size': 'batchSize',
  '-b': 'batchSize',
  '--batch-timeout': 'batchTimeout',
  '-bt': 'batchTimeout',
};

// Parse all flags
Object.entries(flagMap).forEach(([flag, property]) => {
  const index = args.findIndex(arg => arg === flag);
  if (index !== -1 && args.length > index + 1) {
    const value = parseInt(args[index + 1], 10);
    if (!isNaN(value) && value > 0) {
      options[property] = value;
    } else {
      console.error(`Invalid value for ${flag}. Using default.`);
    }
  }
});

// Run the script with parsed options
reprocessWords(options).then(writeBuildData);
