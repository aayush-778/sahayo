/**
 * The shape of Patna, and how the twelve zones divide it.
 *
 * This replaced a honeycomb of hexagons. A hex grid is quick to draw and instantly
 * reads as a generated diagram rather than a place: it told a viewer nothing about
 * Patna, and "boxy" was the fair verdict. What follows produces real zone areas —
 * organic, bounded by the city's own outline, with the Ganga where the Ganga is.
 *
 * Still no tile provider and no API key. Everything here is arithmetic over a
 * hand-authored outline, which is exactly why it can serve as the dispatch map's
 * offline fallback: it needs no network to render at all.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The built-up extent of Patna, south of the Ganga.
 *
 * An approximation, traced to be recognisable rather than surveyed: the river edge
 * along the north, the city spreading south and east toward Patna City, and the
 * western arm out past Danapur toward Bihta. Coordinates run anticlockwise from the
 * north-west.
 *
 * It is deliberately generous enough to contain all twelve zone centroids with room
 * around them — a centroid outside the outline would get no cell at all.
 */
export const PATNA_OUTLINE: LngLat[] = [
  { lng: 84.849, lat: 25.589 },
  { lng: 84.868, lat: 25.606 },
  { lng: 84.9, lat: 25.619 },
  { lng: 84.952, lat: 25.624 },
  { lng: 84.996, lat: 25.634 },
  { lng: 85.032, lat: 25.648 },
  { lng: 85.07, lat: 25.652 },
  { lng: 85.104, lat: 25.645 },
  { lng: 85.137, lat: 25.637 },
  { lng: 85.168, lat: 25.639 },
  { lng: 85.196, lat: 25.632 },
  { lng: 85.229, lat: 25.62 },
  { lng: 85.247, lat: 25.602 },
  { lng: 85.241, lat: 25.58 },
  { lng: 85.218, lat: 25.566 },
  { lng: 85.185, lat: 25.558 },
  { lng: 85.146, lat: 25.552 },
  { lng: 85.104, lat: 25.548 },
  { lng: 85.062, lat: 25.544 },
  { lng: 85.016, lat: 25.539 },
  { lng: 84.964, lat: 25.533 },
  { lng: 84.92, lat: 25.535 },
  { lng: 84.884, lat: 25.537 },
  { lng: 84.858, lat: 25.551 },
  { lng: 84.847, lat: 25.569 },
];

/**
 * The Ganga, as a band along the north.
 *
 * Drawn as a closed polygon rather than a thick line so its two banks can curve
 * independently — the river is wider opposite Danapur and narrows past Patna City,
 * and that taper is most of what makes the outline legible as Patna rather than as
 * an arbitrary blob. The south bank traces the city's northern edge.
 */
export const GANGA_BAND: LngLat[] = [
  /* South bank, west to east, following the city's northern edge. */
  { lng: 84.849, lat: 25.589 },
  { lng: 84.868, lat: 25.606 },
  { lng: 84.9, lat: 25.619 },
  { lng: 84.952, lat: 25.624 },
  { lng: 84.996, lat: 25.634 },
  { lng: 85.032, lat: 25.648 },
  { lng: 85.07, lat: 25.652 },
  { lng: 85.104, lat: 25.645 },
  { lng: 85.137, lat: 25.637 },
  { lng: 85.168, lat: 25.639 },
  { lng: 85.196, lat: 25.632 },
  { lng: 85.229, lat: 25.62 },
  { lng: 85.247, lat: 25.602 },
  /* North bank, east back to west. Wider in the middle reach. */
  { lng: 85.256, lat: 25.618 },
  { lng: 85.234, lat: 25.639 },
  { lng: 85.196, lat: 25.651 },
  { lng: 85.15, lat: 25.657 },
  { lng: 85.1, lat: 25.666 },
  { lng: 85.05, lat: 25.671 },
  { lng: 84.998, lat: 25.657 },
  { lng: 84.948, lat: 25.644 },
  { lng: 84.9, lat: 25.636 },
  { lng: 84.862, lat: 25.622 },
  { lng: 84.838, lat: 25.6 },
];

/** The Sone, joining the Ganga from the south-west past Bihta. */
export const SONE_BAND: LngLat[] = [
  { lng: 84.849, lat: 25.589 },
  { lng: 84.847, lat: 25.569 },
  { lng: 84.838, lat: 25.542 },
  { lng: 84.827, lat: 25.543 },
  { lng: 84.831, lat: 25.574 },
  { lng: 84.838, lat: 25.6 },
];

/** The drawing surface the projection maps into. */
export const VIEWBOX = { width: 640, height: 264, padding: 10 } as const;

/**
 * Projects longitude and latitude into the viewBox.
 *
 * Equirectangular with the longitude axis scaled by cos(latitude), which keeps
 * Patna's proportions right at this scale — a plain lng/lat plot stretches the city
 * about 10% too wide at 25.6°N. The bounds are computed from the outline and the
 * river together, so nothing drawn can fall outside the frame.
 */
export function createProjection(rings: LngLat[][]): (point: LngLat) => Point {
  const all = rings.flat();
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  /* One degree of longitude covers less ground than one of latitude, by cos(lat). */
  const midLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const lngScale = Math.cos(midLatRad);

  const spanX = (maxLng - minLng) * lngScale;
  const spanY = maxLat - minLat;

  const usableWidth = VIEWBOX.width - VIEWBOX.padding * 2;
  const usableHeight = VIEWBOX.height - VIEWBOX.padding * 2;
  /* One scale for both axes, so the city is never stretched to fill the box. */
  const scale = Math.min(usableWidth / spanX, usableHeight / spanY);

  const offsetX = (VIEWBOX.width - spanX * scale) / 2;
  const offsetY = (VIEWBOX.height - spanY * scale) / 2;

  return function project(point: LngLat): Point {
    return {
      x: offsetX + (point.lng - minLng) * lngScale * scale,
      /* SVG y grows downward; latitude grows north. */
      y: offsetY + (maxLat - point.lat) * scale,
    };
  };
}

/** An SVG path string for a closed ring. */
export function toPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M${first.x.toFixed(2)},${first.y.toFixed(2)}${rest
    .map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join('')}Z`;
}

/**
 * Clips a convex-or-concave polygon to one side of a line, by Sutherland–Hodgman.
 *
 * `inside` returns true for points to keep. Used below with perpendicular
 * bisectors: clipping the city outline by the bisector between two zone centres
 * leaves the part nearer the first centre.
 */
function clipToHalfPlane(
  polygon: Point[],
  inside: (p: Point) => boolean,
  intersect: (a: Point, b: Point) => Point,
): Point[] {
  const output: Point[] = [];

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentIn = inside(current);
    const previousIn = inside(previous);

    if (currentIn) {
      /* Entering the half-plane: add the crossing point first. */
      if (!previousIn) output.push(intersect(previous, current));
      output.push(current);
    } else if (previousIn) {
      /* Leaving it: add the crossing point and stop. */
      output.push(intersect(previous, current));
    }
  }

  return output;
}

/**
 * Divides the outline into one area per zone centre.
 *
 * A Voronoi partition: every point belongs to the zone whose centre is nearest. For
 * each centre, the outline is clipped by the perpendicular bisector against every
 * other centre, and what survives is that zone's area.
 *
 * Computed rather than hand-drawn for two reasons. It is exact — the boundary
 * between two zones sits precisely halfway between them, which is roughly how
 * service areas actually work — and it stays correct if a zone's coordinates are
 * corrected later, where twelve hand-traced outlines would quietly become wrong.
 *
 * The cells are organic and irregular because the centres are, which is the whole
 * point: the map reads as a city divided up, not as a grid of tiles.
 */
export function voronoiCells(
  centres: { id: string; position: LngLat }[],
  outline: LngLat[],
  project: (point: LngLat) => Point,
): { id: string; polygon: Point[]; centroid: Point }[] {
  const projectedOutline = outline.map(project);
  const sites = centres.map((centre) => ({ id: centre.id, point: project(centre.position) }));

  return sites.map((site) => {
    let cell = projectedOutline;

    for (const other of sites) {
      if (other.id === site.id) continue;
      if (cell.length === 0) break;

      /*
       * The bisector of `site` and `other`, as a line through their midpoint with
       * normal pointing from other toward site. A point is kept when it lies on
       * site's side, which is the same as being nearer to site.
       */
      const nx = site.point.x - other.point.x;
      const ny = site.point.y - other.point.y;
      const midX = (site.point.x + other.point.x) / 2;
      const midY = (site.point.y + other.point.y) / 2;
      const signedDistance = (p: Point): number => nx * (p.x - midX) + ny * (p.y - midY);

      cell = clipToHalfPlane(
        cell,
        (p) => signedDistance(p) >= 0,
        (a, b) => {
          const da = signedDistance(a);
          const db = signedDistance(b);
          /* Where the segment crosses zero. The denominator cannot be zero here. */
          const t = da / (da - db);
          return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        },
      );
    }

    return { id: site.id, polygon: cell, centroid: polygonCentroid(cell) ?? site.point };
  });
}

/**
 * The area centroid of a polygon, for placing a label.
 *
 * The area centroid rather than the average of the vertices: a cell with many
 * closely spaced points along one edge would pull a vertex average toward that edge
 * and push the label off the shape.
 */
function polygonCentroid(polygon: Point[]): Point | undefined {
  if (polygon.length < 3) return undefined;

  let twiceArea = 0;
  let x = 0;
  let y = 0;

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }

  if (twiceArea === 0) return undefined;
  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) };
}

/** Polygon area in square viewBox units, for deciding whether a label fits. */
export function polygonArea(polygon: Point[]): number {
  if (polygon.length < 3) return 0;
  let twiceArea = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twiceArea) / 2;
}
