import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@sahayo/ui-native';

export interface SegmentedTab<K extends string> {
  key: K;
  /** Already translated. */
  label: string;
  /** Shown in a bubble when given. */
  count?: number;
}

/**
 * Filter tabs as a row of pills, each with an optional count.
 *
 * Scrolls sideways, so long Hindi labels never wrap or shrink. The pills are
 * 40dp tall with 4dp of extra touch area above and below — 48dp to a thumb.
 */
export function SegmentedTabs<K extends string>({
  tabs,
  selected,
  onSelect,
}: {
  tabs: SegmentedTab<K>[];
  selected: K;
  onSelect: (key: K) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-5"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, gap: 8 }}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            className={`h-10 flex-row items-center rounded-full border px-4 ${
              active ? 'border-worker-primary bg-worker-primary' : 'border-worker-outline bg-worker-surface'
            }`}
            onPress={() => onSelect(tab.key)}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.count === undefined ? tab.label : `${tab.label}, ${tab.count}`}
          >
            <Text weight="semibold" className={`text-sm ${active ? 'text-white' : 'text-worker-ink'}`}>
              {tab.label}
            </Text>
            {tab.count === undefined ? null : (
              <View
                className={`ml-2 min-w-[22px] items-center rounded-full px-1.5 ${
                  active ? 'bg-white' : 'bg-worker-primary-tint'
                }`}
              >
                <Text weight="bold" className="text-xs text-worker-primary">
                  {String(tab.count)}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
