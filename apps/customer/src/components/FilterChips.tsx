import { Pressable, ScrollView } from 'react-native';
import { Text } from '@sahayo/ui-native';

export interface FilterChip {
  /** Stable identity. `null` selection means "All". */
  key: string;
  /** Already translated by the caller. */
  label: string;
}

/**
 * A horizontal row of filter pills.
 *
 * Shared by All Categories (which filters by group) and the sub-category
 * screen (which filters by the per-category chip row), so the two cannot
 * drift. Neither the chip values nor their meaning live here — this component
 * only knows how a selected pill looks.
 *
 * `selected` is `null` for the leading "All" chip, which is the absence of a
 * filter rather than a filter of its own.
 */
export function FilterChips({
  chips,
  selected,
  onSelect,
}: {
  chips: FilterChip[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
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
        const value = chip.key === 'all' ? null : chip.key;
        const active = value === selected;

        return (
          <Pressable
            key={chip.key}
            onPress={() => onSelect(value)}
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
