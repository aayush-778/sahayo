import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
import { Text } from '@sahayo/ui-native';

import { CATEGORY_GROUPS, type CategoryGroup } from '../../mocks';

/** `null` is the "All" chip — no group selected rather than a fourth group. */
export type GroupFilter = CategoryGroup | null;

/**
 * The grouping chips above the grid.
 *
 * These are a partition of the ten worker types, not a second list of them:
 * every category belongs to exactly one group, so a chip genuinely narrows
 * the grid rather than restating it. `mocks/index.ts` asserts that partition
 * at module load, so a category added to two groups or none fails loudly
 * rather than quietly disappearing from a filter.
 */
export function CategoryFilterChips({
  selected,
  onSelect,
}: {
  selected: GroupFilter;
  onSelect: (group: GroupFilter) => void;
}) {
  const { t } = useTranslation();

  const chips: { key: string; value: GroupFilter; label: string }[] = [
    { key: 'all', value: null, label: t('categories.groups.all') },
    ...CATEGORY_GROUPS.map((group) => ({
      key: group,
      value: group as GroupFilter,
      label: t(`categories.groups.${group}`),
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bleeds past the screen's px-6 so chips scroll edge to edge while the
      // first one still lines up with the heading above.
      className="-mx-6"
      contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
    >
      {chips.map((chip) => {
        const active = chip.value === selected;

        return (
          <Pressable
            key={chip.key}
            onPress={() => onSelect(chip.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={chip.label}
            className={
              active
                ? 'rounded-full border border-brand-primary bg-brand-primary px-4 py-2'
                : 'rounded-full border border-brand-border bg-brand-surface px-4 py-2'
            }
          >
            <Text
              weight="medium"
              className={active ? 'text-sm text-white' : 'text-sm text-brand-muted'}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
