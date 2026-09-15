import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { jumpToApprovedWorker, resetDemo } from '../services';
import { Sheet } from './Sheet';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The two demo shortcuts: start over as a new worker, or jump to an approved
 * worker with requests waiting. Only rendered where DEMO_TOOLS_ENABLED.
 *
 * Navigation waits a moment after the state change, so the root layout's gate
 * has settled before this screen moves on.
 */
export function DemoToolsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState<'reset' | 'jump' | null>(null);

  async function startOver() {
    setBusy('reset');
    await resetDemo();
    setBusy(null);
    onClose();
    setTimeout(() => router.replace('/signup'), 80);
  }

  async function jump() {
    setBusy('jump');
    await jumpToApprovedWorker();
    setBusy(null);
    onClose();
    setTimeout(() => (router.canDismiss() ? router.dismissTo('/') : router.replace('/')), 80);
  }

  return (
    <Sheet visible={visible} title={t('worker.demo.title')} onClose={onClose}>
      <Text className="px-5 pt-3 text-xs text-worker-muted">{t('worker.demo.note')}</Text>
      <View className="gap-2 px-3 py-2">
        <DemoAction
          icon="refresh-circle-outline"
          title={t('worker.demo.reset.title')}
          body={t('worker.demo.reset.body')}
          busy={busy === 'reset'}
          disabled={busy !== null}
          onPress={() => void startOver()}
        />
        <DemoAction
          icon="flash-outline"
          title={t('worker.demo.jump.title')}
          body={t('worker.demo.jump.body')}
          busy={busy === 'jump'}
          disabled={busy !== null}
          onPress={() => void jump()}
        />
      </View>
    </Sheet>
  );
}

function DemoAction({
  icon,
  title,
  body,
  busy,
  disabled,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  body: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      className="min-h-16 flex-row items-center rounded-xl border border-worker-border px-3 py-3"
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      accessibilityLabel={`${title}. ${body}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-worker-primary-tint">
        {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name={icon} size={22} color={colors.primary} />}
      </View>
      <View className="ml-3 flex-1">
        <Text weight="semibold" className="text-sm text-worker-ink">
          {title}
        </Text>
        <Text className="text-xs text-worker-muted">{body}</Text>
      </View>
    </Pressable>
  );
}
