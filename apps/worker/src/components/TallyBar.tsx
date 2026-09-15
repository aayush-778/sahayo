import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import type { VoteTally } from '../types';

/**
 * Yes against No as one bar, with both counts named in words and icons — so
 * the result reads without telling green from red.
 */
export function TallyBar({ tally }: { tally: VoteTally }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const decided = tally.yes + tally.no;
  const yesPercent = decided > 0 ? (tally.yes / decided) * 100 : 0;
  const noPercent = decided > 0 ? 100 - yesPercent : 0;

  return (
    <View>
      <View className="h-2.5 flex-row overflow-hidden rounded-full bg-worker-border">
        <View className="h-full bg-worker-success" style={{ width: `${yesPercent}%` }} />
        <View className="h-full bg-worker-danger" style={{ width: `${noPercent}%` }} />
      </View>
      <View className="mt-1.5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text weight="semibold" className="ml-1 text-xs text-worker-success">
            {t('worker.coop.tally.yes', { n: tally.yes })}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text weight="semibold" className="mr-1 text-xs text-worker-danger">
            {t('worker.coop.tally.no', { n: tally.no })}
          </Text>
          <Ionicons name="close-circle" size={14} color={colors.danger} />
        </View>
      </View>
    </View>
  );
}
