import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isValidWordData, getAllWords } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get API key from environment variable
const apiKey = process.env.WORDNIK_API_KEY;

// Validate API key
if (!apiKey) {
  console.error('Wordnik API key is required');
  process.exit(1);
}

/**
 * Checks if a file exists for the given date and returns the existing word if found
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object|null} - Existing word data if found, null otherwise
 */
const checkExistingWord = (date) => {
  const [year, month, day] = date.split('-');
  const filePath = path.join(__dirname, '..', 'src', 'data', 'words', year, `${year}${month}${day}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        word: data.word,
        date: date,
        filePath,
      };
    } catch (error) {
      console.error(`Error reading existing word file: ${error.message}`);
    }
  }
  return null;
};

/**
 * Creates a word file for the given date and word data
 * @param {string} word - Word to add
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} data - Word data from API
 */
const createWordFile = (word, date, data) => {
  const [year] = date.split('-');
  const dirPath = path.join(__dirname, '..', 'src', 'data', 'words', year);
  const filePath = path.join(dirPath, `${date.replace(/-/g, '')}.json`);

  // Create year directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Write the file with just the three required fields
  const wordData = {
    word: word.toLowerCase(), // Always store lowercase for consistency
    date: date.replace(/-/g, ''),
    data: data,  // Store the raw API response directly
  };
  fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));
  return filePath;
};

/**
 * Validates a date string
 * @param {string} date - Date string to validate
 * @returns {boolean} - Whether the date is valid
 */
const isValidDate = (date) => {
  if (!date) {return false;}
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) {return false;}
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

/**
 * Validates that a date is not in the future
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {boolean} - Whether the date is today or in the past
 */
const isNotFutureDate = (date) => {
  const today = new Date().toISOString().split('T')[0];
  return date <= today;
};

/**
 * Checks if a word already exists in the system
 * @param {string} word - Word to check
 * @returns {Object|null} - Existing word data if found, null otherwise
 */
const checkExistingWordByName = (word) => {
  const lowerWord = word.toLowerCase();
  const words = getAllWords();
  return words.find(w => w.word?.toLowerCase() === lowerWord) || null;
};

/**
 * Fetches word data from the Wordnik API
 * @param {string} word - Word to fetch data for
 * @returns {Promise<Object>} - Word data from API
 * @throws {Error} - If API request fails
 */
async function fetchWordData(word) {
  // Convert word to lowercase for API request
  const lowercaseWord = word.toLowerCase();
  const url = `https://api.wordnik.com/v4/word.json/${encodeURIComponent(lowercaseWord)}/definitions?limit=10&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Word "${word}" not found in dictionary. Please check the spelling.`);
    }
    throw new Error(`Failed to fetch word data: ${response.statusText}`);
  }

  const data = await response.json();

  if (!isValidWordData(data)) {
    throw new Error(`Word "${word}" not found in dictionary. Please check the spelling.`);
  }

  // Simply return the API data directly
  return data;
}

/**
 * Formats word data for summary output
 * @param {Object} data - Word data
 * @returns {string} - Formatted summary
 */
const formatWordSummary = (data) => {
  if (!data || !Array.isArray(data)) {
    return '**Word:** No data available';
  }

  const firstEntry = data[0] || {};

  return [
    `**Word:** ${firstEntry.word || 'N/A'}`,
    `**Part of Speech:** ${firstEntry.partOfSpeech || 'N/A'}`,
    `**Definition:** ${firstEntry.text || 'N/A'}`,
    firstEntry.attributionText ? `**Source:** ${firstEntry.attributionText}` : null,
  ].filter(Boolean).join('\n');
};

/**
 * Adds a new word to the collection
 * @param {string} input - Word to add
 * @param {string} [date] - Optional date to add word for
 * @param {boolean} [overwrite] - Whether to overwrite existing word
 */
async function addWord(input, date, overwrite = false) {
  try {
    const word = input?.trim();
    
    // Validate inputs
    if (!word) {
      console.error('Word is required', { providedInput: input });
      process.exit(1);
    }
    
    if (date && !isValidDate(date)) {
      console.error('Invalid date format', { providedDate: date, expectedFormat: 'YYYY-MM-DD' });
      process.exit(1);
    }

    // If no date provided, use today
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Validate that date is not in the future
    if (!isNotFutureDate(targetDate)) {
      console.error('Cannot add words for future dates', { 
        requestedDate: targetDate, 
        currentDate: new Date().toISOString().split('T')[0], 
      });
      process.exit(1);
    }

    // Check if file already exists for the target date
    const existing = checkExistingWord(targetDate);
    if (existing && !overwrite) {
      console.error('Word already exists for this date', { 
        date: existing.date, 
        existingWord: existing.word, 
      });
      process.exit(1);
    }

    // Check if word already exists anywhere else in the system (not same date)
    const existingWordByName = checkExistingWordByName(word);
    if (existingWordByName && existingWordByName.date !== targetDate.replace(/-/g, '') && !overwrite) {
      console.error('Word already exists for different date', { 
        word: word, 
        existingDate: existingWordByName.date, 
        requestedDate: targetDate.replace(/-/g, ''), 
      });
      process.exit(1);
    }

    const data = await fetchWordData(word);
    const filePath = createWordFile(word, targetDate, data);

    // Output summary for GitHub Actions
    console.log('::group::Word Added Successfully');
    console.log(`### ✅ New Word Added for ${targetDate}\n`);
    console.log(formatWordSummary(data));
    console.log('\n---');
    console.log(`File created: \`${filePath}\``);
    console.log('::endgroup::');

  } catch (error) {
    if (error.message.includes('not found in dictionary')) {
      console.error('Word not found in dictionary', { word, errorMessage: error.message });
    } else {
      console.error('Failed to add word', { word, errorMessage: error.message });
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const overwriteIndex = args.findIndex(arg => arg === '--overwrite' || arg === '-o');
const hasOverwrite = overwriteIndex !== -1;

// Remove the overwrite flag from args if present
if (hasOverwrite) {
  args.splice(overwriteIndex, 1);
}

const [word, date] = args;

addWord(word, date, hasOverwrite);
