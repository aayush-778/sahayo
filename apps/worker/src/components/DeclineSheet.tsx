import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { DECLINE_REASONS, type DeclineReason } from '../types';
import { Sheet } from './Sheet';

const ICON: Record<DeclineReason, ComponentProps<typeof Ionicons>['name']> = {
  too_far: 'navigate-outline',
  rate_too_low: 'cash-outline',
  already_busy: 'time-outline',
  wrong_service: 'construct-outline',
};

/**
 * "Why are you rejecting?" — pick a reason, then confirm.
 *
 * Two taps rather than one on purpose: the reason rows sit where a thumb lands,
 * and a stray touch should not throw away a job. The confirm button stays
 * disabled until a reason is chosen, because a rejection without one teaches
 * dispatch nothing.
 */
export function DeclineSheet({
  visible,
  busy,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: DeclineReason) => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [reason, setReason] = useState<DeclineReason | null>(null);

  const close = () => {
    setReason(null);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title={t('worker.job.decline.title')}
      onClose={close}
      footer={
        <Pressable
          className={`h-14 flex-row items-center justify-center rounded-xl ${
            reason ? 'bg-worker-danger' : 'bg-worker-primary-soft'
          }`}
          disabled={!reason || busy}
          onPress={() => {
            if (!reason) return;
            onConfirm(reason);
            setReason(null);
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !reason || busy, busy }}
          accessibilityLabel={t('worker.job.decline.confirm')}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text weight="semibold" className={`text-base ${reason ? 'text-white' : 'text-worker-muted'}`}>
              {t('worker.job.decline.confirm')}
            </Text>
          )}
        </Pressable>
      }
    >
      <Text className="px-5 pt-3 text-base text-worker-muted">{t('worker.job.decline.subtitle')}</Text>
      <View className="px-3 pt-2" accessibilityRole="radiogroup">
        {DECLINE_REASONS.map((option) => {
          const active = option === reason;
          const label = t(`worker.job.decline.reasons.${option}`);
          return (
            <Pressable
              key={option}
              className={`mt-1 min-h-12 flex-row items-center rounded-xl px-3 ${active ? 'bg-worker-primary-tint' : ''}`}
              onPress={() => setReason(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Ionicons name={ICON[option]} size={20} color={active ? colors.primary : colors.muted} />
              <Text
                weight={active ? 'semibold' : 'regular'}
                className={`ml-3 flex-1 text-base ${active ? 'text-worker-primary' : 'text-worker-ink'}`}
              >
                {label}
              </Text>
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={active ? colors.primary : colors.outline}
              />
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
