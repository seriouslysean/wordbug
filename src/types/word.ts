export interface WordDefinition {
    definition: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
}

export interface WordMeaning {
    partOfSpeech: string;
    definitions: WordDefinition[];
}

export interface WordData {
    meanings: WordMeaning[];
}

export interface Word {
    word: string;
    date: string;
    data: WordData;
}

export interface WordStats {
    longest: { word: string; length: number } | null;
    shortest: { word: string; length: number } | null;
    longestPalindrome: { word: string; length: number } | null;
    shortestPalindrome: { word: string; length: number } | null;
    letterFrequency: Record<string, number>;
}

export interface WordDetails {
    partOfSpeech: string;
    definition: string;
}
