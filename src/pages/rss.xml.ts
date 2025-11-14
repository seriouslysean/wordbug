import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getWordsFromCollection } from '~astro-utils/word-data-utils';
import { extractWordDefinition } from '~astro-utils/word-data-utils';
import { getFullUrl, getWordUrl } from '~astro-utils/url-utils';
import { YYYYMMDDToDate } from '~utils/date-utils';
import { RSS_FEED_WORD_COUNT } from '~constants/text-patterns';

export async function GET(context: APIContext) {
  const allWords = await getWordsFromCollection();

  // Get the latest words for RSS feed (2 weeks worth if daily)
  const latestWords = allWords.slice(0, RSS_FEED_WORD_COUNT);
  
  const rssUrl = getFullUrl('/rss.xml');
  
  return rss({
    title: __SITE_TITLE__,
    description: __SITE_DESCRIPTION__,
    site: context.site || getFullUrl('/'),
    items: latestWords.map(word => {
      const { definition, partOfSpeech } = extractWordDefinition(word);
      const wordUrl = getFullUrl(getWordUrl(word.word));
      const pubDate = YYYYMMDDToDate(word.date);

      if (!pubDate) {
        throw new Error(`Invalid date format for word ${word.word}: ${word.date}`);
      }

      // Strip HTML tags from definition for clean RSS
      const cleanDefinition = definition.replace(/<[^>]*>/g, '');

      // Simple format: (part of speech) definition
      const description = `(${partOfSpeech}) ${cleanDefinition}`;

      return {
        title: word.word,
        description,
        link: wordUrl,
        pubDate,
      };
    }),
    customData: `<language>${__SITE_LOCALE__.toLowerCase()}</language>
<atom:link href="${rssUrl}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>`,
  });
}