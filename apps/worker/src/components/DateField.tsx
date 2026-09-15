import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, Text, useThemeColors } from '@sahayo/ui-native';

import { Sheet } from './Sheet';

interface Parts {
  day: number;
  /** 0-11. */
  month: number;
  year: number;
}

function parse(value: string | null): Parts | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? { year, month: month - 1, day } : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function daysIn(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * A date of birth, picked as day, month and year.
 *
 * Built from three columns rather than @react-native-community/datetimepicker:
 * that is a native module this app does not otherwise need, and the system
 * picker renders month names in the device's language rather than the app's —
 * a Hindi-first worker on an English-language phone would get English months.
 * Here the months come from the i18n catalogue.
 *
 * Years run newest first and stop at `maxYear`, which the caller sets to the
 * youngest age allowed to register, so an under-age date cannot be chosen.
 */
export function DateField({
  label,
  placeholder,
  sheetTitle,
  value,
  minYear,
  maxYear,
  onChange,
  error,
  className = '',
}: {
  label: string;
  placeholder: string;
  sheetTitle: string;
  /** YYYY-MM-DD, or null. */
  value: string | null;
  minYear: number;
  maxYear: number;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const parsed = parse(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Parts>(parsed ?? { day: 1, month: 0, year: maxYear });

  const monthName = (month: number) => t(`booking.schedule.months.${month}`);
  // Shown as DD/MM/YYYY, as on the design and on an Aadhaar card; read aloud
  // with the month named, which a screen reader handles far better.
  const display = parsed ? `${pad(parsed.day)}/${pad(parsed.month + 1)}/${parsed.year}` : placeholder;
  const spoken = parsed ? `${parsed.day} ${monthName(parsed.month)} ${parsed.year}` : placeholder;

  function openSheet() {
    setDraft(parsed ?? { day: 1, month: 0, year: maxYear });
    setOpen(true);
  }

  function update(next: Partial<Parts>) {
    setDraft((current) => {
      const merged = { ...current, ...next };
      // 31 March, then February: keep the day inside the month.
      return { ...merged, day: Math.min(merged.day, daysIn(merged.month, merged.year)) };
    });
  }

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
  const days = Array.from({ length: daysIn(draft.month, draft.year) }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const column = (title: string, items: { value: number; label: string }[], selected: number, pick: (v: number) => void) => (
    <View className="flex-1">
      <Text weight="semibold" className="mb-1 text-center text-sm text-worker-muted">
        {title}
      </Text>
      <ScrollView className="h-72" nestedScrollEnabled>
        {items.map((item) => {
          const active = item.value === selected;
          return (
            <Pressable
              key={item.value}
              className={`mx-1 min-h-12 items-center justify-center rounded-xl ${active ? 'bg-worker-primary-tint' : ''}`}
              onPress={() => pick(item.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${title} ${item.label}`}
            >
              <Text
                weight={active ? 'bold' : 'regular'}
                className={`text-base ${active ? 'text-worker-primary' : 'text-worker-ink'}`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View className={className}>
      <Text weight="semibold" className="mb-2 text-sm text-worker-ink">
        {label}
      </Text>
      <Pressable
        className={`min-h-12 flex-row items-center rounded-xl border bg-worker-surface px-4 ${
          error ? 'border-worker-danger' : 'border-worker-outline'
        }`}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${spoken}`}
      >
        <Text className={`flex-1 text-base ${parsed ? 'text-worker-ink' : 'text-worker-muted'}`}>{display}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text className="mt-2 text-sm text-worker-danger">{error}</Text> : null}

      <Sheet
        visible={open}
        title={sheetTitle}
        onClose={() => setOpen(false)}
        footer={
          <PrimaryButton
            label={t('worker.onboarding.done')}
            onPress={() => {
              onChange(`${draft.year}-${pad(draft.month + 1)}-${pad(draft.day)}`);
              setOpen(false);
            }}
          />
        }
      >
        <View className="flex-row px-3 pt-3">
          {column(t('worker.onboarding.day'), days.map((d) => ({ value: d, label: String(d) })), draft.day, (day) => update({ day }))}
          {column(t('worker.onboarding.month'), months.map((m) => ({ value: m, label: monthName(m) })), draft.month, (month) => update({ month }))}
          {column(t('worker.onboarding.year'), years.map((y) => ({ value: y, label: String(y) })), draft.year, (year) => update({ year }))}
        </View>
      </Sheet>
    </View>
  );
}
