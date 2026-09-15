import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { UploadBox } from '../../src/components/UploadBox';
import {
  completeDocuments,
  removeDocument,
  selectIdProofType,
  uploadDocument,
  useWorkerProfile,
} from '../../src/services';
import { ID_PROOF_TYPES, type DocumentKind } from '../../src/types';

/**
 * Step 3 of 5 — verification documents: one government ID (any of three), an
 * address proof, and a recent photo.
 *
 * The ID box stays locked until the ID type is chosen, and says so, because a
 * file filed under the wrong ID type reaches the cooperative mislabelled.
 */
export default function DocumentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const profile = useWorkerProfile();

  const [uploading, setUploading] = useState<DocumentKind[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const isUploaded = (kind: DocumentKind) =>
    profile.documents[kind] === 'uploaded' || profile.documents[kind] === 'verified';
  const missingError = (kind: DocumentKind) =>
    submitted && !isUploaded(kind) ? t('worker.onboarding.documents.errors.required') : undefined;

  async function upload(kind: DocumentKind) {
    setUploading((current) => [...current, kind]);
    await uploadDocument(kind);
    setUploading((current) => current.filter((entry) => entry !== kind));
  }

  async function next() {
    setSubmitted(true);
    setBusy(true);
    const result = await completeDocuments();
    setBusy(false);
    if (result.ok) router.replace('/availability');
  }

  const slot = (kind: DocumentKind) => ({
    file: profile.documentFiles[kind],
    uploading: uploading.includes(kind),
    error: missingError(kind),
    onUpload: () => void upload(kind),
    onRemove: () => void removeDocument(kind),
  });

  return (
    <OnboardingScreen
      step={3}
      heading={t('worker.onboarding.documents.heading')}
      onPrevious={() => router.replace('/service-details')}
      onNext={() => void next()}
      nextLoading={busy}
    >
      <Text weight="semibold" className="mt-4 text-base text-worker-ink">
        {t('worker.onboarding.documents.idProof')}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {ID_PROOF_TYPES.map((type) => {
          const active = profile.idProofType === type;
          const label = t(`worker.onboarding.documents.idTypes.${type}`);
          return (
            <Pressable
              key={type}
              className={`min-h-12 flex-row items-center rounded-full border-2 px-4 ${
                active ? 'border-worker-primary bg-worker-primary-tint' : 'border-worker-outline bg-worker-surface'
              }`}
              onPress={() => void selectIdProofType(type)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              {active ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} /> : null}
              <Text
                weight="semibold"
                className={`text-sm ${active ? 'ml-1.5 text-worker-primary' : 'text-worker-ink'}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {submitted && !profile.idProofType ? (
        <Text className="mt-2 text-sm text-worker-danger">{t('worker.onboarding.documents.errors.idTypeRequired')}</Text>
      ) : null}

      <UploadBox
        className="mt-1"
        {...slot('idProof')}
        disabledHint={profile.idProofType ? undefined : t('worker.onboarding.documents.chooseIdFirst')}
      />

      <UploadBox
        className="mt-7"
        label={t('worker.onboarding.documents.addressProof')}
        hint={t('worker.onboarding.documents.addressHint')}
        {...slot('addressProof')}
      />

      <UploadBox
        className="mt-7"
        label={t('worker.onboarding.documents.photo')}
        hint={t('worker.onboarding.documents.photoHint')}
        {...slot('photo')}
      />
    </OnboardingScreen>
  );
}
