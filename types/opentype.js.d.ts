// Minimal ambient types for the untyped `opentype.js` package: only the
// surface the social card renderer uses. A bare `declare module` would type
// every import `any`, and nothing drawn through the font would be checked.
declare module 'opentype.js' {
  interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  interface PathDataOptions {
    decimalPlaces?: number;
    flipY?: boolean;
  }

  interface Path {
    getBoundingBox(): BoundingBox;
    toPathData(options?: PathDataOptions): string;
  }

  interface Font {
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }

  const opentype: {
    parse(buffer: ArrayBuffer | Uint8Array): Font;
  };

  export default opentype;
}
