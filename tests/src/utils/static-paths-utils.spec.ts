import { describe, expect, it } from 'vitest';

import { generateStatsStaticPaths } from '#astro-utils/static-paths-utils';

describe('src/utils/static-paths-utils', () => {
  describe('generateStatsStaticPaths', () => {
    it('pairs every props type with the matching words shape', async () => {
      const paths = await generateStatsStaticPaths();
      const types = new Set(paths.map(({ props }) => props.type));

      expect(types).toEqual(new Set(['word-list', 'milestone']));
      for (const { props } of paths) {
        expect(typeof props.description).toBe('string');
        expect(props.words.every(word => (props.type === 'milestone') === ('label' in word))).toBe(true);
      }
    });

    it('builds the milestone pages from labelled words', async () => {
      const paths = await generateStatsStaticPaths();
      const milestones = paths.find(({ params }) => params.stat === 'milestone-words');

      expect(milestones?.props.type).toBe('milestone');
      if (milestones?.props.type !== 'milestone') {
        throw new Error('Milestone route is missing milestone props');
      }
      expect(milestones.props.words[0]?.label).toBe('1st Word');
    });
  });
});
