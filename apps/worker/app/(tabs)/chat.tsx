import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Text, useThemeColors } from '@sahayo/ui-native';

import { LanguageToggle } from '../../src/components/LanguageToggle';
import { formatChatTime } from '../../src/lib/datetime';
import { findSubCategory, localizedName, useLanguage, useThreads, type ThreadView } from '../../src/services';

/**
 * Chat — one conversation per booking.
 *
 * Each row says who, what job, what was said last, and whether anything is
 * unread. A customer who is typing shows as typing here too. Closed chats —
 * finished more than a day ago, or cancelled — stay in the list, marked closed,
 * so a worker can still look back at what was agreed.
 */
export default function ChatListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const threads = useThreads();

  return (
    <View className="flex-1 bg-worker-ground">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: 24 }}>
        <View className="w-full max-w-xl flex-1 self-center px-5">
          <View className="flex-row items-center">
            <View className="flex-1">
              <Text weight="bold" className="text-2xl text-worker-ink" accessibilityRole="header">
                {t('worker.chat.title')}
              </Text>
              <Text className="text-sm text-worker-muted">{t('worker.chat.subtitle')}</Text>
            </View>
            <LanguageToggle />
          </View>

          {threads.length === 0 ? (
            <View className="flex-1 items-center justify-center px-4 py-12">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-worker-primary-tint">
                <Ionicons name="chatbubbles-outline" size={26} color={colors.primary} />
              </View>
              <Text weight="semibold" className="mt-3 text-center text-lg text-worker-ink">
                {t('worker.chat.empty.title')}
              </Text>
              <Text className="mt-1 text-center text-sm text-worker-muted">{t('worker.chat.empty.body')}</Text>
            </View>
          ) : (
            <View className="mt-4 overflow-hidden rounded-2xl border border-worker-border bg-worker-surface">
              {threads.map((view, index) => (
                <ThreadRow key={view.thread.id} view={view} last={index === threads.length - 1} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ThreadRow({ view, last }: { view: ThreadView; last: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();

  const name = view.customer?.name ?? '—';
  const service = view.context.serviceId ? findSubCategory(view.context.serviceId) : undefined;
  const closed = view.context.state !== 'open';
  const message = view.lastMessage;
  const preview = view.typing
    ? t('worker.chat.typing')
    : message
      ? message.from === 'worker'
        ? t('worker.chat.you', { text: message.text })
        : message.text
      : t('worker.chat.noMessages');

  return (
    <Pressable
      className={`min-h-16 flex-row items-center px-4 py-3 ${last ? '' : 'border-b border-worker-border'}`}
      onPress={() => router.push(`/chat/${view.thread.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${preview}${view.unread ? `. ${view.unread}` : ''}`}
    >
      <Avatar name={name} />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text weight={view.unread ? 'bold' : 'semibold'} className="flex-1 text-sm text-worker-ink" numberOfLines={1}>
            {name}
          </Text>
          {message ? <Text className="ml-2 text-xs text-worker-muted">{formatChatTime(message.sentAt, t)}</Text> : null}
        </View>
        <View className="flex-row items-center">
          <Text className="flex-1 text-xs text-worker-primary" numberOfLines={1}>
            {service ? localizedName(service, language) : ''}
          </Text>
          {closed ? (
            <View className="ml-2 flex-row items-center">
              <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
              <Text className="ml-0.5 text-xs text-worker-muted">{t('worker.chat.closed')}</Text>
            </View>
          ) : null}
        </View>
        <View className="mt-0.5 flex-row items-center">
          <Text
            weight={view.unread ? 'semibold' : 'regular'}
            className={`flex-1 text-sm ${view.typing ? 'text-worker-success' : view.unread ? 'text-worker-ink' : 'text-worker-muted'}`}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {view.unread > 0 ? (
            <View className="ml-2 min-w-[20px] items-center rounded-full bg-worker-primary px-1.5">
              <Text weight="bold" className="text-xs text-white">
                {String(view.unread)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
