import { Stack } from 'expo-router';
import { useThemeColors } from '@sahayo/ui-native';

/** The signed-out stack. The root layout's gate is what keeps a user here. */
export default function AuthLayout() {
  const colors = useThemeColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />;
}
