import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, Vibration, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import offerSound from '../../assets/sounds/offer.wav';
import { acceptJob, declineJob, useLiveOffer } from '../services';
import type { DeclineReason } from '../types';
import { DeclineSheet } from './DeclineSheet';
import { JobRequestCard } from './JobRequestCard';

/** Buzz, pause, buzz — felt in a pocket, and distinct from a message notification. */
const OFFER_VIBRATION = [0, 450, 200, 450];

/**
 * A live job offer, full screen, the moment the dispatcher sends it.
 *
 * It sounds and vibrates once per offer, counts down from the server's deadline (already
 * converted to this phone's clock when the offer arrived), and answers with the same
 * acceptJob / declineJob every screen uses. If another worker accepts first, it says so
 * for a moment and closes itself.
 *
 * Mounted once, in the tabs layout, so an offer interrupts whatever screen the worker is
 * on. Only live offers open it; the offline demo's offers stay on the dashboard.
 */
export function OfferModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const offer = useLiveOffer();
  const player = useAudioPlayer(offerSound);

  const [accepting, setAccepting] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineBusy, setDeclineBusy] = useState(false);
  const announced = useRef<string | null>(null);

  useEffect(() => {
    /* An offer must be heard with the ringer on silent too. */
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  const offerId = offer?.request.id;
  useEffect(() => {
    if (!offerId || announced.current === offerId) return;
    announced.current = offerId;
    try {
      void player.seekTo(0);
      player.play();
    } catch {
      /* No audio output available: the vibration still carries it. */
    }
    Vibration.vibrate(OFFER_VIBRATION);
  }, [offerId, player]);

  /* The worker opened Work details for this very offer: that screen answers it, so step aside. */
  const onDetails = offer ? pathname === `/job/${offer.request.id}` : false;
  if (!offer || onDetails) return null;
  const { request, taken } = offer;

  async function accept() {
    setAccepting(true);
    const result = await acceptJob(request.id);
    setAccepting(false);
    if (result.ok) router.push(`/job/active/${result.bookingId}`);
  }

  async function decline(reason: DeclineReason) {
    setDeclineBusy(true);
    await declineJob(request.id, reason);
    setDeclineBusy(false);
    setDeclineOpen(false);
  }

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => setDeclineOpen(true)}>
      <View className="flex-1 bg-worker-ground">
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}>
          <View className="w-full max-w-xl self-center px-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-worker-primary">
                <Ionicons name="notifications" size={24} color={colors.surface} />
              </View>
              <Text weight="bold" className="ml-3 flex-1 text-2xl text-worker-ink">
                {t('worker.offer.title')}
              </Text>
            </View>
            <Text className="mb-4 mt-2 text-base text-worker-muted">{t('worker.offer.subtitle')}</Text>

            {taken ? (
              <View className="items-center rounded-2xl border-2 border-worker-warning bg-worker-warning-soft px-5 py-8" accessibilityLiveRegion="assertive">
                <Ionicons name="hand-left-outline" size={40} color={colors.warning} />
                <Text weight="bold" className="mt-3 text-center text-xl text-worker-ink">
                  {t('worker.offer.taken')}
                </Text>
                <Text className="mt-2 text-center text-base text-worker-muted">{t('worker.offer.takenBody')}</Text>
              </View>
            ) : (
              <JobRequestCard request={request} accepting={accepting} onAccept={() => void accept()} onReject={() => setDeclineOpen(true)} />
            )}
          </View>
        </ScrollView>
        <DeclineSheet visible={declineOpen && !taken} busy={declineBusy} onClose={() => setDeclineOpen(false)} onConfirm={(reason) => void decline(reason)} />
      </View>
    </Modal>
  );
}
