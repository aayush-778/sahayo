import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatusBadge } from '../../src/components/StatusBadge';
import { formatWhen } from '../../src/lib/datetime';
import type { BadgeTone } from '../../src/lib/status';
import { formatMegabytes, selectIdProofType, uploadDocument, useWorkerProfile } from '../../src/services';
import { DOCUMENT_KINDS, ID_PROOF_TYPES, type DocumentKind, type DocumentStatus } from '../../src/types';

const TONE: Record<DocumentStatus, BadgeTone> = {
  verified: 'success',
  uploaded: 'warning',
  rejected: 'danger',
  missing: 'muted',
};

const ICON: Record<DocumentKind, 'id-card-outline' | 'home-outline' | 'person-circle-outline'> = {
  idProof: 'id-card-outline',
  addressProof: 'home-outline',
  photo: 'person-circle-outline',
};

/**
 * My documents — each proof, where the cooperative's check stands, and
 * re-upload.
 *
 * A document not accepted says why in plain words and offers Re-upload right
 * there. A re-uploaded document goes back to "being checked"; the cooperative,
 * not the worker, marks it verified.
 */
export default function ProfileDocumentsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const profile = useWorkerProfile();
  const [busyKind, setBusyKind] = useState<DocumentKind | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(kind: DocumentKind) {
    setNotice(null);
    setBusyKind(kind);
    const result = await uploadDocument(kind);
    setBusyKind(null);
    setNotice(
      result.ok
        ? { ok: true, text: t('worker.profile.documents.reuploaded') }
        : { ok: false, text: t('worker.onboarding.documents.errors.idTypeRequired') },
    );
  }

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader title={t('worker.profile.documents.title')} fallback="/profile" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <View className="w-full max-w-xl gap-3 self-center px-5">
          <Text className="text-sm text-worker-muted">{t('worker.profile.documents.intro')}</Text>

          {notice ? (
            <View
              className={`flex-row items-center rounded-xl px-3 py-2.5 ${notice.ok ? 'bg-worker-success-soft' : 'bg-worker-danger-soft'}`}
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name={notice.ok ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={notice.ok ? colors.success : colors.danger}
              />
              <Text className="ml-2 flex-1 text-sm text-worker-ink">{notice.text}</Text>
            </View>
          ) : null}

          {DOCUMENT_KINDS.map((kind) => {
            const status = profile.documents[kind];
            const file = profile.documentFiles[kind];
            const busy = busyKind === kind;
            const needsType = kind === 'idProof' && !profile.idProofType;
            return (
              <View key={kind} className="rounded-2xl border border-worker-border bg-worker-surface p-4">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-worker-primary-tint">
                    <Ionicons name={ICON[kind]} size={20} color={colors.primary} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text weight="semibold" className="text-base text-worker-ink">
                      {t(`worker.profile.documents.kinds.${kind}`)}
                    </Text>
                    {kind === 'idProof' && profile.idProofType ? (
                      <Text className="text-xs text-worker-muted">
                        {t('worker.profile.documents.idType', {
                          type: t(`worker.onboarding.documents.idTypes.${profile.idProofType}`),
                        })}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge label={t(`worker.profile.documents.status.${status}`)} tone={TONE[status]} />
                </View>

                {file ? (
                  <View className="mt-3 flex-row items-center rounded-xl bg-worker-ground px-3 py-2">
                    <Ionicons
                      name={file.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
                      size={18}
                      color={colors.muted}
                    />
                    <View className="ml-2 flex-1">
                      <Text className="text-sm text-worker-ink" numberOfLines={1}>
                        {`${file.name} · ${formatMegabytes(file.sizeBytes)}`}
                      </Text>
                      <Text className="text-xs text-worker-muted">
                        {t('worker.profile.documents.uploadedOn', { when: formatWhen(file.uploadedAt, t) })}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {status === 'rejected' ? (
                  <View className="mt-3 flex-row rounded-xl bg-worker-danger-soft px-3 py-2">
                    <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginTop: 2 }} />
                    <Text className="ml-2 flex-1 text-sm text-worker-ink">{t('worker.profile.documents.rejectedNote')}</Text>
                  </View>
                ) : null}

                {kind === 'idProof' && status !== 'verified' ? (
                  <View className="mt-3 flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
                    {ID_PROOF_TYPES.map((type) => {
                      const active = profile.idProofType === type;
                      return (
                        <Pressable
                          key={type}
                          className={`h-10 justify-center rounded-full border px-3 ${
                            active ? 'border-worker-primary bg-worker-primary-tint' : 'border-worker-outline bg-worker-surface'
                          }`}
                          onPress={() => void selectIdProofType(type)}
                          hitSlop={{ top: 4, bottom: 4 }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                        >
                          <Text weight="semibold" className={`text-xs ${active ? 'text-worker-primary' : 'text-worker-ink'}`}>
                            {t(`worker.onboarding.documents.idTypes.${type}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                <Pressable
                  className={`mt-3 h-12 flex-row items-center justify-center rounded-xl ${
                    status === 'missing' || status === 'rejected'
                      ? 'bg-worker-primary'
                      : 'border-2 border-worker-primary bg-worker-surface'
                  } ${needsType ? 'opacity-50' : ''}`}
                  onPress={() => void upload(kind)}
                  disabled={busy || needsType}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy || needsType, busy }}
                  accessibilityLabel={`${status === 'missing' ? t('worker.profile.documents.upload') : t('worker.profile.documents.reupload')} ${t(`worker.profile.documents.kinds.${kind}`)}`}
                >
                  {busy ? (
                    <ActivityIndicator
                      color={status === 'missing' || status === 'rejected' ? colors.onPrimary : colors.primary}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color={status === 'missing' || status === 'rejected' ? colors.onPrimary : colors.primary}
                      />
                      <Text
                        weight="semibold"
                        className={`ml-2 text-sm ${
                          status === 'missing' || status === 'rejected' ? 'text-white' : 'text-worker-primary'
                        }`}
                      >
                        {status === 'missing' ? t('worker.profile.documents.upload') : t('worker.profile.documents.reupload')}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
