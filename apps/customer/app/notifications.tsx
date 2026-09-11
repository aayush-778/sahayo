import type { ComponentProps } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, formatDuration, formatPaise, Text } from '@sahayo/ui-native';

import { localized } from '../src/mocks';
import {
  mockNotifications,
  NOTIFICATION_ICON,
  type AppNotification,
} from '../src/mocks/notifications';
import { useAuthStore } from '../src/store/auth';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * How long ago, without plurals.
 *
 * i18next plural forms need `Intl.PluralRules`, and how much ICU data a
 * Hermes build ships is not something to bet a screen on. Compact units —
 * "38m ago", "26h ago" — read naturally in both languages and need only one
 * key each.
 */
function relativeTime(iso: string): { key: string; count: number } {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return { key: 'notifications.time.justNow', count: 0 };
  if (minutes < 60) return { key: 'notifications.time.minutes', count: minutes };
  if (minutes < 60 * 24) {
    return { key: 'notifications.time.hours', count: Math.round(minutes / 60) };
  }
  return { key: 'notifications.time.days', count: Math.round(minutes / (60 * 24)) };
}

/**
 * Notifications.
 *
 * Mock rows, and a "mark all read" that empties the list so the empty state
 * is reachable rather than theoretical — a bell that only ever says "All
 * caught up" is a dead icon in a demo, and an empty state nobody can reach is
 * dead code.
 *
 * State is per-session and deliberately not persisted. There is no
 * notification store and no backend; restarting the app restores the feed,
 * which is what you want when the same demo is given twice in a row.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);

  const [notifications, setNotifications] = useState<AppNotification[]>(mockNotifications);

  function bodyFor(notification: AppNotification): string {
    return t(`notifications.kind.${notification.kind}.body`, {
      worker: notification.workerName ?? '',
      service: localized(
        notification.serviceName ?? '',
        notification.serviceNameLocalized,
        locale,
      ),
      amount: notification.amount === undefined ? '' : formatPaise(notification.amount, locale),
      eta:
        notification.etaMinutes === undefined
          ? ''
          : formatDuration(notification.etaMinutes, locale),
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 px-6">
        <View className="flex-row items-center">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
          </Pressable>

          <Text weight="bold" className="ml-3 flex-1 text-2xl text-brand-navy" numberOfLines={1}>
            {t('notifications.title')}
          </Text>

          {notifications.length > 0 ? (
            <Pressable
              onPress={() => setNotifications([])}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.markAllRead')}
              hitSlop={8}
            >
              <Text weight="medium" className="text-sm text-brand-primary">
                {t('notifications.markAllRead')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-primary-tint">
              <Ionicons
                name="checkmark-done-outline"
                size={30}
                color={brandColors.primary}
              />
            </View>
            <Text weight="bold" className="mt-4 text-center text-xl text-brand-navy">
              {t('notifications.emptyTitle')}
            </Text>
            <Text className="mt-1 text-center text-base text-brand-muted">
              {t('notifications.emptyBody')}
            </Text>
          </View>
        ) : (
          <View className="mt-5">
            {notifications.map((notification) => {
              const isCoopFund = notification.kind === 'COOP_FUND_CONTRIBUTION';

              return (
                <Pressable
                  key={notification.id}
                  className={
                    notification.read
                      ? 'mb-3 flex-row rounded-2xl border border-brand-border bg-brand-surface p-4'
                      : 'mb-3 flex-row rounded-2xl border border-brand-primary-soft bg-brand-primary-tint p-4'
                  }
                  disabled={!notification.bookingId}
                  onPress={() =>
                    notification.bookingId && router.push(`/track/${notification.bookingId}`)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${t(
                    `notifications.kind.${notification.kind}.title`,
                  )}. ${bodyFor(notification)}`}
                >
                  {/* The cooperative-fund row is marked in the fund's own
                      colour rather than the brand green, so the one message
                      about collective ownership does not look like every
                      other booking update. */}
                  <View
                    className={
                      isCoopFund
                        ? 'h-10 w-10 items-center justify-center rounded-xl bg-brand-success-soft'
                        : 'h-10 w-10 items-center justify-center rounded-xl bg-brand-surface'
                    }
                  >
                    <Ionicons
                      name={NOTIFICATION_ICON[notification.kind] as IoniconName}
                      size={20}
                      color={isCoopFund ? brandColors.success : brandColors.primary}
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text
                        weight="semibold"
                        className="flex-1 text-sm text-brand-navy"
                        numberOfLines={1}
                      >
                        {t(`notifications.kind.${notification.kind}.title`)}
                      </Text>
                      <Text className="ml-2 text-xs text-brand-muted">
                        {(() => {
                          const ago = relativeTime(notification.createdAt);
                          return t(ago.key, { count: ago.count });
                        })()}
                      </Text>
                    </View>

                    <Text className="mt-1 text-sm text-brand-muted">
                      {bodyFor(notification)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
