import type { Id, Paise } from '@sahayo/shared';

/**
 * Banner offers and featured services for Home.
 *
 * Nothing here duplicates a price. A featured service names a service item by
 * id and carries only the discount and the photo; the fare still comes from
 * `services.ts`, so a price can never be right in one file and stale in
 * another.
 *
 * Titles and subtitles are localised on the record, the same way category
 * names are — this is catalogue content, which a real backend would serve
 * per-locale, not UI chrome from the i18next catalogue.
 */

/**
 * Photographs are loaded over the network from Unsplash's CDN.
 *
 * Every id below was checked to return HTTP 200 before being committed. What
 * they DEPICT has not been verified — say the word on any that looks wrong
 * for its offer and I will swap it.
 *
 * Because these are remote, a phone with no connection shows no photograph.
 * Every card that uses one is painted on a solid brand ground first, so a
 * failed or slow load degrades to a coloured card with legible text rather
 * than to a hole in the layout. If the venue's wifi is a real worry, the
 * whole set can be downloaded into `assets/images/` and this module changed
 * to `require()` them — no component would need to change.
 */
function unsplash(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?w=800&q=80&auto=format&fit=crop`;
}

export interface Promotion {
  id: Id;
  title: string;
  titleLocalized?: Record<string, string>;
  subtitle: string;
  subtitleLocalized?: Record<string, string>;
  /** Whole percent off. Rendered through `home.percentOff`. */
  discountPercent: number;
  imageUrl: string;
  /** Where tapping the banner goes. */
  categoryId: Id;
}

export const bannerPromotions: Promotion[] = [
  {
    id: 'promo_first_clean',
    title: 'House Cleaning',
    titleLocalized: { hi: 'घर की सफ़ाई' },
    subtitle: 'On your first cleaning service',
    subtitleLocalized: { hi: 'आपकी पहली सफ़ाई सेवा पर' },
    discountPercent: 40,
    imageUrl: unsplash('1581578731548-c64695cc6952'),
    categoryId: 'cat_cleaners',
  },
  {
    id: 'promo_ac_season',
    title: 'AC Service Season',
    titleLocalized: { hi: 'एसी सेवा सीज़न' },
    subtitle: 'Book before the summer rush',
    subtitleLocalized: { hi: 'गर्मी की भीड़ से पहले बुक करें' },
    discountPercent: 35,
    imageUrl: unsplash('1631679706909-1844bbd07221'),
    categoryId: 'cat_technicians',
  },
  {
    id: 'promo_fresh_paint',
    title: 'Fresh Paint',
    titleLocalized: { hi: 'नई रंगाई' },
    subtitle: 'Two coats, one weekend',
    subtitleLocalized: { hi: 'दो कोट, एक सप्ताहांत' },
    discountPercent: 45,
    imageUrl: unsplash('1615873968403-89e068629265'),
    categoryId: 'cat_painters',
  },
  {
    id: 'promo_plumbing',
    title: 'Plumbing Fixes',
    titleLocalized: { hi: 'प्लंबिंग मरम्मत' },
    subtitle: 'Taps, drains and tank work',
    subtitleLocalized: { hi: 'नल, नाली और टंकी का काम' },
    discountPercent: 25,
    imageUrl: unsplash('1607472586893-edb57bdc0e39'),
    categoryId: 'cat_plumbers',
  },
  {
    id: 'promo_electrical',
    title: 'Electrical Care',
    titleLocalized: { hi: 'बिजली की देखभाल' },
    subtitle: 'Fans, lights and wiring faults',
    subtitleLocalized: { hi: 'पंखे, लाइट और वायरिंग की खराबी' },
    discountPercent: 30,
    imageUrl: unsplash('1621905251189-08b45d6a269e'),
    categoryId: 'cat_electricians',
  },
  {
    id: 'promo_kitchen_deep',
    title: 'Deep Kitchen Clean',
    titleLocalized: { hi: 'गहरी रसोई सफ़ाई' },
    subtitle: 'Chimney and degreasing included',
    subtitleLocalized: { hi: 'चिमनी और ग्रीस सफ़ाई शामिल' },
    discountPercent: 30,
    imageUrl: unsplash('1556909212-d5b604d0c90d'),
    categoryId: 'cat_cleaners',
  },
  {
    id: 'promo_carpentry',
    title: 'Carpentry Week',
    titleLocalized: { hi: 'बढ़ईगीरी सप्ताह' },
    subtitle: 'Doors, beds and wardrobes',
    subtitleLocalized: { hi: 'दरवाज़े, बेड और अलमारी' },
    discountPercent: 20,
    imageUrl: unsplash('1584622650111-993a426fbf0a'),
    categoryId: 'cat_carpenters',
  },
  {
    id: 'promo_waterproofing',
    title: 'Monsoon Ready',
    titleLocalized: { hi: 'मानसून के लिए तैयार' },
    subtitle: 'Waterproof before the rains',
    subtitleLocalized: { hi: 'बारिश से पहले वॉटरप्रूफ़िंग' },
    discountPercent: 15,
    imageUrl: unsplash('1493809842364-78817add7ffb'),
    categoryId: 'cat_painters',
  },
];

export interface FeaturedService {
  /** Points at a row in `services.ts`. The fare lives there, not here. */
  serviceItemId: Id;
  discountPercent: number;
  imageUrl: string;
}

export const featuredServices: FeaturedService[] = [
  {
    serviceItemId: 'svc_ac_service',
    discountPercent: 20,
    imageUrl: unsplash('1628177142898-93e36e4e3a50'),
  },
  {
    serviceItemId: 'svc_bathroom_deep',
    discountPercent: 15,
    imageUrl: unsplash('1620626011761-996317b8d101'),
  },
  {
    serviceItemId: 'svc_fan_repair',
    discountPercent: 25,
    imageUrl: unsplash('1558618666-fcd25c85cd64'),
  },
  {
    serviceItemId: 'svc_kitchen_deep',
    discountPercent: 30,
    imageUrl: unsplash('1600585154340-be6161a56a0c'),
  },
  {
    serviceItemId: 'svc_paint_room',
    discountPercent: 10,
    imageUrl: unsplash('1589939705384-5185137a7f0f'),
  },
  {
    serviceItemId: 'svc_wm_service',
    discountPercent: 20,
    imageUrl: unsplash('1571902943202-507ec2618e8f'),
  },
];

/** Paise in one rupee. */
const PAISE_PER_RUPEE = 100;

/**
 * Applies a percentage discount to integer paise, rounded to a whole rupee.
 *
 * The rupee rounding is not cosmetic tidying. 20% off ₹599 is ₹479.20 to the
 * paisa, and no home-services app in India quotes a fare with paise in it —
 * the price would render as "₹479.20" and read as a billing error rather than
 * as an offer. Rounding to the nearest rupee here keeps the arithmetic in
 * integers end to end and keeps `formatPaise` free of any opinion about it.
 *
 * Money is integer paise from the catalogue all the way to the render edge;
 * this is the only place a fare is transformed, and it returns paise too.
 */
export function discountedPaise(basePaise: Paise, discountPercent: number): Paise {
  const exact = (basePaise * (100 - discountPercent)) / 100;
  return Math.round(exact / PAISE_PER_RUPEE) * PAISE_PER_RUPEE;
}
