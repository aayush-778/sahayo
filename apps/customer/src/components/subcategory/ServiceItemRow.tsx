import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { brandColors, formatDuration, formatPaise, Text, type AppLocale } from '@sahayo/ui-native';

import { ctaFor, type ServiceItem } from '../../types/service-item';
import { useAuthStore } from '../../store/auth';
import { useBookingDraftStore, type BookingIntent } from '../../store/bookingDraft';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** The price line and its qualifier, both already translated. */
interface PriceBlock {
  price: string;
  caption?: string;
}

/**
 * Turns one item into the two strings the row shows.
 *
 * A `switch` over the discriminated union rather than a lookup table, so a
 * seventh pricing mode is a compile error here — the one place that must be
 * updated — instead of a row that renders a blank price.
 *
 * `formatPaise` is never reached on a quote item: that branch returns before
 * any money is formatted, which is what makes "₹0" unreachable rather than
 * merely avoided.
 */
function priceBlockFor(item: ServiceItem, locale: AppLocale, t: TFunction): PriceBlock {
  switch (item.mode) {
    case 'fixed':
      return {
        price: formatPaise(item.priceP, locale),
        caption: formatDuration(item.stdMinutes, locale),
      };

    case 'fault':
      return {
        price: t('subcategory.price.from', { price: formatPaise(item.fromP, locale) }),
        caption: t('subcategory.price.visitCharge'),
      };

    case 'unit': {
      const unit = t(`subcategory.units.${item.unit}`);
      const manyUnit =
        item.minQty === 1 ? unit : t(`subcategory.unitsMany.${item.unit}`);
      return {
        price: t('subcategory.price.perUnit', {
          price: formatPaise(item.ratePerUnitP, locale),
          unit,
        }),
        // `qty`, not `count`: an i18next option named `count` switches on
        // plural resolution and therefore on `Intl.PluralRules`, whose ICU
        // data varies by Hermes build. The singular/plural unit is picked
        // above in code instead, which needs no ICU at all.
        caption: t('subcategory.price.minQty', { qty: item.minQty, unit: manyUnit }),
      };
    }

    case 'retainer':
      return {
        price: t('subcategory.price.perPeriod', {
          price: formatPaise(item.priceP, locale),
          period: t(`subcategory.periods.${item.period}`),
        }),
      };

    case 'workshop':
      return {
        price: t('subcategory.price.from', { price: formatPaise(item.fromP, locale) }),
        caption: t('subcategory.price.workshop'),
      };

    case 'quote':
      return { price: t('subcategory.price.freeSurvey') };
  }
}

interface Badge {
  key: string;
  label: string;
  icon: IoniconName;
  /** Tailwind classes for the pill, and the matching icon colour. */
  pill: string;
  text: string;
  color: string;
}

/**
 * The flags worth surfacing on a row.
 *
 * `mechanisedOnly` gets the success treatment rather than a neutral grey. On
 * a Ministry of Cooperation platform "machine cleaned, no manual entry" is
 * not a feature note — it is the promise that no worker goes into a drain by
 * hand, and it should not read like a footnote about equipment.
 */
function badgesFor(item: ServiceItem, t: TFunction): Badge[] {
  const badges: Badge[] = [];

  if (item.emergency) {
    badges.push({
      key: 'emergency',
      label: t('subcategory.badges.emergency'),
      icon: 'flash-outline',
      pill: 'bg-brand-warning-soft',
      text: 'text-brand-warning',
      color: brandColors.warning,
    });
  }
  if (item.mechanisedOnly) {
    badges.push({
      key: 'mechanisedOnly',
      label: t('subcategory.badges.mechanisedOnly'),
      icon: 'shield-checkmark-outline',
      pill: 'bg-brand-success-soft',
      text: 'text-brand-success',
      color: brandColors.success,
    });
  }
  if (item.requiresLicence) {
    badges.push({
      key: 'requiresLicence',
      label: t('subcategory.badges.requiresLicence'),
      icon: 'ribbon-outline',
      pill: 'bg-brand-primary-tint',
      text: 'text-brand-primary',
      color: brandColors.primary,
    });
  }

  return badges;
}

export interface ServiceItemRowProps {
  item: ServiceItem;
  /** The parent sub-category's Ionicon, so every row in a list reads as one set. */
  iconKey: string | undefined;
}

/**
 * One priced item.
 *
 * NO PHOTOGRAPH. 289 items would need 289 of them, there is no findable stock
 * for "MCB Replacement", and generic stock reads as filler. The sub-category's
 * icon in a tinted tile keeps the left-hand column — so the list still scans
 * vertically — at no asset cost.
 *
 * NO QUANTITY STEPPER. It is meaningless for four of the six modes, and wrong
 * for `unit`: stepping up from a 300 sq ft minimum one square foot at a time
 * is not a usable control. A stepper also implies a cart, which was dropped
 * in 2.3. The row states the constraint ("Min 300 sq ft") and quantity is
 * chosen on the booking screen, where it can enforce the minimum and show a
 * running total.
 *
 * BOTH EXITS ARE VISIBLE, on their own line. Putting them beside the price
 * makes a ten-row list a wall of green with wrapped labels; hiding "Schedule"
 * behind a tap-to-expand adds state and a tap to reach an exit that has to
 * work. The pair is derived from the mode, so a quote row never offers to
 * book something nobody has priced yet.
 */
export function ServiceItemRow({ item, iconKey }: ServiceItemRowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAuthStore((state) => state.language);
  const select = useBookingDraftStore((state) => state.select);

  const { price, caption } = priceBlockFor(item, locale, t);
  const badges = badgesFor(item, t);
  const cta = ctaFor(item.mode);

  function go(intent: BookingIntent) {
    select(item.subCategoryId, item.id, intent);
    router.push(intent === 'now' ? '/booking/now' : '/booking/schedule');
  }

  const primaryLabel =
    cta === 'survey'
      ? t('subcategory.cta.survey')
      : cta === 'visit'
        ? t('subcategory.cta.bookVisit')
        : t('subcategory.cta.bookNow');

  return (
    <View className="mb-3 rounded-2xl border border-brand-border bg-brand-surface p-4">
      <View className="flex-row">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
          <Ionicons
            name={(iconKey ?? 'ellipse-outline') as IoniconName}
            size={19}
            color={brandColors.primary}
          />
        </View>

        <View className="ml-3 flex-1">
          <Text weight="semibold" className="text-sm text-brand-navy" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="mt-0.5 text-xs text-brand-muted" numberOfLines={1}>
            {item.description}
          </Text>
        </View>

        <View className="ml-2 w-24 items-end">
          <Text weight="semibold" className="text-right text-sm text-brand-navy">
            {price}
          </Text>
        </View>
      </View>

      {caption ? (
        <Text className="ml-12 mt-1 text-xs text-brand-muted">{caption}</Text>
      ) : null}

      {badges.length > 0 ? (
        <View className="ml-12 mt-2">
          {badges.map((badge) => (
            <View
              key={badge.key}
              className={`mt-1 flex-row items-center self-start rounded-lg px-2 py-1 ${badge.pill}`}
            >
              <Ionicons name={badge.icon} size={12} color={badge.color} />
              <Text weight="medium" className={`ml-1 text-xs ${badge.text}`}>
                {badge.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-3 flex-row">
        <Pressable
          className={`h-11 items-center justify-center rounded-xl bg-brand-primary ${
            cta === 'survey' ? 'flex-1' : 'mr-2 flex-1'
          }`}
          onPress={() => go(cta === 'survey' ? 'schedule' : 'now')}
          accessibilityRole="button"
          accessibilityLabel={`${primaryLabel}. ${item.name}. ${price}`}
        >
          <Text weight="semibold" className="text-sm text-white" numberOfLines={1}>
            {primaryLabel}
          </Text>
        </Pressable>

        {/* A quote item has nothing priced to book, so its single CTA already
            goes to scheduling and a second button would be a duplicate. */}
        {cta === 'survey' ? null : (
          <Pressable
            className="h-11 flex-1 items-center justify-center rounded-xl border border-brand-primary bg-brand-surface"
            onPress={() => go('schedule')}
            accessibilityRole="button"
            accessibilityLabel={`${t('subcategory.cta.schedule')}. ${item.name}`}
          >
            <Text weight="semibold" className="text-sm text-brand-primary" numberOfLines={1}>
              {t('subcategory.cta.schedule')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
