import type { Zone } from '../index';

/**
 * The twelve Patna zones the platform operates in.
 *
 * Centroids are real coordinates for the named neighbourhoods, because the
 * dispatch map in Phase 4 pans to them and a plausible-looking city that is
 * geographically wrong reads as fake the moment anyone from Patna looks at it.
 * Bounds are a rough box around each centroid — enough to draw a zone and to
 * test containment, not a survey boundary.
 *
 * Hand-written rather than generated: twelve real places with real coordinates
 * is data, not randomness, and nothing about it should move when a seed changes.
 */
export const ZONES: Zone[] = [
  {
    id: 'zone-boring-road',
    slug: 'boring-road',
    name: 'Boring Road',
    centroid: { lat: 25.6093, lng: 85.1104 },
    bounds: { south: 25.5993, west: 85.1004, north: 25.6193, east: 85.1204 },
  },
  {
    id: 'zone-kankarbagh',
    slug: 'kankarbagh',
    name: 'Kankarbagh',
    centroid: { lat: 25.5941, lng: 85.1615 },
    bounds: { south: 25.5821, west: 85.1495, north: 25.6061, east: 85.1735 },
  },
  {
    id: 'zone-bailey-road',
    slug: 'bailey-road',
    name: 'Bailey Road',
    centroid: { lat: 25.6156, lng: 85.0892 },
    bounds: { south: 25.6056, west: 85.0752, north: 25.6256, east: 85.1032 },
  },
  {
    id: 'zone-rajendra-nagar',
    slug: 'rajendra-nagar',
    name: 'Rajendra Nagar',
    centroid: { lat: 25.6043, lng: 85.1519 },
    bounds: { south: 25.5963, west: 85.1439, north: 25.6123, east: 85.1599 },
  },
  {
    id: 'zone-danapur',
    slug: 'danapur',
    name: 'Danapur',
    centroid: { lat: 25.6346, lng: 85.0479 },
    bounds: { south: 25.6206, west: 85.0319, north: 25.6486, east: 85.0639 },
  },
  {
    id: 'zone-patliputra',
    slug: 'patliputra',
    name: 'Patliputra',
    centroid: { lat: 25.6241, lng: 85.1022 },
    bounds: { south: 25.6161, west: 85.0942, north: 25.6321, east: 85.1102 },
  },
  {
    id: 'zone-ashok-rajpath',
    slug: 'ashok-rajpath',
    name: 'Ashok Rajpath',
    centroid: { lat: 25.6202, lng: 85.1782 },
    bounds: { south: 25.6122, west: 85.1642, north: 25.6282, east: 85.1922 },
  },
  {
    id: 'zone-bihta',
    slug: 'bihta',
    name: 'Bihta',
    centroid: { lat: 25.5553, lng: 84.8703 },
    bounds: { south: 25.5403, west: 84.8503, north: 25.5703, east: 84.8903 },
  },
  {
    id: 'zone-phulwari-sharif',
    slug: 'phulwari-sharif',
    name: 'Phulwari Sharif',
    centroid: { lat: 25.5744, lng: 85.0564 },
    bounds: { south: 25.5624, west: 85.0424, north: 25.5864, east: 85.0704 },
  },
  {
    id: 'zone-gandhi-maidan',
    slug: 'gandhi-maidan',
    name: 'Gandhi Maidan',
    centroid: { lat: 25.6129, lng: 85.1442 },
    bounds: { south: 25.6069, west: 85.1372, north: 25.6189, east: 85.1512 },
  },
  {
    id: 'zone-patna-city',
    slug: 'patna-city',
    name: 'Patna City',
    centroid: { lat: 25.6005, lng: 85.2059 },
    bounds: { south: 25.5885, west: 85.1919, north: 25.6125, east: 85.2199 },
  },
  {
    id: 'zone-khagaul',
    slug: 'khagaul',
    name: 'Khagaul',
    centroid: { lat: 25.5791, lng: 85.0393 },
    bounds: { south: 25.5691, west: 85.0273, north: 25.5891, east: 85.0513 },
  },
];

export const ZONE_IDS = ZONES.map((zone) => zone.id);

const ZONES_BY_ID = new Map(ZONES.map((zone) => [zone.id, zone]));

export function getZone(zoneId: string): Zone | undefined {
  return ZONES_BY_ID.get(zoneId);
}

export function zoneName(zoneId: string): string {
  return ZONES_BY_ID.get(zoneId)?.name ?? 'Unknown zone';
}
