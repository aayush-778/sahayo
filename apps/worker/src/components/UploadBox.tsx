import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { formatMegabytes, MAX_DOCUMENT_BYTES } from '../services';
import type { UploadedFile } from '../types';

/**
 * One document slot: a dashed drop area until a file is attached, then the file
 * with Replace and Remove.
 *
 * "Tap to upload" rather than the design's "click or drag and drop" — there is
 * nothing to drag on a phone. `disabledHint` explains why a slot cannot be used
 * yet (no ID type chosen) instead of leaving a box that silently does nothing.
 */
export function UploadBox({
  label,
  hint,
  file,
  uploading,
  disabledHint,
  error,
  onUpload,
  onRemove,
  className = '',
}: {
  label?: string;
  hint?: string;
  file?: UploadedFile;
  uploading: boolean;
  disabledHint?: string;
  error?: string;
  onUpload: () => void;
  onRemove: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const formats = t('worker.onboarding.documents.formats', { size: formatMegabytes(MAX_DOCUMENT_BYTES) });

  return (
    <View className={className}>
      {label ? (
        <Text weight="semibold" className="text-base text-worker-ink">
          {label}
        </Text>
      ) : null}
      {hint ? <Text className="mt-0.5 text-sm text-worker-muted">{hint}</Text> : null}

      {file ? (
        <View className="mt-3 rounded-2xl border border-worker-outline bg-worker-surface p-4">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-worker-primary-tint">
              <Ionicons
                name={file.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View className="ml-3 flex-1">
              <Text weight="semibold" className="text-base text-worker-ink" numberOfLines={1}>
                {file.name}
              </Text>
              <View className="flex-row flex-wrap items-center">
                <Text className="text-sm text-worker-muted">{formatMegabytes(file.sizeBytes)} · </Text>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text weight="semibold" className="ml-1 text-sm text-worker-success">
                  {t('worker.onboarding.documents.uploaded')}
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-3 flex-row gap-3">
            <Pressable
              className="h-12 flex-1 flex-row items-center justify-center rounded-xl border-2 border-worker-primary"
              onPress={onUpload}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={`${t('worker.onboarding.documents.replace')} ${file.name}`}
            >
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text weight="semibold" className="text-sm text-worker-primary">
                  {t('worker.onboarding.documents.replace')}
                </Text>
              )}
            </Pressable>
            <Pressable
              className="h-12 flex-1 items-center justify-center rounded-xl border-2 border-worker-danger"
              onPress={onRemove}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={`${t('worker.onboarding.documents.remove')} ${file.name}`}
            >
              <Text weight="semibold" className="text-sm text-worker-danger">
                {t('worker.onboarding.documents.remove')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          className={`mt-3 min-h-40 items-center justify-center rounded-2xl border-2 border-dashed bg-worker-surface px-4 py-6 ${
            error ? 'border-worker-danger' : 'border-worker-outline'
          }`}
          onPress={onUpload}
          disabled={uploading || Boolean(disabledHint)}
          accessibilityRole="button"
          accessibilityState={{ disabled: uploading || Boolean(disabledHint), busy: uploading }}
          accessibilityLabel={`${label ?? ''} ${disabledHint ?? t('worker.onboarding.documents.tapToUpload')}`.trim()}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text weight="semibold" className="mt-3 text-base text-worker-primary">
                {t('worker.onboarding.documents.uploading')}
              </Text>
            </>
          ) : disabledHint ? (
            <>
              <Ionicons name="id-card-outline" size={26} color={colors.muted} />
              <Text className="mt-2 text-center text-base text-worker-muted">{disabledHint}</Text>
            </>
          ) : (
            <>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-worker-primary-tint">
                <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
              </View>
              <Text weight="semibold" className="mt-3 text-base text-worker-primary">
                {t('worker.onboarding.documents.tapToUpload')}
              </Text>
              <Text className="mt-1 text-center text-sm text-worker-muted">{formats}</Text>
            </>
          )}
        </Pressable>
      )}

      {error && !file ? <Text className="mt-2 text-sm text-worker-danger">{error}</Text> : null}
    </View>
  );
}
