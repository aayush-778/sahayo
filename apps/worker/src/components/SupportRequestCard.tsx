import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPaise, Text, useThemeColors } from '@sahayo/ui-native';

import { formatDayMonth } from '../lib/datetime';
import type { BadgeTone } from '../lib/status';
import { useLanguage } from '../services';
import type { SupportRequest } from '../types';
import { StatusBadge } from './StatusBadge';

const TONE: Record<SupportRequest['status'], BadgeTone> = {
  submitted: 'primary',
  under_review: 'warning',
  approved: 'success',
  repaying: 'primary',
  paid: 'success',
  declined: 'danger',
  closed: 'success',
};

/** A loan or claim this worker asked for, with where it stands. */
export function SupportRequestCard({ request }: { request: SupportRequest }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  const isLoan = request.kind === 'loan';
  const purpose = isLoan
    ? t(`worker.coop.form.purposes.${request.purpose}`)
    : t(`worker.coop.form.claimTypes.${request.purpose}`);
  const repaidShare = isLoan && request.amount > 0 ? Math.min(1, (request.repaidPaise ?? 0) / request.amount) : 0;

  return (
    <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
      <View className="flex-row items-start">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-worker-primary-tint">
          <Ionicons name={isLoan ? 'construct-outline' : 'medkit-outline'} size={20} color={colors.primary} />
        </View>
        <View className="ml-3 flex-1">
          <Text weight="semibold" className="text-base text-worker-ink">
            {t(`worker.coop.requests.kinds.${request.kind}`)}
          </Text>
          <Text className="text-sm text-worker-muted" numberOfLines={1}>
            {purpose}
          </Text>
        </View>
        <Text weight="bold" className="ml-2 text-base text-worker-ink">
          {formatPaise(request.amount, language)}
        </Text>
      </View>

      {isLoan && request.repaidPaise !== undefined ? (
        <View className="mt-3">
          <View className="h-1.5 overflow-hidden rounded-full bg-worker-primary-soft">
            <View className="h-full rounded-full bg-worker-success" style={{ width: `${repaidShare * 100}%` }} />
          </View>
          <Text className="mt-1 text-xs text-worker-muted">
            {t('worker.coop.requests.repaid', {
              repaid: formatPaise(request.repaidPaise, language),
              amount: formatPaise(request.amount, language),
            })}
          </Text>
        </View>
      ) : null}

      {request.note ? <Text className="mt-2 text-sm text-worker-ink">{request.note[language]}</Text> : null}

      <View className="mt-2 flex-row flex-wrap items-center justify-between gap-2">
        <StatusBadge label={t(`worker.coop.requests.status.${request.status}`)} tone={TONE[request.status]} />
        <Text className="text-xs text-worker-muted">
          {t('worker.coop.requests.sentOn', { when: formatDayMonth(request.createdAt, t) })}
        </Text>
      </View>
    </View>
  );
}
