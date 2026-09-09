/** All ids are opaque strings at this layer; the database decides their shape. */
export type Id = string;

/** ISO-8601 timestamp string. */
export type IsoDateTime = string;

/** Minor units of INR (paise). Money is never a float in this codebase. */
export type Paise = number;

export interface GeoPoint {
  lat: number;
  lng: number;
}
