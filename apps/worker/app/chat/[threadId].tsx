import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, fontFamilies, Text, useFontScript, useThemeColors } from '@sahayo/ui-native';

import { StatusBadge } from '../../src/components/StatusBadge';
import { formatChatDay, formatClock, jobCode } from '../../src/lib/datetime';
import { toneForStatus } from '../../src/lib/status';
import {
  callPhone,
  findSubCategory,
  localizedName,
  markThreadRead,
  quickRepliesFor,
  sendMessage,
  useLanguage,
  useThread,
} from '../../src/services';
import type { QuickReplyKey } from '../../src/types';

const MAX_MESSAGE = 500;

/**
 * One conversation, about one booking.
 *
 * The booking sits under the header — service, status, a link to the job — so
 * both sides always know which job they are talking about.
 *
 * QUICK REPLIES sit right above the keyboard: "On my way", "I've reached your
 * location", "I'll be 10 minutes late"… one tap sends them, in the worker's
 * language. They are ordered for the job's stage — "Reached" first once the
 * worker has arrived — because a worker who types slowly on a phone keyboard
 * should almost never need to type.
 *
 * Sent messages appear at once. In the demo the customer starts typing and
 * replies a couple of seconds later, in their own language.
 */
export default function ChatThreadScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const language = useLanguage();
  const script = useFontScript();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const view = useThread(threadId);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const messageCount = view?.thread.messages.length ?? 0;

  // Opening the thread, and every new message while it is open, counts as read.
  useEffect(() => {
    if (threadId) void markThreadRead(threadId);
  }, [threadId, messageCount]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/chat'));

  if (!view) {
    return (
      <View className="flex-1 items-center justify-center bg-worker-ground px-6">
        <Text className="text-center text-base text-worker-muted">{t('worker.chat.thread.notFound')}</Text>
        <Pressable className="mt-4 min-h-12 justify-center" onPress={leave} accessibilityRole="button">
          <Text weight="semibold" className="text-base text-worker-primary">
            {t('common.back')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const { thread, customer, context } = view;
  const name = customer?.name ?? '—';
  const service = context.serviceId ? findSubCategory(context.serviceId) : undefined;
  const serviceName = service ? localizedName(service, language) : '';
  const open = context.state === 'open';
  const booking = context.booking;
  const request = context.request;

  const jobHref = booking ? `/job/active/${booking.id}` : request && context.state === 'open' ? `/job/${request.id}` : undefined;
  const badge = booking
    ? { label: t(`worker.status.${booking.status}`), tone: toneForStatus(booking.status) }
    : request
      ? context.state === 'open'
        ? { label: t('worker.status.PENDING_REQUEST'), tone: 'warning' as const }
        : { label: t('worker.status.DECLINED'), tone: 'danger' as const }
      : undefined;

  async function send(text: string, quickReply?: QuickReplyKey) {
    setError(null);
    const result = await sendMessage(thread.id, text, quickReply);
    if (result.ok) {
      if (!quickReply) setDraft('');
    } else if (result.reason === 'closed') {
      setError(t('worker.chat.thread.sendFailed'));
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-worker-ground" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View
        className="flex-row items-center border-b border-worker-border bg-worker-surface px-2 pb-1.5"
        style={{ paddingTop: insets.top + 4 }}
      >
        <Pressable
          className="h-12 w-12 items-center justify-center"
          onPress={leave}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Avatar name={name} />
        <View className="ml-2 flex-1">
          <Text weight="semibold" className="text-base text-worker-ink" numberOfLines={1} accessibilityRole="header">
            {name}
          </Text>
          <Text
            className={`text-xs ${view.typing ? 'text-worker-success' : 'text-worker-muted'}`}
            numberOfLines={1}
            accessibilityLiveRegion="polite"
          >
            {view.typing ? t('worker.chat.typing') : serviceName}
          </Text>
        </View>
        {customer ? (
          <Pressable
            className="h-12 w-12 items-center justify-center"
            onPress={() => void callPhone(customer.phone)}
            accessibilityRole="button"
            accessibilityLabel={t('worker.chat.thread.call', { name })}
          >
            <Ionicons name="call-outline" size={22} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {/* The booking this chat is about */}
      <Pressable
        className="flex-row items-center border-b border-worker-border bg-worker-primary-tint px-4 py-2"
        onPress={jobHref ? () => router.push(jobHref as never) : undefined}
        disabled={!jobHref}
        accessibilityRole={jobHref ? 'link' : 'text'}
        accessibilityLabel={`${serviceName} ${badge?.label ?? ''}`}
      >
        <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
        <Text className="ml-2 flex-1 text-xs text-worker-ink" numberOfLines={1}>
          {[serviceName, jobCode(thread.bookingId)].filter(Boolean).join(' · ')}
        </Text>
        {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
        {jobHref ? (
          <View className="ml-2 flex-row items-center">
            <Text weight="semibold" className="text-xs text-worker-primary">
              {t('worker.chat.thread.viewJob')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        ) : null}
      </Pressable>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {thread.messages.length === 0 ? (
          <Text className="mt-6 text-center text-sm text-worker-muted">{t('worker.chat.thread.start', { name })}</Text>
        ) : null}

        {thread.messages.map((message, index) => {
          const mine = message.from === 'worker';
          const day = formatChatDay(message.sentAt, t);
          const previous = thread.messages[index - 1];
          const showDay = !previous || formatChatDay(previous.sentAt, t) !== day;
          return (
            <Fragment key={message.id}>
              {showDay ? (
                <View className="my-2 items-center">
                  <View className="rounded-full bg-worker-border px-3 py-0.5">
                    <Text className="text-xs text-worker-muted">{day}</Text>
                  </View>
                </View>
              ) : null}
              <View
                className={`mt-1.5 max-w-[80%] rounded-2xl px-3 py-2 ${
                  mine ? 'self-end rounded-br-md bg-worker-primary' : 'self-start rounded-bl-md border border-worker-border bg-worker-surface'
                }`}
              >
                <Text className={`text-base ${mine ? 'text-white' : 'text-worker-ink'}`}>{message.text}</Text>
                <View className="mt-0.5 flex-row items-center self-end">
                  <Text className={`text-xs ${mine ? 'text-white' : 'text-worker-muted'}`}>
                    {formatClock(new Date(message.sentAt), t)}
                  </Text>
                  {mine ? (
                    <Ionicons name="checkmark-done" size={14} color={colors.onPrimary} style={{ marginLeft: 4 }} />
                  ) : null}
                </View>
              </View>
            </Fragment>
          );
        })}

        {view.typing ? (
          <View className="mt-1.5 self-start rounded-2xl rounded-bl-md border border-worker-border bg-worker-surface px-3 py-2">
            <Text className="text-sm text-worker-muted">{t('worker.chat.typing')}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Composer, or why there is none */}
      {open ? (
        <View className="border-t border-worker-border bg-worker-surface" style={{ paddingBottom: insets.bottom + 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, gap: 8 }}
            accessibilityLabel={t('worker.chat.thread.quickTitle')}
          >
            {quickRepliesFor(context).map((key) => (
              <Pressable
                key={key}
                className="h-10 flex-row items-center rounded-full border border-worker-primary bg-worker-primary-tint px-3.5"
                onPress={() => void send(t(`worker.chat.quick.${key}`), key)}
                hitSlop={{ top: 4, bottom: 4 }}
                accessibilityRole="button"
                accessibilityLabel={t(`worker.chat.quick.${key}`)}
              >
                <Ionicons name="flash-outline" size={14} color={colors.primary} />
                <Text weight="semibold" className="ml-1 text-sm text-worker-primary">
                  {t(`worker.chat.quick.${key}`)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {error ? <Text className="px-4 pt-2 text-sm text-worker-danger">{error}</Text> : null}
          <View className="flex-row items-end gap-2 px-3 pt-2">
            <TextInput
              className="max-h-28 min-h-12 flex-1 rounded-2xl border border-worker-outline bg-worker-ground px-4 py-3 text-base text-worker-ink"
              style={{ fontFamily: fontFamilies[script].regular }}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('worker.chat.thread.placeholder')}
              placeholderTextColor={colors.muted}
              multiline
              maxLength={MAX_MESSAGE}
              accessibilityLabel={t('worker.chat.thread.placeholder')}
            />
            <Pressable
              className={`h-12 w-12 items-center justify-center rounded-full ${
                draft.trim() ? 'bg-worker-primary' : 'bg-worker-primary-soft'
              }`}
              onPress={() => void send(draft)}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityState={{ disabled: !draft.trim() }}
              accessibilityLabel={t('worker.chat.thread.send')}
            >
              <Ionicons name="send" size={20} color={draft.trim() ? colors.onPrimary : colors.muted} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          className="flex-row items-center border-t border-worker-border bg-worker-surface px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
          <Text className="ml-2 flex-1 text-sm text-worker-muted">
            {context.state === 'finished' ? t('worker.chat.thread.closedFinished') : t('worker.chat.thread.closedCancelled')}
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
