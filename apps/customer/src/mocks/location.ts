import type { GeoPoint } from '@sahayo/shared';

/**
 * The customer's current service area, shown under the greeting on Home.
 *
 * A mock string for now. In Phase 5 this comes from a reverse geocode of the
 * device's foreground location, or from the saved address the customer picked
 * — which is why it is modelled with a point as well as a label rather than
 * as a bare string. The chevron beside it on Home is decorative until an
 * address picker exists.
 *
 * Localised on the record rather than in the i18next catalogue: a place name
 * is content, and Phase 5 will serve it per-locale the same way.
 */
export interface ServiceLocation {
  label: string;
  labelLocalized?: Record<string, string>;
  point: GeoPoint;
}

export const mockServiceLocation: ServiceLocation = {
  label: 'Rajendra Nagar, Patna',
  labelLocalized: { hi: 'राजेंद्र नगर, पटना' },
  point: { lat: 25.6013, lng: 85.1553 },
};
