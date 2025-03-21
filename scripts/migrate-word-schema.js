import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORDS_DIR = path.join(__dirname, '../src/data/words');

async function migrateWordSchema() {
    try {
        // Read all word files
        const files = await fs.promises.readdir(WORDS_DIR, { recursive: true });
        const wordFiles = files.filter(file => file.endsWith('.json'));

        console.log(`Found ${wordFiles.length} word files to migrate`);

        for (const file of wordFiles) {
            const filePath = path.join(WORDS_DIR, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const wordData = JSON.parse(content);

            // Extract date from filename (YYYYMMDD.json)
            const date = path.basename(file, '.json');

            // Create new schema
            const newSchema = {
                word: wordData.word,
                date: date,
                data: {
                    word: wordData.word,
                    phonetics: wordData.phonetics || [],
                    meanings: wordData.meanings || [],
                    license: wordData.license || {},
                    sourceUrls: wordData.sourceUrls || []
                }
            };

            // Write back the new schema
            await fs.promises.writeFile(
                filePath,
                JSON.stringify(newSchema, null, 4),
                'utf-8'
            );

            console.log(`Migrated ${file}`);
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateWordSchema();
