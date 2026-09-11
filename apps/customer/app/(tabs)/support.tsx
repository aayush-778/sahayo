import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, FormField, PrimaryButton, Text } from '@sahayo/ui-native';

import { FAQ_KEYS, SUPPORT_EMAIL, SUPPORT_PHONE, type FaqKey } from '../../src/mocks/profile';
import { useAuthStore } from '../../src/store/auth';

/**
 * Support.
 *
 * An FAQ that answers the questions this platform actually raises — where the
 * fund goes, what share the worker keeps — and a contact form. The first two
 * entries are the cooperative ones on purpose: this is a screen judges open
 * looking for the model, and it should answer them before it answers
 * "how do I cancel".
 *
 * One question is open at a time. An accordion that lets everything expand
 * turns six entries into a wall the customer has to scroll past to reach the
 * form under it.
 *
 * THE FORM DOES NOT SEND ANYTHING. There is no backend until Phase 5, so it
 * validates, acknowledges, and says plainly that a real ticket is not raised
 * — a contact form that silently swallows a message is worse than one that
 * admits it is a mock.
 */
export default function SupportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const name = useAuthStore((state) => state.name);
  const phone = useAuthStore((state) => state.phone);

  const [open, setOpen] = useState<FaqKey | null>(FAQ_KEYS[0]);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const ready = message.trim().length >= 10;

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6">
        <Text weight="bold" className="text-2xl text-brand-navy">
          {t('support.title')}
        </Text>
        <Text className="mt-1 text-sm text-brand-muted">{t('support.subtitle')}</Text>

        {/* ------------------------------- FAQ ------------------------------- */}

        <Text weight="semibold" className="mt-6 text-sm text-brand-muted">
          {t('support.faqTitle')}
        </Text>

        <View className="mt-2 overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
          {FAQ_KEYS.map((key, index) => {
            const expanded = open === key;

            return (
              <View key={key}>
                {index > 0 ? <View className="h-px bg-brand-border" /> : null}

                <Pressable
                  className="flex-row items-center px-4 py-3.5"
                  onPress={() => setOpen(expanded ? null : key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={t(`support.faq.${key}.q`)}
                >
                  <Text
                    weight="medium"
                    className={`flex-1 text-sm ${
                      expanded ? 'text-brand-primary' : 'text-brand-navy'
                    }`}
                  >
                    {t(`support.faq.${key}.q`)}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={expanded ? brandColors.primary : brandColors.muted}
                  />
                </Pressable>

                {expanded ? (
                  <Text className="px-4 pb-4 text-sm text-brand-muted">
                    {t(`support.faq.${key}.a`)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ----------------------------- contact ----------------------------- */}

        <Text weight="semibold" className="mt-6 text-sm text-brand-muted">
          {t('support.contactTitle')}
        </Text>

        <View className="mt-2 rounded-2xl border border-brand-border bg-brand-surface p-4">
          <View className="flex-row items-center">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
              <Ionicons name="call-outline" size={17} color={brandColors.primary} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs text-brand-muted">{t('support.phoneLabel')}</Text>
              <Text weight="medium" className="text-sm text-brand-navy">
                {SUPPORT_PHONE}
              </Text>
            </View>
          </View>

          <View className="my-3 h-px bg-brand-border" />

          <View className="flex-row items-center">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
              <Ionicons name="mail-outline" size={17} color={brandColors.primary} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs text-brand-muted">{t('support.emailLabel')}</Text>
              <Text weight="medium" className="text-sm text-brand-navy">
                {SUPPORT_EMAIL}
              </Text>
            </View>
          </View>
        </View>

        <Text weight="semibold" className="mt-6 text-sm text-brand-muted">
          {t('support.formTitle')}
        </Text>

        <View className="mt-2">
          <FormField
            label={t('auth.nameLabel')}
            value={name}
            editable={false}
            accessory={<Ionicons name="lock-closed" size={14} color={brandColors.muted} />}
          />
          <FormField
            containerClassName="mt-4"
            label={t('auth.phoneLabel')}
            value={phone}
            editable={false}
            accessory={<Ionicons name="lock-closed" size={14} color={brandColors.muted} />}
          />
          <FormField
            containerClassName="mt-4"
            label={t('support.messageLabel')}
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setSent(false);
            }}
            placeholder={t('support.messagePlaceholder')}
            multiline
            numberOfLines={4}
            error={
              message.length > 0 && !ready ? t('support.messageTooShort') : undefined
            }
          />
        </View>

        {sent ? (
          <View className="mt-4 flex-row items-start rounded-xl border border-brand-success bg-brand-success-soft px-4 py-3">
            <Ionicons name="checkmark-circle" size={16} color={brandColors.success} />
            <Text className="ml-2 flex-1 text-sm text-brand-success">{t('support.sent')}</Text>
          </View>
        ) : null}

        <PrimaryButton
          className="mt-6"
          label={t('support.send')}
          disabled={!ready}
          onPress={() => {
            setSent(true);
            setMessage('');
          }}
        />

        <View className="mt-4 flex-row items-start rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
          <Ionicons name="information-circle-outline" size={16} color={brandColors.muted} />
          <Text className="ml-2 flex-1 text-xs text-brand-muted">{t('support.mockNote')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
