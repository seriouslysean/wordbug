import fs from 'node:fs';
import path from 'node:path';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const STATUS_TEXT: Record<number, string> = { 404: 'Not Found', 429: 'Too Many Requests' };
const mockResponse = (status: number, data: unknown = {}): Response => new Response(
  JSON.stringify(data),
  { status, statusText: STATUS_TEXT[status] ?? 'OK' },
);

// Bodies recorded from https://en.wiktionary.org/api/rest_v1/page/definition/{word}
const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures', 'wiktionary');
const loadFixture = (name: string): unknown => JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'),
);

const ATTRIBUTION = 'Adapted from Wiktionary (CC BY-SA 4.0)';

const usage = (partOfSpeech: string, ...definitions: unknown[]): unknown => ({ partOfSpeech, language: 'English', definitions });
const translingual = (partOfSpeech: string, ...definitions: unknown[]): unknown => ({ partOfSpeech, language: 'Translingual', definitions });

const first = <T>(items: T[]): T => {
  const [item] = items;
  if (item === undefined) {
    throw new Error('expected a non-empty list');
  }
  return item;
};

const lookUp = async (word: string, status: number, body: unknown) => {
  const { wiktionaryAdapter } = await import('#adapters/wiktionary');
  fetchMock.mockResolvedValueOnce(mockResponse(status, body));
  return wiktionaryAdapter.fetchWordData(word);
};

describe('wiktionary adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('request', () => {
    it("asks Wikimedia's definition endpoint for the word as given, and says who is asking", async () => {
      await lookUp('sacré bleu', 200, loadFixture('sacré bleu'));

      const [url, init] = first(fetchMock.mock.calls);
      expect(url).toBe('https://en.wiktionary.org/api/rest_v1/page/definition/sacr%C3%A9%20bleu');
      const headers = new Headers(init?.headers);
      expect(headers.get('User-Agent')).toBe('occasional-wotd (https://github.com/seriouslysean/occasional-wotd)');
      expect(headers.get('Api-User-Agent')).toBe(headers.get('User-Agent'));
      // A contact, never a person's address
      expect(headers.get('User-Agent')).not.toContain('@');
    });

    it('reads the endpoint from WIKTIONARY_API_URL when it is set', async () => {
      vi.stubEnv('WIKTIONARY_API_URL', 'http://127.0.0.1:9/rest');
      await lookUp('serendipity', 200, loadFixture('serendipity'));

      expect(first(fetchMock.mock.calls)[0]).toBe('http://127.0.0.1:9/rest/page/definition/serendipity');
    });
  });

  describe('recorded responses', () => {
    it('reads an ordinary word as plain text, without its links', async () => {
      const result = await lookUp('serendipity', 200, loadFixture('serendipity'));

      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(3);
      expect(result.definitions.every(definition => definition.partOfSpeech === 'noun')).toBe(true);
      expect(first(result.definitions).text).toBe(
        'The phenomenon of making an unplanned, fortunate discovery through a combination of unexpected circumstances and insightful recognition.',
      );
      expect(result.definitions.some(definition => 'references' in definition || 'id' in definition)).toBe(false);
      expect(result.meta).toEqual({
        source: 'Wiktionary',
        attribution: ATTRIBUTION,
        url: 'https://en.wiktionary.org/wiki/serendipity',
      });
    });

    it('credits Wiktionary and its licence on every definition, and links the entry', async () => {
      const result = await lookUp('serendipity', 200, loadFixture('serendipity'));

      for (const definition of result.definitions) {
        expect(definition.attributionText).toBe(ATTRIBUTION);
        expect(definition.sourceDictionary).toBe('wiktionary');
        expect(definition.sourceUrl).toBe('https://en.wiktionary.org/wiki/serendipity');
      }
    });

    it('links a multi-word entry by its page title', async () => {
      const result = await lookUp('candy corn', 200, loadFixture('candy corn'));

      expect(result.word).toBe('candy corn');
      expect(first(result.definitions).partOfSpeech).toBe('noun');
      expect(first(result.definitions).sourceUrl).toBe('https://en.wiktionary.org/wiki/candy_corn');
    });

    it('links an accented entry with its title encoded', async () => {
      const result = await lookUp('sacré bleu', 200, loadFixture('sacré bleu'));

      expect(first(result.definitions).partOfSpeech).toBe('interjection');
      expect(first(result.definitions).text).toBe('An expression of surprise, exasperation, or dismay; good heavens; oh my gosh.');
      expect(first(result.definitions).sourceUrl).toBe('https://en.wiktionary.org/wiki/sacr%C3%A9_bleu');
    });

    it("reads the English section, not the Translingual one the endpoint sends before it", async () => {
      const fixture = loadFixture('three');
      const result = await lookUp('three', 200, fixture);

      expect(JSON.stringify(fixture)).toContain('radiotelephony');
      expect(first(result.definitions)).toMatchObject({
        label: 'Numeral',
        text: 'A numerical value equal to 3; the number following two and preceding four.',
      });
      expect(result.definitions.find(definition => definition.partOfSpeech)?.text).toBe('The digit/figure 3.');
      expect(JSON.stringify(result.definitions)).not.toContain('radiotelephony');
    });

    it('leaves the genus out of a place name', async () => {
      const result = await lookUp('Paris', 200, loadFixture('Paris'));

      expect(first(result.definitions).text).toMatch(/^The capital and largest city of France/);
    });

    // Amblypygi has no English section: its only definition is Translingual
    it('reads a taxonomic name, a proper noun, as a noun with its entities decoded', async () => {
      const result = await lookUp('Amblypygi', 200, loadFixture('Amblypygi'));

      expect(result.word).toBe('Amblypygi');
      expect(result.definitions).toEqual([{
        partOfSpeech: 'noun',
        text: 'A taxonomic order within the class Arachnida – tailless whip scorpions or whip spiders.',
        attributionText: ATTRIBUTION,
        sourceDictionary: 'wiktionary',
        sourceUrl: 'https://en.wiktionary.org/wiki/Amblypygi',
      }]);
    });

    it('reads only the English entries of a page that has other languages', async () => {
      const fixture = loadFixture('taquito');
      const result = await lookUp('taquito', 200, fixture);

      expect(fixture).toHaveProperty('es');
      expect(result.definitions).toHaveLength(1);
      expect(first(result.definitions).text).toContain('A fried corn or flour tortilla');
    });

    // The endpoint nests a sense's subsenses in its HTML and lists each again
    it("ends a sense's text where its subsenses begin, and keeps each subsense as a definition", async () => {
      const result = await lookUp('water', 200, loadFixture('water'));
      const texts = result.definitions.map(definition => definition.text);

      const parent = texts.indexOf('A combination of water and other substance(s).');
      expect(parent).toBeGreaterThan(-1);
      expect(texts[parent + 1]).toBe('Mineral water.');
      expect(texts.filter(text => text.includes('Mineral water.'))).toEqual(['Mineral water.']);
      // Its examples arrive mixed with its subsenses' and later senses'
      expect(result.definitions[parent]).not.toHaveProperty('examples');
      expect(result.definitions[parent + 1]?.examples).toEqual(['Perrier is the most popular water in this restaurant.']);
      // The verb's first sense nests four
      expect(texts).toContain('To wet or supply with water; to moisten; to overflow with water; to irrigate.');
      expect(texts).toContain('To pour water into the soil surrounding (plants).');
    });

    it('lists the places a sense groups once each, not again inside the sense that groups them', async () => {
      const result = await lookUp('Paris', 200, loadFixture('Paris'));
      const texts = result.definitions.map(definition => definition.text);

      expect(texts).toContain('A locale in the United States.');
      expect(texts.filter(text => text.includes('Lamar County'))).toHaveLength(1);
      expect(Math.max(...texts.map(text => text.length))).toBeLessThan(400);
      expect(new Set(texts).size).toBe(texts.length);
    });

    it('leaves out a footnote the endpoint lists among the definitions', async () => {
      const word = 'pneumonoultramicroscopicsilicovolcanoconiosis';
      const fixture = loadFixture(word);
      const result = await lookUp(word, 200, fixture);

      expect(JSON.stringify(fixture)).toContain('Oxford English Dictionary');
      expect(result.definitions.map(definition => definition.text)).toEqual([
        'A disease of the lungs, allegedly caused by inhaling microscopic silicate particles originating from the eruption of a volcano.',
      ]);
    });

    it("leaves Wiktionary's translation-hub note out of a sense", async () => {
      const result = await lookUp('apple juice', 200, loadFixture('apple juice'));

      expect(result.definitions.map(definition => definition.text)).toEqual([
        'The juice of apples.',
        'Filtered and pasteurized juice of apples, as opposed to apple cider (which is unfiltered) and hard cider (which is fermented and alcoholic).',
      ]);
    });

    it("keeps a sense written in the note's own markup, and drops only the note after it", async () => {
      const result = await lookUp('older brother', 200, loadFixture('older brother'));

      expect(result.definitions.map(definition => definition.text)).toEqual([
        'Used other than figuratively or idiomatically: see older, brother.',
      ]);
    });

    it("leaves a template's stylesheet out of the text", async () => {
      const result = await lookUp('antidisestablishmentarianism', 200, loadFixture('antidisestablishmentarianism'));

      expect(first(result.definitions).text).toMatch(/or the separation of church and state\.$/);
    });

    it('keeps examples as plain text and drops the definitions the endpoint sends empty', async () => {
      const result = await lookUp('test', 200, loadFixture('test'));

      expect(result.definitions.every(definition => definition.text.trim().length > 0)).toBe(true);
      expect(result.definitions.flatMap(definition => definition.examples ?? [])).toContain('aptitude test');
      expect(JSON.stringify(result.definitions)).not.toMatch(/<\/?[a-z]/);
    });

    it('reports the word exactly as the caller gave it', async () => {
      // Case is the caller's decision (--preserve-case); the adapter passes it through.
      const result = await lookUp('Serendipity', 200, loadFixture('serendipity'));

      expect(result.word).toBe('Serendipity');
      expect(first(fetchMock.mock.calls)[0]).toContain('/page/definition/Serendipity');
    });
  });

  describe('sections', () => {
    it('reads the Translingual section when the page has no English one', async () => {
      const result = await lookUp('Aa', 200, { en: [translingual('Noun', { definition: 'A genus.' })] });

      expect(result.definitions.map(definition => definition.text)).toEqual(['A genus.']);
    });

    it('reads only the English section when the page has both, wherever it comes', async () => {
      const body = { en: [translingual('Symbol', { definition: 'A code.' }), usage('Noun', { definition: 'A word.' }), translingual('Noun', { definition: 'A genus.' })] };
      const result = await lookUp('aa', 200, body);

      expect(result.definitions.map(definition => definition.text)).toEqual(['A word.']);
    });
  });

  describe('parts of speech', () => {
    it('keeps an unmappable heading as the label', async () => {
      const result = await lookUp('break a leg', 200, { en: [usage('Phrase', { definition: 'Good luck' })] });

      expect(first(result.definitions)).not.toHaveProperty('partOfSpeech');
      expect(first(result.definitions).label).toBe('Phrase');
    });
  });

  describe('a word Wiktionary does not have', () => {
    it('reports not found for the recorded 404', async () => {
      const { WordNotFoundError } = await import('#utils/adapter-utils');

      await expect(lookUp('zzzznotaword', 404, loadFixture('not-found'))).rejects.toBeInstanceOf(WordNotFoundError);
    });

    it('reports not found for a page with no English entry', async () => {
      const { WordNotFoundError } = await import('#utils/adapter-utils');
      const body = { fr: [usage('Noun', { definition: 'Un mot' })] };

      await expect(lookUp('mot', 200, body)).rejects.toBeInstanceOf(WordNotFoundError);
    });

    it('answers with no definitions, which the caller reads as not found, when the English entry lists none', async () => {
      const result = await lookUp('test', 200, { en: [usage('Noun')] });

      expect(result.definitions).toEqual([]);
    });

    // The only item of "bake bread", as the endpoint sent it on 12 October 2026
    const HUB_NOTE = '<span class="use-with-mention" about="#mwt2" typeof="mw:Transclusion">(This entry is a <a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#translation_hub" title="Appendix:Glossary">translation hub</a>.)</span><link rel="mw:PageProp/Category" href="./Category:English_translation_hubs" about="#mwt2">';

    it('answers with no definitions when a translation-hub note is all the entry has', async () => {
      const result = await lookUp('bake bread', 200, { en: [usage('Verb', { definition: HUB_NOTE })] });

      expect(result.definitions).toEqual([]);
    });

    it('drops a sense that is only the note and keeps the senses beside it', async () => {
      const body = { en: [usage('Noun', { definition: HUB_NOTE }, { definition: 'A <b>second</b> sense.' })] };

      const result = await lookUp('minor thing', 200, body);

      expect(result.definitions.map(definition => definition.text)).toEqual(['A second sense.']);
    });
  });

  describe('failures that are not a missing word', () => {
    it.each([
      ['the body is a list', []],
      ['the English entries are not a list', { en: { partOfSpeech: 'Noun' } }],
      ['a usage has no definitions', { en: [{ partOfSpeech: 'Noun', language: 'English' }] }],
      ['a usage has no part of speech', { en: [{ language: 'English', definitions: [{ definition: 'A thing' }] }] }],
      ['a usage does not name its section', { en: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'A thing' }] }] }],
      ['a definition has no text', { en: [usage('Noun', {})] }],
      ['an example is not a string', { en: [usage('Noun', { definition: 'A thing', examples: [1] })] }],
      ['every definition is blank', { en: [usage('Noun', { definition: '' }, { definition: '<span></span> ' })] }],
    ])('reports an unexpected shape when %s', async (_, body) => {
      const { WordNotFoundError } = await import('#utils/adapter-utils');

      const error: unknown = await lookUp('test', 200, body).catch((caught: unknown) => caught);

      expect(error).not.toBeInstanceOf(WordNotFoundError);
      expect(error).toHaveProperty('message', 'Wiktionary returned an unexpected response shape for "test"');
    });

    it('reports a rate limit as one', async () => {
      const { RateLimitError } = await import('#utils/adapter-utils');

      await expect(lookUp('test', 429, {})).rejects.toBeInstanceOf(RateLimitError);
    });

    it('throws on a server error', async () => {
      // Wikimedia sends no reason phrase: the status code is what says what happened
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));

      await expect(wiktionaryAdapter.fetchWordData('test')).rejects.toThrow('Failed to fetch word data from Wiktionary: HTTP 503');
    });
  });

  describe('htmlToText', () => {
    it.each([
      ['drops tags and keeps their content', 'A <a rel="mw:WikiLink" href="/wiki/room" title="room">room</a>.', 'A room.'],
      ['drops a void element', 'Juice.<link rel="mw:PageProp/Category" href="./Category:X">', 'Juice.'],
      ['decodes character references', 'Arachnida&nbsp;&ndash; R&amp;D', 'Arachnida – R&D'],
      ['drops a script with its content', 'A room.<script type="text/javascript">alert("x < y")</script >', 'A room.'],
      ['drops a comment whole, whatever it holds', 'A <!-- note: a > b, <b>old</b> --> room.', 'A room.'],
      ['drops a comment that spans lines', 'A room.<!--\n hidden \n-->', 'A room.'],
      ['reads a line break as a space', 'a<br>b<br/>c', 'a b c'],
      ['reads the end of a block as a space', '<p>One.</p><p>Two.</p><div>Three.</div>', 'One. Two. Three.'],
      ['joins the words an inline tag splits', 'un<b>plan</b>ned', 'unplanned'],
      ['decodes after the tags are gone, so text is never read as markup', 'The tag &lt;b&gt;, as in &lt;b&gt;bold&lt;/b&gt;', 'The tag <b>, as in <b>bold</b>'],
      ['keeps an encoded comment as the text it is', 'Written &lt;!-- like this --&gt;', 'Written <!-- like this -->'],
      ['removes directional marks, written or encoded', 'A\u200E room\u200F &lrm;here&#8207;\u202A\u2069', 'A room here'],
      ['drops a stylesheet with its content', 'A philosophy. <style data-mw-deduplicate="TemplateStyles:r1">.mw-parser-output .defdate{font-size:smaller}</style>', 'A philosophy.'],
      ['trims what an empty label leaves behind', '<span class="usage-label-sense"></span> A small room.', 'A small room.'],
    ])('%s', async (_, html, text) => {
      const { htmlToText } = await import('#adapters/wiktionary');

      expect(htmlToText(html)).toBe(text);
    });
  });
});
