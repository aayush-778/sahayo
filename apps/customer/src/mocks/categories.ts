import type { Id, ServiceCategory } from '@sahayo/shared';

/**
 * Mock catalogue. Phase 5 replaces the exports, not the shapes.
 *
 * Categories are named by WORKER TYPE — "Electricians", not "Electrical
 * Repair". On a cooperative platform the customer books a person who belongs
 * to a society, not a service SKU off a shelf, and the naming is the first
 * place that shows. Keep the plural worker-type form everywhere in the app.
 *
 * `ServiceCategory` in @sahayo/shared has no parent link and no grouping
 * field, and this phase must not change shared types. Both therefore live in
 * INDEXES rather than on the rows: every node — worker type, sub-category and
 * priced item alike — is a plain `ServiceCategory`, and the maps below record
 * how they relate. That keeps every literal checkable with a bare
 * `satisfies ServiceCategory[]`; a `parentId` or `group` field would fail
 * excess property checking, which is precisely the drift guard we want.
 *
 * `baseFare` is integer paise, and on a parent it is the cheapest thing
 * underneath it — so a card can show a "from ₹x" without loading its
 * children. Never render it directly; use `formatPaise` from
 * @sahayo/ui-native.
 *
 * Hindi names are the spoken forms, not Sanskritised coinages: प्लंबर, not
 * नलसाज़. The two exceptions are deliberate — बढ़ई and माली are the native
 * words people actually use, and सफ़ाईकर्मी is preferred over the loanword
 * because "cleaner" carries class baggage in Indian English that the Hindi
 * worker-type term does not.
 */

/** The ten worker types. This order is fixed and is the display order. */
export const serviceCategories = [
  {
    id: 'cat_electricians',
    slug: 'electricians',
    name: 'Electricians',
    nameLocalized: { hi: 'इलेक्ट्रीशियन' },
    description: 'Switches, fans, wiring and inverters.',
    iconKey: 'flash-outline',
    baseFare: 19900,
    estimatedDurationMin: 30,
    active: true,
  },
  {
    id: 'cat_plumbers',
    slug: 'plumbers',
    name: 'Plumbers',
    nameLocalized: { hi: 'प्लंबर' },
    description: 'Taps, drainage, tanks and leaks.',
    iconKey: 'water-outline',
    baseFare: 19900,
    estimatedDurationMin: 45,
    active: true,
  },
  {
    id: 'cat_carpenters',
    slug: 'carpenters',
    name: 'Carpenters',
    nameLocalized: { hi: 'बढ़ई' },
    description: 'Doors, furniture, wardrobes and fittings.',
    iconKey: 'hammer-outline',
    baseFare: 19900,
    estimatedDurationMin: 45,
    active: true,
  },
  {
    id: 'cat_painters',
    slug: 'painters',
    name: 'Painters',
    nameLocalized: { hi: 'पेंटर' },
    description: 'Walls, polish, texture and waterproofing.',
    iconKey: 'color-palette-outline',
    baseFare: 49900,
    estimatedDurationMin: 180,
    active: true,
  },
  {
    id: 'cat_domestic_helpers',
    slug: 'domestic-helpers',
    name: 'Domestic Helpers',
    nameLocalized: { hi: 'घरेलू सहायक' },
    description: 'Cooking, utensils, laundry and full-day help.',
    iconKey: 'home-outline',
    baseFare: 19900,
    estimatedDurationMin: 45,
    active: true,
  },
  {
    id: 'cat_caregivers',
    slug: 'caregivers',
    name: 'Caregivers',
    nameLocalized: { hi: 'केयरटेकर' },
    description: 'Elder care, attendants and child care.',
    iconKey: 'heart-outline',
    baseFare: 59900,
    estimatedDurationMin: 240,
    active: true,
  },
  {
    id: 'cat_drivers',
    slug: 'drivers',
    name: 'Drivers',
    nameLocalized: { hi: 'ड्राइवर' },
    description: 'By the hour, monthly, outstation and airport.',
    iconKey: 'car-outline',
    baseFare: 19900,
    estimatedDurationMin: 60,
    active: true,
  },
  {
    id: 'cat_gardeners',
    slug: 'gardeners',
    name: 'Gardeners',
    nameLocalized: { hi: 'माली' },
    description: 'Lawns, plant care, terrace gardens and planting.',
    iconKey: 'leaf-outline',
    baseFare: 24900,
    estimatedDurationMin: 60,
    active: true,
  },
  {
    id: 'cat_cleaners',
    slug: 'cleaners',
    name: 'Cleaners',
    nameLocalized: { hi: 'सफ़ाईकर्मी' },
    description: 'Bathrooms, kitchens, full homes and upholstery.',
    iconKey: 'sparkles-outline',
    baseFare: 39900,
    estimatedDurationMin: 60,
    active: true,
  },
  {
    id: 'cat_technicians',
    slug: 'technicians',
    name: 'Technicians',
    nameLocalized: { hi: 'तकनीशियन' },
    description: 'AC, washing machines, fridges and electronics.',
    iconKey: 'construct-outline',
    baseFare: 29900,
    estimatedDurationMin: 60,
    active: true,
  },
] satisfies ServiceCategory[];

/**
 * The chip groups above the categories grid.
 *
 * A partition, not a second view of the same list: every worker type belongs
 * to exactly one group, so tapping a chip genuinely narrows the grid instead
 * of restating it. Sizes are 4 / 3 / 3 on purpose — a group holding a single
 * category is a chip nobody has a reason to tap.
 *
 * Drivers sits under Home Support rather than in a transport group of one: a
 * monthly or live-in driver is household staff in this market. The label is
 * "Home Support" and not "Household Staff" deliberately — same meaning,
 * without the hierarchy, which matters on a cooperative platform.
 */
export const CategoryGroup = {
  REPAIRS: 'repairs',
  UPKEEP: 'upkeep',
  HOME_SUPPORT: 'home_support',
} as const;
export type CategoryGroup = (typeof CategoryGroup)[keyof typeof CategoryGroup];

export const CATEGORY_GROUPS = Object.values(CategoryGroup);

export const categoryIdsByGroup: Record<CategoryGroup, Id[]> = {
  [CategoryGroup.REPAIRS]: [
    'cat_electricians',
    'cat_plumbers',
    'cat_carpenters',
    'cat_technicians',
  ],
  [CategoryGroup.UPKEEP]: ['cat_cleaners', 'cat_painters', 'cat_gardeners'],
  [CategoryGroup.HOME_SUPPORT]: ['cat_domestic_helpers', 'cat_caregivers', 'cat_drivers'],
};

/**
 * The five worker types Home surfaces above its "View all" link.
 *
 * An explicit list rather than `slice(0, 5)` so the choice is data someone can
 * edit, not a number buried in a component. These are the first five of the
 * fixed order above; reorder freely, it changes nothing else.
 */
export const homeCategoryIds: Id[] = [
  'cat_electricians',
  'cat_plumbers',
  'cat_carpenters',
  'cat_painters',
  'cat_domestic_helpers',
];

/**
 * Sub-categories, keyed by the worker type they belong to.
 *
 * These sit between the worker type and the priced item: Electricians →
 * Switches & Sockets → "Switch Replacement, ₹199".
 */
export const subCategoriesByCategoryId = {
  cat_electricians: [
    {
      id: 'sub_switches_sockets',
      slug: 'switches-and-sockets',
      name: 'Switches & Sockets',
      nameLocalized: { hi: 'स्विच और सॉकेट' },
      iconKey: 'toggle-outline',
      baseFare: 19900,
      estimatedDurationMin: 30,
      active: true,
    },
    {
      id: 'sub_fans_lights',
      slug: 'fans-and-lights',
      name: 'Fans & Lights',
      nameLocalized: { hi: 'पंखे और लाइट' },
      iconKey: 'bulb-outline',
      baseFare: 24900,
      estimatedDurationMin: 45,
      active: true,
    },
    {
      id: 'sub_wiring_mcb',
      slug: 'wiring-and-mcb',
      name: 'Wiring & MCB',
      nameLocalized: { hi: 'वायरिंग और एमसीबी' },
      iconKey: 'git-branch-outline',
      baseFare: 44900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_inverter_battery',
      slug: 'inverter-and-battery',
      name: 'Inverter & Battery',
      nameLocalized: { hi: 'इन्वर्टर और बैटरी' },
      iconKey: 'battery-charging-outline',
      baseFare: 49900,
      estimatedDurationMin: 90,
      active: true,
    },
  ],
  cat_plumbers: [
    {
      id: 'sub_taps_mixers',
      slug: 'taps-and-mixers',
      name: 'Taps & Mixers',
      nameLocalized: { hi: 'नल और मिक्सर' },
      iconKey: 'water-outline',
      baseFare: 19900,
      estimatedDurationMin: 45,
      active: true,
    },
    {
      id: 'sub_toilet_drainage',
      slug: 'toilet-and-drainage',
      name: 'Toilet & Drainage',
      nameLocalized: { hi: 'शौचालय और नाली' },
      iconKey: 'funnel-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_water_tank_motor',
      slug: 'water-tank-and-motor',
      name: 'Water Tank & Motor',
      nameLocalized: { hi: 'टंकी और मोटर' },
      iconKey: 'cube-outline',
      baseFare: 49900,
      estimatedDurationMin: 120,
      active: true,
    },
    {
      id: 'sub_pipeline_leakage',
      slug: 'pipeline-and-leakage',
      name: 'Pipeline & Leakage',
      nameLocalized: { hi: 'पाइपलाइन और रिसाव' },
      iconKey: 'git-merge-outline',
      baseFare: 39900,
      estimatedDurationMin: 90,
      active: true,
    },
  ],
  cat_carpenters: [
    {
      id: 'sub_doors_windows',
      slug: 'doors-and-windows',
      name: 'Doors & Windows',
      nameLocalized: { hi: 'दरवाज़े और खिड़कियाँ' },
      iconKey: 'browsers-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_furniture_repair',
      slug: 'furniture-repair',
      name: 'Furniture Repair',
      nameLocalized: { hi: 'फ़र्नीचर मरम्मत' },
      iconKey: 'bed-outline',
      baseFare: 34900,
      estimatedDurationMin: 90,
      active: true,
    },
    {
      id: 'sub_wardrobes_storage',
      slug: 'wardrobes-and-storage',
      name: 'Wardrobes & Storage',
      nameLocalized: { hi: 'अलमारी और भंडारण' },
      iconKey: 'file-tray-stacked-outline',
      baseFare: 69900,
      estimatedDurationMin: 180,
      active: true,
    },
    {
      id: 'sub_fittings_mounting',
      slug: 'fittings-and-mounting',
      name: 'Fittings & Mounting',
      nameLocalized: { hi: 'फ़िटिंग और माउंटिंग' },
      iconKey: 'options-outline',
      baseFare: 19900,
      estimatedDurationMin: 45,
      active: true,
    },
  ],
  cat_painters: [
    {
      id: 'sub_wall_painting',
      slug: 'wall-painting',
      name: 'Wall Painting',
      nameLocalized: { hi: 'दीवार पेंटिंग' },
      iconKey: 'color-fill-outline',
      baseFare: 49900,
      estimatedDurationMin: 180,
      active: true,
    },
    {
      id: 'sub_wood_polish',
      slug: 'wood-polish',
      name: 'Wood Polish',
      nameLocalized: { hi: 'लकड़ी पॉलिश' },
      iconKey: 'brush-outline',
      baseFare: 69900,
      estimatedDurationMin: 180,
      active: true,
    },
    {
      id: 'sub_waterproofing',
      slug: 'waterproofing',
      name: 'Waterproofing',
      nameLocalized: { hi: 'वॉटरप्रूफ़िंग' },
      iconKey: 'umbrella-outline',
      baseFare: 99900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_texture_stencil',
      slug: 'texture-and-stencil',
      name: 'Texture & Stencil',
      nameLocalized: { hi: 'टेक्सचर और स्टेंसिल' },
      iconKey: 'grid-outline',
      baseFare: 79900,
      estimatedDurationMin: 240,
      active: true,
    },
  ],
  cat_domestic_helpers: [
    {
      id: 'sub_cooking',
      slug: 'cooking',
      name: 'Cooking',
      nameLocalized: { hi: 'खाना बनाना' },
      iconKey: 'restaurant-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_dishwashing',
      slug: 'dishwashing',
      name: 'Dishwashing',
      nameLocalized: { hi: 'बर्तन धुलाई' },
      iconKey: 'wine-outline',
      baseFare: 19900,
      estimatedDurationMin: 45,
      active: true,
    },
    {
      id: 'sub_laundry_ironing',
      slug: 'laundry-and-ironing',
      name: 'Laundry & Ironing',
      nameLocalized: { hi: 'कपड़े धुलाई और इस्त्री' },
      iconKey: 'shirt-outline',
      baseFare: 24900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_full_day_help',
      slug: 'full-day-help',
      name: 'Full-day Help',
      nameLocalized: { hi: 'पूरे दिन की सहायता' },
      iconKey: 'time-outline',
      baseFare: 99900,
      estimatedDurationMin: 480,
      active: true,
    },
  ],
  cat_caregivers: [
    {
      id: 'sub_elder_care',
      slug: 'elder-care',
      name: 'Elder Care',
      nameLocalized: { hi: 'बुज़ुर्गों की देखभाल' },
      iconKey: 'accessibility-outline',
      baseFare: 79900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_patient_attendant',
      slug: 'patient-attendant',
      name: 'Patient Attendant',
      nameLocalized: { hi: 'मरीज़ अटेंडेंट' },
      iconKey: 'medkit-outline',
      baseFare: 99900,
      estimatedDurationMin: 480,
      active: true,
    },
    {
      id: 'sub_child_care',
      slug: 'child-care',
      name: 'Child Care',
      nameLocalized: { hi: 'बच्चों की देखभाल' },
      iconKey: 'happy-outline',
      baseFare: 59900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_post_surgery',
      slug: 'post-surgery-support',
      name: 'Post-surgery Support',
      nameLocalized: { hi: 'सर्जरी के बाद सहायता' },
      iconKey: 'bandage-outline',
      baseFare: 119900,
      estimatedDurationMin: 480,
      active: true,
    },
  ],
  cat_drivers: [
    {
      id: 'sub_hourly_driver',
      slug: 'hourly-driver',
      name: 'Hourly Driver',
      nameLocalized: { hi: 'घंटे के हिसाब से ड्राइवर' },
      iconKey: 'time-outline',
      baseFare: 19900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_outstation_trip',
      slug: 'outstation-trip',
      name: 'Outstation Trip',
      nameLocalized: { hi: 'आउटस्टेशन यात्रा' },
      iconKey: 'map-outline',
      baseFare: 99900,
      estimatedDurationMin: 600,
      active: true,
    },
    {
      id: 'sub_monthly_driver',
      slug: 'monthly-driver',
      name: 'Monthly Driver',
      nameLocalized: { hi: 'मासिक ड्राइवर' },
      iconKey: 'calendar-outline',
      baseFare: 119900,
      estimatedDurationMin: 480,
      active: true,
    },
    {
      id: 'sub_airport_transfer',
      slug: 'airport-transfer',
      name: 'Airport Transfer',
      nameLocalized: { hi: 'एयरपोर्ट ट्रांसफ़र' },
      iconKey: 'airplane-outline',
      baseFare: 49900,
      estimatedDurationMin: 90,
      active: true,
    },
  ],
  cat_gardeners: [
    {
      id: 'sub_lawn_mowing',
      slug: 'lawn-mowing',
      name: 'Lawn Mowing',
      nameLocalized: { hi: 'लॉन की कटाई' },
      iconKey: 'cut-outline',
      baseFare: 29900,
      estimatedDurationMin: 90,
      active: true,
    },
    {
      id: 'sub_plant_care',
      slug: 'plant-care-and-pruning',
      name: 'Plant Care & Pruning',
      nameLocalized: { hi: 'पौधों की देखभाल और छँटाई' },
      iconKey: 'flower-outline',
      baseFare: 24900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_terrace_garden',
      slug: 'terrace-garden-setup',
      name: 'Terrace Garden Setup',
      nameLocalized: { hi: 'छत बगीचा सेटअप' },
      iconKey: 'sunny-outline',
      baseFare: 99900,
      estimatedDurationMin: 300,
      active: true,
    },
    {
      id: 'sub_seasonal_planting',
      slug: 'seasonal-planting',
      name: 'Seasonal Planting',
      nameLocalized: { hi: 'मौसमी रोपाई' },
      iconKey: 'rainy-outline',
      baseFare: 39900,
      estimatedDurationMin: 120,
      active: true,
    },
  ],
  cat_cleaners: [
    {
      id: 'sub_bathroom_cleaning',
      slug: 'bathroom-cleaning',
      name: 'Bathroom Cleaning',
      nameLocalized: { hi: 'बाथरूम की सफ़ाई' },
      iconKey: 'sparkles-outline',
      baseFare: 39900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_kitchen_cleaning',
      slug: 'kitchen-cleaning',
      name: 'Kitchen Cleaning',
      nameLocalized: { hi: 'रसोई की सफ़ाई' },
      iconKey: 'restaurant-outline',
      baseFare: 49900,
      estimatedDurationMin: 90,
      active: true,
    },
    {
      id: 'sub_full_home_cleaning',
      slug: 'full-home-cleaning',
      name: 'Full Home Cleaning',
      nameLocalized: { hi: 'पूरे घर की सफ़ाई' },
      iconKey: 'home-outline',
      baseFare: 99900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_sofa_carpet',
      slug: 'sofa-and-carpet-cleaning',
      name: 'Sofa & Carpet Cleaning',
      nameLocalized: { hi: 'सोफ़ा और कार्पेट सफ़ाई' },
      iconKey: 'bed-outline',
      baseFare: 49900,
      estimatedDurationMin: 120,
      active: true,
    },
  ],
  cat_technicians: [
    {
      id: 'sub_ac_service',
      slug: 'ac-service',
      name: 'AC Service',
      nameLocalized: { hi: 'एसी सेवा' },
      iconKey: 'snow-outline',
      baseFare: 59900,
      estimatedDurationMin: 75,
      active: true,
    },
    {
      id: 'sub_washing_machine',
      slug: 'washing-machine',
      name: 'Washing Machine',
      nameLocalized: { hi: 'वॉशिंग मशीन' },
      iconKey: 'sync-outline',
      baseFare: 39900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_refrigerator',
      slug: 'refrigerator',
      name: 'Refrigerator',
      nameLocalized: { hi: 'रेफ़्रिजरेटर' },
      iconKey: 'thermometer-outline',
      baseFare: 44900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_water_purifier',
      slug: 'water-purifier',
      name: 'Water Purifier',
      nameLocalized: { hi: 'वॉटर प्यूरिफ़ायर' },
      iconKey: 'water-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_tv_electronics',
      slug: 'tv-and-electronics',
      name: 'TV & Electronics',
      nameLocalized: { hi: 'टीवी और इलेक्ट्रॉनिक्स' },
      iconKey: 'tv-outline',
      baseFare: 39900,
      estimatedDurationMin: 60,
      active: true,
    },
  ],
} satisfies Record<Id, ServiceCategory[]>;
