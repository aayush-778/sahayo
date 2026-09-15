import type { Id } from '@sahayo/shared';

/**
 * Customer-only presentation indexes over the shared catalogue.
 *
 * The catalogue itself — worker types, sub-categories, groups and localised
 * descriptions — moved to @sahayo/shared in sub-phase 4.0 so the worker app
 * reads the same one. It is re-exported here under exactly the names this
 * file always exported, so every existing `from './categories'` import in
 * the customer app resolves unchanged.
 *
 * What stays is what only this app's screens need: which five worker types
 * Home surfaces, and the filter-chip rows on the sub-category grid.
 */
export {
  CATEGORY_GROUPS,
  CategoryGroup,
  categoryIdsByGroup,
  descriptionLocalizedBySubCategoryId,
  serviceCategories,
  subCategoriesByCategoryId,
} from '@sahayo/shared';

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
 * Chip rows above the sub-category grid, per worker type.
 *
 * `ServiceCategory` has no chips field and shared types stay frozen this
 * phase, so the rows live in an index like every other relationship in this
 * catalogue. Labels are localised on the record rather than in the i18next
 * catalogue because they are catalogue content — a real backend would serve
 * "Repairs" and "New Wiring" per-locale alongside the categories themselves.
 *
 * Every row opens with `all`, which is not a group but the absence of one.
 */
export interface SubCategoryChip {
  key: string;
  label: string;
  labelLocalized?: Record<string, string>;
}

export const subCategoryChipsByCategoryId: Record<Id, SubCategoryChip[]> = {
  cat_electricians: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'repairs', label: 'Repairs', labelLocalized: { hi: 'मरम्मत' } },
    { key: 'installation', label: 'Installation', labelLocalized: { hi: 'इंस्टॉलेशन' } },
    { key: 'new_wiring', label: 'New Wiring', labelLocalized: { hi: 'नई वायरिंग' } },
  ],
  cat_plumbers: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'repairs', label: 'Repairs', labelLocalized: { hi: 'मरम्मत' } },
    { key: 'installation', label: 'Installation', labelLocalized: { hi: 'इंस्टॉलेशन' } },
    { key: 'new_fitting', label: 'New Fitting', labelLocalized: { hi: 'नई फ़िटिंग' } },
  ],
  cat_carpenters: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'repairs', label: 'Repairs', labelLocalized: { hi: 'मरम्मत' } },
    { key: 'assembly', label: 'Assembly', labelLocalized: { hi: 'असेंबली' } },
    { key: 'custom_work', label: 'Custom Work', labelLocalized: { hi: 'कस्टम काम' } },
  ],
  cat_painters: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'quick_jobs', label: 'Quick Jobs', labelLocalized: { hi: 'छोटे काम' } },
    { key: 'full_painting', label: 'Full Painting', labelLocalized: { hi: 'पूरी पेंटिंग' } },
    { key: 'finishes', label: 'Finishes', labelLocalized: { hi: 'फ़िनिशिंग' } },
  ],
  cat_domestic_helpers: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'part_time', label: 'Part-time', labelLocalized: { hi: 'पार्ट-टाइम' } },
    { key: 'full_time', label: 'Full-time', labelLocalized: { hi: 'फ़ुल-टाइम' } },
    { key: 'one_time', label: 'One-time', labelLocalized: { hi: 'एक बार' } },
  ],
  cat_caregivers: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'child', label: 'Child', labelLocalized: { hi: 'बच्चे' } },
    { key: 'elder', label: 'Elder', labelLocalized: { hi: 'बुज़ुर्ग' } },
    { key: 'medical', label: 'Medical', labelLocalized: { hi: 'मेडिकल' } },
  ],
  cat_drivers: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'hourly', label: 'Hourly', labelLocalized: { hi: 'घंटे से' } },
    { key: 'monthly', label: 'Monthly', labelLocalized: { hi: 'मासिक' } },
    { key: 'outstation', label: 'Outstation', labelLocalized: { hi: 'आउटस्टेशन' } },
  ],
  cat_gardeners: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'one_time', label: 'One-time', labelLocalized: { hi: 'एक बार' } },
    { key: 'regular', label: 'Regular', labelLocalized: { hi: 'नियमित' } },
    { key: 'setup', label: 'Setup', labelLocalized: { hi: 'सेटअप' } },
  ],
  cat_cleaners: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'home', label: 'Home', labelLocalized: { hi: 'घर' } },
    { key: 'specialised', label: 'Specialised', labelLocalized: { hi: 'विशेष' } },
    { key: 'commercial', label: 'Commercial', labelLocalized: { hi: 'कमर्शियल' } },
  ],
  cat_technicians: [
    { key: 'all', label: 'All', labelLocalized: { hi: 'सभी' } },
    { key: 'appliances', label: 'Appliances', labelLocalized: { hi: 'उपकरण' } },
    { key: 'electronics', label: 'Electronics', labelLocalized: { hi: 'इलेक्ट्रॉनिक्स' } },
    { key: 'it_security', label: 'IT & Security', labelLocalized: { hi: 'आईटी और सुरक्षा' } },
  ],
};

/**
 * Which chip a sub-category answers to. `all` matches everything, so no
 * sub-category is ever assigned it.
 */
export const chipBySubCategoryId: Record<Id, string> = {
  sub_basic_electrical: 'repairs',
  sub_wiring_installation: 'new_wiring',
  sub_power_backup_solar: 'installation',
  sub_motors_pumps: 'repairs',
  sub_commercial_electrical: 'new_wiring',
  sub_taps_fittings: 'installation',
  sub_leakage_blockage: 'repairs',
  sub_pipeline_installation: 'new_fitting',
  sub_water_systems: 'installation',
  sub_drainage_sewer: 'repairs',
  sub_repairs_fixing: 'repairs',
  sub_assembly_mounting: 'assembly',
  sub_doors_windows: 'repairs',
  sub_custom_modular: 'custom_work',
  sub_polishing_finishing: 'custom_work',
  sub_touchups_patchwork: 'quick_jobs',
  sub_interior_painting: 'full_painting',
  sub_exterior_waterproofing: 'full_painting',
  sub_wood_metal_finishing: 'finishes',
  sub_texture_designer: 'finishes',
  sub_part_time_help: 'part_time',
  sub_cooking: 'part_time',
  sub_full_time_live_in: 'full_time',
  sub_one_time_help: 'one_time',
  sub_child_care: 'child',
  sub_elder_care: 'elder',
  sub_patient_care: 'medical',
  sub_mother_newborn: 'child',
  sub_home_nursing: 'medical',
  sub_hourly_driver: 'hourly',
  sub_monthly_driver: 'monthly',
  sub_outstation_driver: 'outstation',
  sub_commercial_goods: 'monthly',
  sub_two_wheeler_rider: 'hourly',
  sub_regular_maintenance: 'regular',
  sub_one_time_cleanup: 'one_time',
  sub_garden_setup: 'setup',
  sub_tree_work: 'one_time',
  sub_campus_contract: 'regular',
  sub_home_deep_cleaning: 'home',
  sub_room_wise_cleaning: 'home',
  sub_specialised_cleaning: 'specialised',
  sub_pest_control: 'specialised',
  sub_commercial_cleaning: 'commercial',
  sub_ac_refrigeration: 'appliances',
  sub_large_appliances: 'appliances',
  sub_small_appliances: 'appliances',
  sub_electronics: 'electronics',
  sub_it_network_cctv: 'it_security',
};
