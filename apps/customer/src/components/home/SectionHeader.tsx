import { Pressable, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Text } from '@sahayo/ui-native';

/**
 * A section title with an optional trailing link — "All categories / View
 * all", "Best services / View all".
 *
 * App-local rather than in @sahayo/ui-native for now: it is used twice, but
 * both times on this screen. It earns promotion to the shared package the
 * first time a second screen wants it.
 */
export function SectionHeader({
  title,
  actionLabel,
  actionHref,
  className = '',
}: {
  title: string;
  actionLabel?: string;
  actionHref?: Href;
  className?: string;
}) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <Text weight="bold" className="text-lg text-brand-navy">
        {title}
      </Text>

      {actionLabel && actionHref ? (
        <Link href={actionHref} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={actionLabel} hitSlop={8}>
            <Text weight="medium" className="text-sm text-brand-primary">
              {actionLabel}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
