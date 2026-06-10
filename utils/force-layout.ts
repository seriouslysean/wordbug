/**
 * Dependency-free force-directed layout + label de-overlap, sized to run client
 * side for the word-connections graph. Kept pure (no DOM, no imports) so it can
 * be unit-tested and bundled into the small /stats enhancement script. The graph
 * structure (which words, which edges) is computed at build time; positioning
 * happens here against the live container size so constant-size labels never
 * collide regardless of viewport width.
 */

export interface Point {
  x: number;
  y: number;
}

export interface LayoutEdge {
  from: number;
  to: number;
}

export interface Box {
  width: number;
  height: number;
}

interface LayoutOptions {
  /** Relaxation passes; more = more settled, still cheap for ~40 nodes. */
  iterations?: number;
  /** Centre-seeking pull per pass, balancing repulsion into a filled blob. */
  gravity?: number;
  /** Edge-pull strength (<1 lengthens edges so clusters breathe). */
  attraction?: number;
  /** Inset from the frame edge, in the same units as width/height. */
  padding?: number;
}

const DEFAULTS = {
  iterations: 400,
  gravity: 0.09,
  attraction: 0.25,
  padding: 24,
} as const;

/**
 * Deterministic PRNG (mulberry32) so a given graph + size always lays out the
 * same way — no animated jitter between renders, stable across resizes.
 */
const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Fruchterman-Reingold: every node repels every other, edges pull their
 * endpoints together, gravity keeps clusters from drifting to the corners, and
 * the system cools over a fixed number of passes. Returns settled points framed
 * to fill the box (each axis independently).
 */
export const layoutGraph = (
  count: number,
  edges: LayoutEdge[],
  width: number,
  height: number,
  options: LayoutOptions = {},
): Point[] => {
  const iterations = options.iterations ?? DEFAULTS.iterations;
  const gravity = options.gravity ?? DEFAULTS.gravity;
  const attraction = options.attraction ?? DEFAULTS.attraction;
  const padding = options.padding ?? DEFAULTS.padding;

  if (count === 0) {
    return [];
  }

  const minX = padding;
  const minY = padding;
  const maxX = Math.max(padding + 1, width - padding);
  const maxY = Math.max(padding + 1, height - padding);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const k = Math.sqrt(((maxX - minX) * (maxY - minY)) / count);

  interface SimNode {
    x: number;
    y: number;
    dx: number;
    dy: number;
  }

  const random = seededRandom(0x9e3779b9);
  const sim: SimNode[] = Array.from({ length: count }, () => ({
    x: minX + random() * (maxX - minX),
    y: minY + random() * (maxY - minY),
    dx: 0,
    dy: 0,
  }));

  const simEdges = edges
    .map(edge => ({ from: sim[edge.from], to: sim[edge.to] }))
    .filter((edge): edge is { from: SimNode; to: SimNode } => Boolean(edge.from && edge.to));

  let temperature = (maxX - minX) / 10;
  const cooling = temperature / (iterations + 1);

  for (let pass = 0; pass < iterations; pass++) {
    for (const node of sim) {
      node.dx = 0;
      node.dy = 0;
    }
    for (const a of sim) {
      for (const b of sim) {
        if (a === b) {
          continue;
        }
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const force = (k * k) / dist;
        a.dx += (dx / dist) * force;
        a.dy += (dy / dist) * force;
      }
    }
    for (const { from, to } of simEdges) {
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = ((dist * dist) / k) * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      from.dx -= fx;
      from.dy -= fy;
      to.dx += fx;
      to.dy += fy;
    }
    for (const node of sim) {
      node.dx += (centerX - node.x) * gravity;
      node.dy += (centerY - node.y) * gravity;
    }
    for (const node of sim) {
      const length = Math.hypot(node.dx, node.dy) || 0.01;
      const step = Math.min(length, temperature);
      node.x += (node.dx / length) * step;
      node.y += (node.dy / length) * step;
    }
    temperature -= cooling;
  }

  // Frame to fill the box on each axis.
  const xs = sim.map(node => node.x);
  const ys = sim.map(node => node.y);
  const minPx = Math.min(...xs);
  const minPy = Math.min(...ys);
  const spanX = Math.max(...xs) - minPx;
  const spanY = Math.max(...ys) - minPy;
  return sim.map(node => ({
    x: spanX > 0 ? minX + ((node.x - minPx) / spanX) * (maxX - minX) : centerX,
    y: spanY > 0 ? minY + ((node.y - minPy) / spanY) * (maxY - minY) : centerY,
  }));
};

export type LabelSide = 'above' | 'below' | 'left' | 'right';

const SIDES: LabelSide[] = ['above', 'below', 'left', 'right'];

interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** The rect a label occupies when placed on a given side of its dot. */
const labelRect = (point: Point, box: Box, side: LabelSide, dotR: number, gap: number): Rect => {
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  let cx = point.x;
  let cy = point.y;
  if (side === 'above') {
    cy = point.y - dotR - gap - halfH;
  } else if (side === 'below') {
    cy = point.y + dotR + gap + halfH;
  } else if (side === 'left') {
    cx = point.x - dotR - gap - halfW;
  } else {
    cx = point.x + dotR + gap + halfW;
  }
  return { l: cx - halfW, t: cy - halfH, r: cx + halfW, b: cy + halfH };
};

const overlapArea = (a: Rect, b: Rect): number => {
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return w > 0 && h > 0 ? w * h : 0;
};

/**
 * Four-position labelling: each label is parked above, below, left or right of
 * its dot — whichever side overlaps the fewest other labels and dots (and stays
 * in frame). This is the standard map-labelling technique; choosing the free
 * side per node clears crowding that "always above" can't, since wide labels in
 * a tight cluster stop fighting for the same space. Greedy coordinate descent
 * over a few passes settles it. Returns the chosen side per node.
 */
export const placeLabels = (
  points: Point[],
  boxes: Box[],
  width: number,
  height: number,
  dotR = 6,
  gap = 6,
): LabelSide[] => {
  const assigned: LabelSide[] = points.map(() => 'above');
  const dotRects: Rect[] = points.map(p => ({ l: p.x - dotR, t: p.y - dotR, r: p.x + dotR, b: p.y + dotR }));

  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const box = boxes[i];
      if (!point || !box) {
        continue;
      }
      let bestSide: LabelSide = assigned[i] ?? 'above';
      let bestCost = Infinity;
      for (const side of SIDES) {
        const rect = labelRect(point, box, side, dotR, gap);
        let cost = 0;
        // Heavy penalty for leaving the frame.
        if (rect.l < 0) {
          cost += -rect.l * 1000;
        }
        if (rect.t < 0) {
          cost += -rect.t * 1000;
        }
        if (rect.r > width) {
          cost += (rect.r - width) * 1000;
        }
        if (rect.b > height) {
          cost += (rect.b - height) * 1000;
        }
        for (let j = 0; j < points.length; j++) {
          if (j === i) {
            continue;
          }
          const other = points[j];
          const otherBox = boxes[j];
          if (!other || !otherBox) {
            continue;
          }
          cost += overlapArea(rect, labelRect(other, otherBox, assigned[j] ?? 'above', dotR, gap));
        }
        for (const dot of dotRects) {
          cost += overlapArea(rect, dot);
        }
        if (cost < bestCost) {
          bestCost = cost;
          bestSide = side;
        }
      }
      if (bestSide !== assigned[i]) {
        assigned[i] = bestSide;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return assigned;
};

/**
 * Nudges points apart until their label boxes (centred on each point) no longer
 * overlap — the d3-forceCollide idea, by hand: each pass shoves every
 * overlapping pair out along their centre line by half the overlap, then clamps
 * back inside the frame. A handful of passes clears typical label crowding;
 * mutates the points in place.
 */
export const resolveCollisions = (
  points: Point[],
  boxes: Box[],
  width: number,
  height: number,
  passes = 80,
): void => {
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let a = 0; a < points.length; a++) {
      for (let b = a + 1; b < points.length; b++) {
        const pa = points[a];
        const pb = points[b];
        const ba = boxes[a];
        const bb = boxes[b];
        if (!pa || !pb || !ba || !bb) {
          continue;
        }
        const minGapX = (ba.width + bb.width) / 2;
        const minGapY = (ba.height + bb.height) / 2;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const overlapX = minGapX - Math.abs(dx);
        const overlapY = minGapY - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        moved = true;
        // Resolve along the axis of least overlap (smaller push).
        if (overlapX < overlapY) {
          const shift = (overlapX / 2 + 0.5) * (dx < 0 ? -1 : 1);
          pa.x -= shift;
          pb.x += shift;
        } else {
          const shift = (overlapY / 2 + 0.5) * (dy < 0 ? -1 : 1);
          pa.y -= shift;
          pb.y += shift;
        }
      }
    }
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const box = boxes[i];
      if (!p || !box) {
        continue;
      }
      p.x = Math.min(width - box.width / 2, Math.max(box.width / 2, p.x));
      p.y = Math.min(height - box.height / 2, Math.max(box.height / 2, p.y));
    }
    if (!moved) {
      break;
    }
  }
};
