import type { Localized } from '../types';

/**
 * Where a partner registers from: the district headquarters of Bihar.
 *
 * A fixed list rather than free text, so the backend can route by city without
 * reconciling "Patna", "patna" and "पटना" as three places. Names are content,
 * served per locale, so each carries both spellings; the id is what is stored.
 * Hindi names are the ones on the railway station boards.
 */
export interface City {
  id: string;
  name: Localized;
}

export const BIHAR_CITIES: City[] = [
  { id: 'patna', name: { en: 'Patna', hi: 'पटना' } },
  { id: 'gaya', name: { en: 'Gaya', hi: 'गया' } },
  { id: 'bhagalpur', name: { en: 'Bhagalpur', hi: 'भागलपुर' } },
  { id: 'muzaffarpur', name: { en: 'Muzaffarpur', hi: 'मुज़फ़्फ़रपुर' } },
  { id: 'darbhanga', name: { en: 'Darbhanga', hi: 'दरभंगा' } },
  { id: 'purnia', name: { en: 'Purnia', hi: 'पूर्णिया' } },
  { id: 'ara', name: { en: 'Ara', hi: 'आरा' } },
  { id: 'begusarai', name: { en: 'Begusarai', hi: 'बेगूसराय' } },
  { id: 'chhapra', name: { en: 'Chhapra', hi: 'छपरा' } },
  { id: 'katihar', name: { en: 'Katihar', hi: 'कटिहार' } },
  { id: 'munger', name: { en: 'Munger', hi: 'मुंगेर' } },
  { id: 'saharsa', name: { en: 'Saharsa', hi: 'सहरसा' } },
];
