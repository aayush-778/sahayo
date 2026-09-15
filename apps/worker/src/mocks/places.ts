import type { BookingAddress } from '@sahayo/shared';

/**
 * Real Patna localities, so distances and routes are plausible rather than
 * points in the Ganga. The demo partner is based in Rajendra Nagar.
 */
export const places = {
  kankarbagh: {
    line1: 'House 27, Lane 2',
    line2: 'Kankarbagh Colony',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800020',
    point: { lat: 25.5905, lng: 85.159 },
  },
  boringRoad: {
    line1: 'Flat 204, Anand Vihar',
    line2: 'Boring Road',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800001',
    point: { lat: 25.6168, lng: 85.1136 },
  },
  patliputra: {
    line1: 'B-14, Patliputra Colony',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800013',
    point: { lat: 25.6206, lng: 85.0963 },
  },
  rajendraNagar: {
    line1: 'Road No. 6, Block C',
    line2: 'Rajendra Nagar',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800016',
    point: { lat: 25.5998, lng: 85.1601 },
  },
  kadamkuan: {
    line1: 'Near Congress Maidan',
    line2: 'Kadamkuan',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800003',
    point: { lat: 25.6079, lng: 85.1486 },
  },
  gardanibagh: {
    line1: 'Quarter 9, Road No. 2',
    line2: 'Gardanibagh',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800002',
    point: { lat: 25.5936, lng: 85.1238 },
  },
  bailey: {
    line1: 'Shop 3, Market Complex',
    line2: 'Bailey Road',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800014',
    point: { lat: 25.6112, lng: 85.1015 },
  },
  saguna: {
    line1: 'Villa 11, Green Park',
    line2: 'Saguna More',
    city: 'Patna',
    state: 'Bihar',
    pincode: '801503',
    point: { lat: 25.6311, lng: 85.0506 },
  },
} satisfies Record<string, BookingAddress>;
