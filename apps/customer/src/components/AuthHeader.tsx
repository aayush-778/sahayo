import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Back button, centred title, language switcher — shared by signup and login.
 *
 * The back button renders only when there is somewhere to go back to. Signup
 * is the app's entry point, so on a cold start the stack is empty and a back
 * arrow would do nothing; it appears once you have arrived from login.
 *
 * The title is centred against the SCREEN rather than against the space left
 * between the two controls, which is why both controls are absolutely
 * positioned. Laying them out in a row would shift the title sideways
 * depending on whether the back button is present and on how wide the
 * language label is — and "हिन्दी" is a different width from "English", so
 * the title would move when the language changed.
 */
export function AuthHeader({ title }: { title: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="h-11 flex-row items-center justify-center">
      {router.canGoBack() ? (
        <Pressable
          className="absolute left-0 h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={18} color={brandColors.navy} />
        </Pressable>
      ) : null}

      <Text weight="semibold" className="text-base text-brand-navy">
        {title}
      </Text>

      <View className="absolute right-0">
        <LanguageSwitcher />
      </View>
    </View>
  );
}
