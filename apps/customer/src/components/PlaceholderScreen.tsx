import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Link, useLocalSearchParams, usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@sahayo/ui-native';

/**
 * TEMPORARY. Delete as each screen is built for real.
 *
 * This is scaffolding for sub-phase 2.0, whose job is to prove the route tree
 * and the i18n/font pipeline — not to show any design. Each screen renders
 * its own route path, its route params if it has any, and links onward, so
 * "navigation between all routes works" is something you can walk rather than
 * take on trust.
 *
 * It lives in the app rather than in @sahayo/ui-native on purpose: it is
 * throwaway scaffolding, and the worker app has no reason to inherit it.
 *
 * The route path is shown as a technical identifier, not as UI copy, so it
 * deliberately does not go through i18n. Every actual display string here
 * (the back button) does.
 */

export interface PlaceholderLink {
  href: Href;
  /** The literal route path. A debug label, not translated copy. */
  label: string;
}

export function PlaceholderScreen({
  links = [],
  children,
}: {
  links?: PlaceholderLink[];
  /** Temporary controls a scaffold screen needs to be walkable — the signup
   *  fields, a logout button. Not a slot for design work. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();

  const paramEntries = Object.entries(params);

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View className="px-6">
        <Text className="text-xs uppercase tracking-widest text-brand-muted">route</Text>
        <Text weight="bold" className="mt-1 text-2xl text-brand-navy">
          {pathname}
        </Text>

        {paramEntries.length > 0 ? (
          <View className="mt-4 rounded-2xl border border-brand-border bg-brand-surface p-4">
            {paramEntries.map(([key, value]) => (
              <Text key={key} className="text-sm text-brand-muted">
                {key} = {String(value)}
              </Text>
            ))}
          </View>
        ) : null}

        {children ? <View className="mt-6">{children}</View> : null}

        {links.length > 0 ? (
          <View className="mt-8">
            {links.map((link) => (
              <Link key={link.label} href={link.href} asChild>
                <Pressable className="mb-3 rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
                  <Text weight="medium" className="text-base text-brand-primary">
                    {link.label}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        ) : null}

        {router.canGoBack() ? (
          <Pressable
            className="mt-4 self-start rounded-2xl bg-brand-primary px-6 py-4"
            accessibilityRole="button"
            onPress={() => router.back()}
          >
            <Text weight="semibold" className="text-base text-white">
              {t('common.back')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
