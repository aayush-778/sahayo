import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { DEFAULT_ADDRESS_ID, savedAddresses } from '../../src/mocks/profile';

const LABEL_ICON = {
  home: 'home-outline',
  work: 'briefcase-outline',
  other: 'location-outline',
} as const;

/**
 * Saved addresses.
 *
 * A read-and-choose list. The one marked default is the address a new booking
 * uses, which is why the row is selectable at all rather than being a static
 * list — choosing where the worker comes is the only thing a customer
 * actually needs from this screen before Phase 5 adds an address picker to
 * the booking flow itself.
 *
 * Addresses are `BookingAddress` from @sahayo/shared, so a picker can hand
 * one straight to a booking. The label sits in an index beside the record
 * rather than on it: the shared type has no `label`, and adding one to make a
 * screen easier is the drift `satisfies` is there to catch.
 */
export default function AddressesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [defaultId, setDefaultId] = useState(DEFAULT_ADDRESS_ID);

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <ScreenHeader title={t('profile.addresses')} fallback="/profile" />

        <Text className="mt-4 text-sm text-brand-muted">{t('addresses.intro')}</Text>

        <View className="mt-4">
          {savedAddresses.map((entry) => {
            const active = entry.id === defaultId;
            const { address } = entry;

            return (
              <Pressable
                key={entry.id}
                className={`mb-3 flex-row rounded-2xl border p-4 ${
                  active
                    ? 'border-brand-primary bg-brand-primary-tint'
                    : 'border-brand-border bg-brand-surface'
                }`}
                onPress={() => setDefaultId(entry.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t(`addresses.labels.${entry.labelKey}`)}, ${address.line1}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-surface">
                  <Ionicons
                    name={LABEL_ICON[entry.labelKey]}
                    size={19}
                    color={brandColors.primary}
                  />
                </View>

                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text weight="semibold" className="text-sm text-brand-navy">
                      {t(`addresses.labels.${entry.labelKey}`)}
                    </Text>
                    {active ? (
                      <View className="ml-2 rounded-full bg-brand-primary px-2 py-0.5">
                        <Text weight="medium" className="text-xs text-white">
                          {t('addresses.default')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text className="mt-1 text-sm text-brand-muted">{address.line1}</Text>
                  {address.line2 ? (
                    <Text className="text-sm text-brand-muted">{address.line2}</Text>
                  ) : null}
                  <Text className="text-sm text-brand-muted">
                    {`${address.city}, ${address.state} ${address.pincode}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-start rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
          <Ionicons name="information-circle-outline" size={16} color={brandColors.muted} />
          <Text className="ml-2 flex-1 text-xs text-brand-muted">{t('addresses.addNote')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
