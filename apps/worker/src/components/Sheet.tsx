import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

/**
 * A bottom sheet on React Native's own Modal.
 *
 * From the bottom because the worker app is used one-handed: the options land
 * under the thumb, not at the top of a tall phone. Tapping the backdrop, the
 * close button, or Android's back button all dismiss it.
 */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('worker.onboarding.close')}
        />
        <View className="max-h-[80%] rounded-t-3xl bg-worker-surface" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-center border-b border-worker-border px-5 py-2">
            <Text weight="bold" className="flex-1 text-lg text-worker-ink">
              {title}
            </Text>
            <Pressable
              className="h-12 w-12 items-center justify-center"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('worker.onboarding.close')}
            >
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          {children}
          {footer ? <View className="px-5 pt-3">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
