import type { Id } from './types/common';
import type { ServiceCategory } from './types/service-category';

/**
 * The service catalogue: ten worker types and the sub-categories under them.
 *
 * Moved here from apps/customer in sub-phase 4.0. The worker app needs the
 * same catalogue — a partner registers under these worker types and picks
 * sub-categories from these lists — and a second copy would drift the first
 * time either side renamed a sub-category. Phase 5's backend needs it too,
 * to seed the database, and @sahayo/shared is already a dependency of all
 * three.
 *
 * It is pure data. Nothing here imports React Native, so the backend can
 * load it under tsx without a bundler.
 *
 * Presentation indexes that only the customer app uses — Home's top-five
 * list and the filter-chip rows above the sub-category grid — stayed behind
 * in apps/customer/src/mocks/categories.ts. They are decisions about one
 * screen, not facts about the catalogue.
 */

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
 * The muted second line on a sub-category card.
 *
 * `ServiceCategory` carries `description` but has no `descriptionLocalized`,
 * and excess property checking rejects one — so the English sits on the
 * record as the canonical value and the Hindi lives here, mirroring how
 * `name` and `nameLocalized` relate. Copy is trimmed to fit a two-column
 * card; do not lengthen it.
 */
export const descriptionLocalizedBySubCategoryId: Record<Id, Record<string, string>> = {
  sub_basic_electrical: { hi: 'स्विच, सॉकेट, पंखे, लाइट, डोरबेल' },
  sub_wiring_installation: { hi: 'घर की वायरिंग, एमसीबी, अर्थिंग, मीटर' },
  sub_power_backup_solar: { hi: 'इन्वर्टर, बैटरी, स्टेबलाइज़र, सोलर' },
  sub_motors_pumps: { hi: 'सबमर्सिबल, बूस्टर, कृषि पंप' },
  sub_commercial_electrical: { hi: 'दुकान और औद्योगिक लोड, पैनल' },
  sub_taps_fittings: { hi: 'नल, बेसिन, सिंक, डब्ल्यूसी, शॉवर' },
  sub_leakage_blockage: { hi: 'रिसाव जाँच, सीलन, बंद नाली' },
  sub_pipeline_installation: { hi: 'सीपीवीसी/पीवीसी बिछाना, नए बाथरूम पॉइंट' },
  sub_water_systems: { hi: 'टंकी, मोटर, बूस्टर, आरओ प्यूरिफ़ायर' },
  sub_drainage_sewer: { hi: 'जेटिंग, सेप्टिक, मैनहोल' },
  sub_repairs_fixing: { hi: 'फ़र्नीचर मरम्मत, कब्ज़ा, दराज़, ताला' },
  sub_assembly_mounting: { hi: 'फ़्लैट-पैक, टीवी यूनिट, शेल्फ़, पर्दा रॉड' },
  sub_doors_windows: { hi: 'दरवाज़ा फ़िटिंग, चौखट, खिड़की, जाली' },
  sub_custom_modular: { hi: 'अलमारी, मॉड्यूलर किचन, बेड' },
  sub_polishing_finishing: { hi: 'ड्यूको, पीयू, मेलामाइन, लेमिनेशन' },
  sub_touchups_patchwork: { hi: 'एक दीवार, सीलन पैच, एक कमरा' },
  sub_interior_painting: { hi: 'डिस्टेंपर, इमल्शन, पुट्टी, प्राइमर' },
  sub_exterior_waterproofing: { hi: 'बाहरी दीवारें, वेदर कोट, छत' },
  sub_wood_metal_finishing: { hi: 'पॉलिश, ग्रिल पेंटिंग, एंटी-रस्ट' },
  sub_texture_designer: { hi: 'टेक्सचर, स्टेंसिल, एक्सेंट, वॉलपेपर' },
  sub_part_time_help: { hi: 'झाड़ू, पोछा, बर्तन, कपड़े' },
  sub_cooking: { hi: 'रोज़ का खाना, शाकाहारी / मांसाहारी, डाइट' },
  sub_full_time_live_in: { hi: 'पूरे दिन या रहने वाली सहायता' },
  sub_one_time_help: { hi: 'मेहमान, त्योहार, पार्टी के बाद' },
  sub_child_care: { hi: 'नैनी, आया, बेबीसिटिंग, स्कूल एस्कॉर्ट' },
  sub_elder_care: { hi: 'दिन-रात अटेंडेंट, रहने वाला साथी' },
  sub_patient_care: { hi: 'बिस्तर पर, अस्पताल अटेंडेंट, ऑपरेशन के बाद' },
  sub_mother_newborn: { hi: 'जापा मेड, प्रसव के बाद देखभाल, मालिश' },
  sub_home_nursing: { hi: 'इंजेक्शन, आईवी, ड्रेसिंग — केवल लाइसेंसी' },
  sub_hourly_driver: { hi: 'स्थानीय यात्रा, अस्पताल, एयरपोर्ट, कार्यक्रम' },
  sub_monthly_driver: { hi: 'फ़ुल-टाइम, तय घंटे, साप्ताहिक छुट्टी' },
  sub_outstation_driver: { hi: 'कई दिन, प्रति किमी, रात्रि हॉल्ट' },
  sub_commercial_goods: { hi: 'टेम्पो, मिनी-ट्रक, ट्रक, ट्रेलर' },
  sub_two_wheeler_rider: { hi: 'डिलीवरी, कूरियर, छोटे काम' },
  sub_regular_maintenance: { hi: 'साप्ताहिक देखभाल, सिंचाई, निराई, कटाई' },
  sub_one_time_cleanup: { hi: 'बढ़ी घास की सफ़ाई, छँटाई, मौसमी सफ़ाई' },
  sub_garden_setup: { hi: 'नया लॉन, छत और किचन गार्डन, ड्रिप' },
  sub_tree_work: { hi: 'छँटाई, कटाई, हटाना' },
  sub_campus_contract: { hi: 'अपार्टमेंट, स्कूल, संस्थागत परिसर' },
  sub_home_deep_cleaning: { hi: 'बीएचके अनुसार पूरा घर, मूव-इन/आउट, त्योहार' },
  sub_room_wise_cleaning: { hi: 'सिर्फ़ रसोई, बाथरूम, बालकनी, एक कमरा' },
  sub_specialised_cleaning: { hi: 'सोफ़ा, कार्पेट, गद्दा, पर्दा, टंकी' },
  sub_pest_control: { hi: 'सामान्य, दीमक, खटमल, चूहा' },
  sub_commercial_cleaning: { hi: 'ऑफ़िस, दुकान, अस्पताल, स्कूल' },
  sub_ac_refrigeration: { hi: 'स्प्लिट/विंडो एसी, फ़्रिज, फ़्रीज़र, कूलर' },
  sub_large_appliances: { hi: 'वॉशिंग मशीन, गीज़र, चिमनी, माइक्रोवेव' },
  sub_small_appliances: { hi: 'मिक्सर, इस्त्री, इंडक्शन, केतली, टेबल फ़ैन' },
  sub_electronics: { hi: 'टीवी, मोबाइल, लैपटॉप, प्रिंटर, सेट-टॉप बॉक्स' },
  sub_it_network_cctv: { hi: 'सीसीटीवी, वाई-फ़ाई, लैन, बायोमेट्रिक, स्मार्ट लॉक' },
};

/**
 * Sub-categories, keyed by the worker type they belong to.
 *
 * These sit between the worker type and the priced SKU: Electricians →
 * Basic Electrical Work → "Switch Replacement, ₹199". The card at this level
 * deliberately shows NO price — prices live at SKU level on the next screen.
 * `baseFare` is still required by the type and is set to the cheapest SKU
 * underneath, or to a plausible "from" figure where nothing is priced yet.
 */
export const subCategoriesByCategoryId = {
  cat_electricians: [
    {
      id: 'sub_basic_electrical',
      slug: 'basic-electrical',
      name: 'Basic Electrical Work',
      nameLocalized: { hi: 'सामान्य बिजली का काम' },
      description: 'Switches, sockets, fans, lights, doorbell',
      iconKey: 'bulb-outline',
      baseFare: 19900,
      estimatedDurationMin: 30,
      active: true,
    },
    {
      id: 'sub_wiring_installation',
      slug: 'wiring-installation',
      name: 'Wiring & New Installation',
      nameLocalized: { hi: 'वायरिंग और नया इंस्टॉलेशन' },
      description: 'House wiring, MCB, earthing, meter',
      iconKey: 'git-branch-outline',
      baseFare: 44900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_power_backup_solar',
      slug: 'power-backup-solar',
      name: 'Power Backup & Solar',
      nameLocalized: { hi: 'पावर बैकअप और सोलर' },
      description: 'Inverter, battery, stabiliser, solar',
      iconKey: 'battery-charging-outline',
      baseFare: 49900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_motors_pumps',
      slug: 'motors-pumps',
      name: 'Motors & Pumps',
      nameLocalized: { hi: 'मोटर और पंप' },
      description: 'Submersible, booster, agri pump',
      iconKey: 'cog-outline',
      baseFare: 74900,
      estimatedDurationMin: 120,
      active: true,
    },
    {
      id: 'sub_commercial_electrical',
      slug: 'commercial-electrical',
      name: 'Commercial & 3-Phase',
      nameLocalized: { hi: 'कमर्शियल और 3-फ़ेज़' },
      description: 'Shop and industrial load, panels',
      iconKey: 'business-outline',
      baseFare: 99900,
      estimatedDurationMin: 240,
      active: true,
    },
  ],
  cat_plumbers: [
    {
      id: 'sub_taps_fittings',
      slug: 'taps-fittings',
      name: 'Taps, Fittings & Sanitaryware',
      nameLocalized: { hi: 'नल, फ़िटिंग और सैनिटरीवेयर' },
      description: 'Tap, basin, sink, WC, shower',
      iconKey: 'water-outline',
      baseFare: 19900,
      estimatedDurationMin: 45,
      active: true,
    },
    {
      id: 'sub_leakage_blockage',
      slug: 'leakage-blockage',
      name: 'Leakage & Blockage',
      nameLocalized: { hi: 'रिसाव और रुकावट' },
      description: 'Leak tracing, seepage, choked drain',
      iconKey: 'warning-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_pipeline_installation',
      slug: 'pipeline-installation',
      name: 'Pipeline & New Installation',
      nameLocalized: { hi: 'पाइपलाइन और नया इंस्टॉलेशन' },
      description: 'CPVC/PVC laying, new bathroom points',
      iconKey: 'git-merge-outline',
      baseFare: 59900,
      estimatedDurationMin: 120,
      active: true,
    },
    {
      id: 'sub_water_systems',
      slug: 'water-systems',
      name: 'Water Systems',
      nameLocalized: { hi: 'पानी की व्यवस्था' },
      description: 'Tank, motor, booster, RO purifier',
      iconKey: 'cube-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_drainage_sewer',
      slug: 'drainage-sewer',
      name: 'Drainage & Sewer',
      nameLocalized: { hi: 'नाली और सीवर' },
      description: 'Jetting, septic, manhole',
      iconKey: 'funnel-outline',
      baseFare: 49900,
      estimatedDurationMin: 120,
      active: true,
    },
  ],
  cat_carpenters: [
    {
      id: 'sub_repairs_fixing',
      slug: 'repairs-fixing',
      name: 'Repairs & Fixing',
      nameLocalized: { hi: 'मरम्मत और फ़िक्सिंग' },
      description: 'Furniture repair, hinge, drawer, lock',
      iconKey: 'build-outline',
      baseFare: 34900,
      estimatedDurationMin: 75,
      active: true,
    },
    {
      id: 'sub_assembly_mounting',
      slug: 'assembly-mounting',
      name: 'Assembly & Mounting',
      nameLocalized: { hi: 'असेंबली और माउंटिंग' },
      description: 'Flat-pack, TV unit, shelf, curtain rod',
      iconKey: 'cube-outline',
      baseFare: 19900,
      estimatedDurationMin: 45,
      active: true,
    },
    {
      id: 'sub_doors_windows',
      slug: 'doors-windows',
      name: 'Doors & Windows',
      nameLocalized: { hi: 'दरवाज़े और खिड़कियाँ' },
      description: 'Door fitting, frame, window, mesh',
      iconKey: 'exit-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_custom_modular',
      slug: 'custom-modular',
      name: 'Custom & Modular Work',
      nameLocalized: { hi: 'कस्टम और मॉड्यूलर काम' },
      description: 'Wardrobe, modular kitchen, bed',
      iconKey: 'bed-outline',
      baseFare: 69900,
      estimatedDurationMin: 180,
      active: true,
    },
    {
      id: 'sub_polishing_finishing',
      slug: 'polishing-finishing',
      name: 'Polishing & Finishing',
      nameLocalized: { hi: 'पॉलिश और फ़िनिशिंग' },
      description: 'Duco, PU, melamine, lamination',
      iconKey: 'brush-outline',
      baseFare: 69900,
      estimatedDurationMin: 180,
      active: true,
    },
  ],
  cat_painters: [
    {
      id: 'sub_touchups_patchwork',
      slug: 'touchups-patchwork',
      name: 'Touch-ups & Patch Work',
      nameLocalized: { hi: 'टच-अप और पैच वर्क' },
      description: 'Single wall, damp patch, one room',
      iconKey: 'brush-outline',
      baseFare: 49900,
      estimatedDurationMin: 180,
      active: true,
    },
    {
      id: 'sub_interior_painting',
      slug: 'interior-painting',
      name: 'Interior Painting',
      nameLocalized: { hi: 'इंटीरियर पेंटिंग' },
      description: 'Distemper, emulsion, putty, primer',
      iconKey: 'color-fill-outline',
      baseFare: 89900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_exterior_waterproofing',
      slug: 'exterior-waterproofing',
      name: 'Exterior & Weatherproofing',
      nameLocalized: { hi: 'एक्सटीरियर और वेदरप्रूफ़िंग' },
      description: 'Outer walls, weather coat, terrace',
      iconKey: 'rainy-outline',
      baseFare: 99900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_wood_metal_finishing',
      slug: 'wood-metal-finishing',
      name: 'Wood & Metal Finishing',
      nameLocalized: { hi: 'लकड़ी और धातु फ़िनिशिंग' },
      description: 'Polish, grill painting, anti-rust',
      iconKey: 'layers-outline',
      baseFare: 129900,
      estimatedDurationMin: 300,
      active: true,
    },
    {
      id: 'sub_texture_designer',
      slug: 'texture-designer',
      name: 'Texture & Designer Finishes',
      nameLocalized: { hi: 'टेक्सचर और डिज़ाइनर फ़िनिश' },
      description: 'Texture, stencil, accent, wallpaper',
      iconKey: 'color-palette-outline',
      baseFare: 79900,
      estimatedDurationMin: 240,
      active: true,
    },
  ],
  cat_domestic_helpers: [
    {
      id: 'sub_part_time_help',
      slug: 'part-time-help',
      name: 'Part-time Daily Help',
      nameLocalized: { hi: 'पार्ट-टाइम रोज़ाना सहायता' },
      description: 'Sweeping, mopping, utensils, laundry',
      iconKey: 'time-outline',
      baseFare: 19900,
      estimatedDurationMin: 45,
      active: true,
    },
    {
      id: 'sub_cooking',
      slug: 'cooking',
      name: 'Cooking',
      nameLocalized: { hi: 'खाना बनाना' },
      description: 'Daily cook, veg / non-veg, diet',
      iconKey: 'restaurant-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_full_time_live_in',
      slug: 'full-time-live-in',
      name: 'Full-time / Live-in',
      nameLocalized: { hi: 'फ़ुल-टाइम / लिव-इन' },
      description: 'Full-day or residential help',
      iconKey: 'home-outline',
      baseFare: 99900,
      estimatedDurationMin: 480,
      active: true,
    },
    {
      id: 'sub_one_time_help',
      slug: 'one-time-help',
      name: 'One-time & Occasional',
      nameLocalized: { hi: 'एक बार और कभी-कभार' },
      description: 'Guests, festival, post-party',
      iconKey: 'calendar-outline',
      baseFare: 49900,
      estimatedDurationMin: 240,
      active: true,
    },
  ],
  cat_caregivers: [
    {
      id: 'sub_child_care',
      slug: 'child-care',
      name: 'Child Care',
      nameLocalized: { hi: 'बच्चों की देखभाल' },
      description: 'Nanny, aaya, babysitting, school escort',
      iconKey: 'happy-outline',
      baseFare: 59900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_elder_care',
      slug: 'elder-care',
      name: 'Elder Care',
      nameLocalized: { hi: 'बुज़ुर्गों की देखभाल' },
      description: 'Day & night attendant, live-in companion',
      iconKey: 'heart-outline',
      baseFare: 79900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_patient_care',
      slug: 'patient-care',
      name: 'Patient & Post-op Care',
      nameLocalized: { hi: 'मरीज़ और ऑपरेशन के बाद देखभाल' },
      description: 'Bedridden, hospital attendant, post-surgery',
      iconKey: 'pulse-outline',
      baseFare: 99900,
      estimatedDurationMin: 480,
      active: true,
    },
    {
      id: 'sub_mother_newborn',
      slug: 'mother-newborn',
      name: 'Mother & Newborn Care',
      nameLocalized: { hi: 'माँ और नवजात की देखभाल' },
      description: 'Japa maid, post-natal care, malish',
      iconKey: 'nutrition-outline',
      baseFare: 99900,
      estimatedDurationMin: 480,
      active: true,
    },
    {
      id: 'sub_home_nursing',
      slug: 'home-nursing',
      name: 'Home Nursing',
      nameLocalized: { hi: 'होम नर्सिंग' },
      description: 'Injection, IV, dressing — licensed only',
      iconKey: 'medkit-outline',
      baseFare: 129900,
      estimatedDurationMin: 240,
      active: true,
    },
  ],
  cat_drivers: [
    {
      id: 'sub_hourly_driver',
      slug: 'hourly-driver',
      name: 'Hourly / On-call',
      nameLocalized: { hi: 'घंटे से / ऑन-कॉल' },
      description: 'Local trips, hospital, airport, event',
      iconKey: 'timer-outline',
      baseFare: 19900,
      estimatedDurationMin: 90,
      active: true,
    },
    {
      id: 'sub_monthly_driver',
      slug: 'monthly-driver',
      name: 'Monthly Personal Driver',
      nameLocalized: { hi: 'मासिक निजी ड्राइवर' },
      description: 'Full-time, fixed hours, weekly off',
      iconKey: 'calendar-outline',
      baseFare: 119900,
      estimatedDurationMin: 480,
      active: true,
    },
    {
      id: 'sub_outstation_driver',
      slug: 'outstation-driver',
      name: 'Outstation & Long Trip',
      nameLocalized: { hi: 'आउटस्टेशन और लंबी यात्रा' },
      description: 'Multi-day, per-km, night halt',
      iconKey: 'map-outline',
      baseFare: 99900,
      estimatedDurationMin: 300,
      active: true,
    },
    {
      id: 'sub_commercial_goods',
      slug: 'commercial-goods',
      name: 'Commercial & Goods',
      nameLocalized: { hi: 'कमर्शियल और माल ढुलाई' },
      description: 'Tempo, mini-truck, truck, trailer',
      iconKey: 'car-outline',
      baseFare: 79900,
      estimatedDurationMin: 480,
      active: true,
    },
    {
      id: 'sub_two_wheeler_rider',
      slug: 'two-wheeler-rider',
      name: 'Two-wheeler Rider',
      nameLocalized: { hi: 'टू-व्हीलर राइडर' },
      description: 'Delivery, courier, errands',
      iconKey: 'bicycle-outline',
      baseFare: 29900,
      estimatedDurationMin: 120,
      active: true,
    },
  ],
  cat_gardeners: [
    {
      id: 'sub_regular_maintenance',
      slug: 'regular-maintenance',
      name: 'Regular Maintenance',
      nameLocalized: { hi: 'नियमित रखरखाव' },
      description: 'Weekly upkeep, watering, weeding, mowing',
      iconKey: 'repeat-outline',
      baseFare: 29900,
      estimatedDurationMin: 90,
      active: true,
    },
    {
      id: 'sub_one_time_cleanup',
      slug: 'one-time-cleanup',
      name: 'One-time Cleanup',
      nameLocalized: { hi: 'एक बार की सफ़ाई' },
      description: 'Overgrown clearing, pruning, seasonal tidy',
      iconKey: 'cut-outline',
      baseFare: 24900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_garden_setup',
      slug: 'garden-setup',
      name: 'Garden Setup & Landscaping',
      nameLocalized: { hi: 'गार्डन सेटअप और लैंडस्केपिंग' },
      description: 'New lawn, terrace & kitchen garden, drip',
      iconKey: 'flower-outline',
      baseFare: 39900,
      estimatedDurationMin: 120,
      active: true,
    },
    {
      id: 'sub_tree_work',
      slug: 'tree-work',
      name: 'Tree Work',
      nameLocalized: { hi: 'पेड़ों की कटाई-छँटाई' },
      description: 'Trimming, cutting, removal',
      iconKey: 'leaf-outline',
      baseFare: 49900,
      estimatedDurationMin: 180,
      active: true,
    },
    {
      id: 'sub_campus_contract',
      slug: 'campus-contract',
      name: 'Campus & Society Contract',
      nameLocalized: { hi: 'कैंपस और सोसाइटी कॉन्ट्रैक्ट' },
      description: 'Apartment, school, institutional grounds',
      iconKey: 'business-outline',
      baseFare: 129900,
      estimatedDurationMin: 480,
      active: true,
    },
  ],
  cat_cleaners: [
    {
      id: 'sub_home_deep_cleaning',
      slug: 'home-deep-cleaning',
      name: 'Home Deep Cleaning',
      nameLocalized: { hi: 'घर की गहरी सफ़ाई' },
      description: 'Full home by BHK, move-in/out, festival',
      iconKey: 'sparkles-outline',
      baseFare: 99900,
      estimatedDurationMin: 240,
      active: true,
    },
    {
      id: 'sub_room_wise_cleaning',
      slug: 'room-wise-cleaning',
      name: 'Room-wise Cleaning',
      nameLocalized: { hi: 'कमरे के हिसाब से सफ़ाई' },
      description: 'Kitchen only, bathroom, balcony, one room',
      iconKey: 'water-outline',
      baseFare: 39900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_specialised_cleaning',
      slug: 'specialised-cleaning',
      name: 'Specialised Cleaning',
      nameLocalized: { hi: 'विशेष सफ़ाई' },
      description: 'Sofa, carpet, mattress, curtain, tank',
      iconKey: 'color-fill-outline',
      baseFare: 49900,
      estimatedDurationMin: 120,
      active: true,
    },
    {
      id: 'sub_pest_control',
      slug: 'pest-control',
      name: 'Pest Control',
      nameLocalized: { hi: 'पेस्ट कंट्रोल' },
      description: 'General, termite, bed bug, rodent',
      iconKey: 'bug-outline',
      baseFare: 59900,
      estimatedDurationMin: 120,
      active: true,
    },
    {
      id: 'sub_commercial_cleaning',
      slug: 'commercial-cleaning',
      name: 'Commercial & Institutional',
      nameLocalized: { hi: 'कमर्शियल और संस्थागत' },
      description: 'Office, shop, hospital, school',
      iconKey: 'business-outline',
      baseFare: 99900,
      estimatedDurationMin: 300,
      active: true,
    },
  ],
  cat_technicians: [
    {
      id: 'sub_ac_refrigeration',
      slug: 'ac-refrigeration',
      name: 'AC & Refrigeration',
      nameLocalized: { hi: 'एसी और रेफ़्रिजरेशन' },
      description: 'Split/window AC, fridge, freezer, cooler',
      iconKey: 'snow-outline',
      baseFare: 44900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_large_appliances',
      slug: 'large-appliances',
      name: 'Large Appliances',
      nameLocalized: { hi: 'बड़े उपकरण' },
      description: 'Washing machine, geyser, chimney, microwave',
      iconKey: 'sync-outline',
      baseFare: 39900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_small_appliances',
      slug: 'small-appliances',
      name: 'Small Appliances',
      nameLocalized: { hi: 'छोटे उपकरण' },
      description: 'Mixer, iron, induction, kettle, table fan',
      iconKey: 'power-outline',
      baseFare: 29900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_electronics',
      slug: 'electronics',
      name: 'Electronics',
      nameLocalized: { hi: 'इलेक्ट्रॉनिक्स' },
      description: 'TV, mobile, laptop, printer, set-top box',
      iconKey: 'tv-outline',
      baseFare: 39900,
      estimatedDurationMin: 60,
      active: true,
    },
    {
      id: 'sub_it_network_cctv',
      slug: 'it-network-cctv',
      name: 'IT, Network & CCTV',
      nameLocalized: { hi: 'आईटी, नेटवर्क और सीसीटीवी' },
      description: 'CCTV, Wi-Fi, LAN, biometric, smart lock',
      iconKey: 'videocam-outline',
      baseFare: 79900,
      estimatedDurationMin: 180,
      active: true,
    },
  ],
} satisfies Record<Id, ServiceCategory[]>;
