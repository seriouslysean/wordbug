import { describe, expect, it } from 'vitest';

import { layoutGraph, placeLabels, resolveCollisions } from '#utils/force-layout';

describe('force-layout', () => {
  describe('layoutGraph', () => {
    const edges = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 3, to: 4 },
    ];

    it('returns one point per node within the padded frame', () => {
      const points = layoutGraph(5, edges, 1000, 500, { padding: 20 });
      expect(points).toHaveLength(5);
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1000);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(500);
      }
    });

    it('is deterministic for the same inputs (seeded, no real randomness)', () => {
      expect(layoutGraph(5, edges, 1000, 500)).toEqual(layoutGraph(5, edges, 1000, 500));
    });

    it('returns an empty array for zero nodes', () => {
      expect(layoutGraph(0, [], 1000, 500)).toEqual([]);
    });

    it('fills the frame: spans more than one point across an axis', () => {
      const points = layoutGraph(5, edges, 1000, 500, { padding: 20 });
      const xs = points.map(point => point.x);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0);
    });
  });

  describe('resolveCollisions', () => {
    it('separates overlapping boxes past their combined half-extents', () => {
      const points = [{ x: 100, y: 100 }, { x: 105, y: 100 }];
      const boxes = [{ width: 40, height: 20 }, { width: 40, height: 20 }];
      resolveCollisions(points, boxes, 1000, 500);
      const gap = Math.abs(points[0].x - points[1].x);
      const overlapY = 20 - Math.abs(points[0].y - points[1].y);
      // No overlap once resolved: cleared on at least one axis.
      const cleared = gap >= 40 || overlapY <= 0;
      expect(cleared).toBe(true);
    });

    it('keeps points inside the frame', () => {
      const points = [{ x: 2, y: 2 }, { x: 4, y: 4 }];
      const boxes = [{ width: 60, height: 30 }, { width: 60, height: 30 }];
      resolveCollisions(points, boxes, 400, 300);
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(400);
        expect(point.y).toBeLessThanOrEqual(300);
      }
    });
  });

  describe('placeLabels', () => {
    it('returns a valid side for every node', () => {
      const points = [{ x: 100, y: 100 }, { x: 130, y: 100 }, { x: 300, y: 300 }];
      const boxes = points.map(() => ({ width: 40, height: 14 }));
      const sides = placeLabels(points, boxes, 1000, 500);
      expect(sides).toHaveLength(3);
      for (const side of sides) {
        expect(['above', 'below', 'left', 'right']).toContain(side);
      }
    });

    it('does not place a label off the top of the frame', () => {
      // A node hugging the top edge cannot put its label above (it would clip).
      const sides = placeLabels([{ x: 200, y: 5 }], [{ width: 40, height: 20 }], 1000, 500);
      expect(sides[0]).not.toBe('above');
    });
  });
});
