import { useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookingStatus, COOP_FUND_SHARE, PLATFORM_SHARE, type Booking, type User } from '@sahayo/shared';
import {
  Avatar,
  FarePanel,
  formatDistance,
  formatDuration,
  formatPaise,
  FundHighlight,
  PrimaryButton,
  Text,
  useThemeColors,
} from '@sahayo/ui-native';

import { ActionBar } from '../../../src/components/ActionBar';
import { CodeInput } from '../../../src/components/CodeInput';
import { ElapsedTime } from '../../../src/components/ElapsedTime';
import { JobMap } from '../../../src/components/JobMap';
import { JobStepper } from '../../../src/components/JobStepper';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { Sheet } from '../../../src/components/Sheet';
import { StarRating } from '../../../src/components/StarRating';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { formatWhen, jobCode } from '../../../src/lib/datetime';
import {
  callPhone,
  CANCELLED_STATUSES,
  COMPLETED_STATUSES,
  completeJob,
  findSubCategory,
  localizedName,
  markArrived,
  openDirections,
  openInMaps,
  openThreadForBooking,
  START_CODE_LENGTH,
  startTrip,
  startWork,
  travelFromBase,
  useBooking,
  useCustomerRating,
  useDemoStartCode,
  useJobTimeline,
  useLanguage,
  useRatingForBooking,
  workerBase,
} from '../../../src/services';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const percent = (share: number) => Math.round(share * 100);

/**
 * The job in hand — the middle of the two-phone demo.
 *
 * ONE SCREEN, ONE STATE AT A TIME, ONE BUTTON. The booking's status decides
 * what is on screen and what the single action in the pinned bar does:
 *
 *   ACCEPTED     where the job is, who the customer is      Start journey
 *   EN_ROUTE     distance, ETA, directions                  I've arrived
 *   ARRIVED      the customer's 4-digit start code          Start work
 *   IN_PROGRESS  time on the job, what the job is           Mark complete
 *   COMPLETED    what was earned, and where the fare went   Return to dashboard
 *
 * A worker in the street, phone in one hand, never has to choose between two
 * buttons. The start code is the one step that cannot be tapped through: only
 * the customer holds it, which is what stops a job being completed — and paid
 * — without the worker reaching the door.
 *
 * Completing writes the payout and the fund contribution to the ledger, so
 * Earnings, the dashboard and the fund all move the moment this screen does.
 * Finished and cancelled bookings opened from Bookings land here too, as their
 * summary.
 */
export default function ActiveJobScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const language = useLanguage();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const view = useBooking(jobId);
  const timeline = useJobTimeline(jobId);
  const demoCode = useDemoStartCode(jobId);
  const received = useRatingForBooking(jobId);
  const myRating = useCustomerRating(jobId);

  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!view) {
    return (
      <View className="flex-1 bg-worker-ground">
        <ScreenHeader title={t('worker.active.title')} fallback="/bookings" />
        <View className="w-full max-w-xl flex-1 items-center justify-center self-center px-6">
          <Ionicons name="file-tray-outline" size={40} color={colors.muted} />
          <Text weight="bold" className="mt-3 text-center text-lg text-worker-ink">
            {t('worker.active.notFound.title')}
          </Text>
          <Text className="mt-1 text-center text-sm text-worker-muted">{t('worker.active.notFound.body')}</Text>
          <PrimaryButton
            className="mt-5 self-stretch"
            label={t('worker.active.actions.backToBookings')}
            onPress={() => router.dismissTo('/bookings')}
          />
        </View>
      </View>
    );
  }

  const { booking, customer } = view;
  const status = booking.status;
  const service = findSubCategory(booking.serviceCategoryId);
  const serviceName = service ? localizedName(service, language) : booking.serviceCategoryId;
  const fare = booking.fare;
  const address = booking.address;
  const travel = travelFromBase(address.point);
  const finished = COMPLETED_STATUSES.has(status);
  const cancelled = CANCELLED_STATUSES.has(status);
  const name = customer?.name ?? '—';

  const title = finished
    ? t('worker.active.completedTitle')
    : cancelled
      ? t('worker.active.cancelledTitle')
      : t('worker.active.title');

  async function move(action: () => Promise<{ ok: boolean }>) {
    setActionError(null);
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) setActionError(t('worker.active.stale'));
  }

  async function open(action: () => Promise<boolean>) {
    setActionError(null);
    if (!(await action())) setActionError(t('worker.job.customer.openFailed'));
  }

  const openChat = () => {
    const threadId = openThreadForBooking(booking.id);
    if (threadId) router.push(`/chat/${threadId}`);
  };

  async function submitCode() {
    setCodeError(null);
    setBusy(true);
    const result = await startWork(booking.id, code);
    setBusy(false);
    if (result.ok) return;
    if (result.reason === 'wrong_code') {
      setCode('');
      setCodeError(t('worker.active.code.wrong'));
    } else if (result.reason === 'incomplete') {
      setCodeError(t('worker.active.code.incomplete'));
    } else {
      setCodeError(t('worker.active.stale'));
    }
  }

  async function complete() {
    setBusy(true);
    const result = await completeJob(booking.id);
    setBusy(false);
    setConfirmOpen(false);
    if (!result.ok) setActionError(t('worker.active.stale'));
  }

  const workMinutes =
    timeline.IN_PROGRESS && timeline.COMPLETED
      ? Math.max(1, Math.round((new Date(timeline.COMPLETED).getTime() - new Date(timeline.IN_PROGRESS).getTime()) / 60_000))
      : undefined;
  const cancelReason = booking.cancellationReason
    ? t(`worker.active.cancelReasons.${booking.cancellationReason}`, { defaultValue: '' })
    : '';

  return (
    <View className="flex-1 bg-worker-ground">
      <ScreenHeader title={title} fallback="/bookings" />

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-3 self-center px-5">
          {cancelled ? null : <JobStepper status={status} />}

          {/* ---------------------------- ACCEPTED ---------------------------- */}
          {status === BookingStatus.ACCEPTED ? (
            <>
              <Hint text={t('worker.active.hint.ACCEPTED')} />
              <JobMap
                worker={workerBase()}
                customer={address.point}
                label={t('worker.active.route.awayEta', {
                  distance: formatDistance(travel.distanceM, language),
                  eta: formatDuration(travel.etaMinutes, language),
                })}
              />
              <CustomerCard customer={customer} booking={booking} onOpen={(action) => void open(action)} onChat={openChat} />
              <ServiceCard booking={booking} serviceName={serviceName} />
              {fare ? (
                <Card>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-worker-muted">{t('worker.active.payout.youEarn')}</Text>
                    <Text className="text-xs text-worker-muted">
                      {t('worker.active.payout.fare', { amount: formatPaise(fare.total, language) })}
                    </Text>
                  </View>
                  <Text weight="bold" className="text-2xl text-worker-success">
                    {formatPaise(fare.workerShare, language)}
                  </Text>
                </Card>
              ) : null}
            </>
          ) : null}

          {/* ---------------------------- EN_ROUTE ---------------------------- */}
          {status === BookingStatus.EN_ROUTE ? (
            <>
              <Hint text={t('worker.active.hint.EN_ROUTE')} />
              <View className="flex-row gap-3">
                <Figure label={t('worker.active.route.distance')} value={formatDistance(travel.distanceM, language)} />
                <Figure label={t('worker.active.route.eta')} value={formatDuration(travel.etaMinutes, language)} />
              </View>
              <JobMap worker={workerBase()} customer={address.point} />
              <Pressable
                className="h-12 flex-row items-center justify-center rounded-xl border-2 border-worker-primary bg-worker-surface"
                onPress={() => void open(() => openDirections(address.point))}
                accessibilityRole="button"
                accessibilityLabel={t('worker.active.actions.navigate')}
              >
                <Ionicons name="navigate" size={18} color={colors.primary} />
                <Text weight="semibold" className="ml-2 text-base text-worker-primary">
                  {t('worker.active.actions.navigate')}
                </Text>
              </Pressable>
              <CustomerCard customer={customer} booking={booking} onOpen={(action) => void open(action)} onChat={openChat} />
            </>
          ) : null}

          {/* ---------------------------- ARRIVED ----------------------------- */}
          {status === BookingStatus.ARRIVED ? (
            <>
              <Card title={t('worker.active.code.title')}>
                <Text className="text-sm text-worker-muted">{t('worker.active.code.body', { name })}</Text>
                <View className="mt-4">
                  <CodeInput
                    value={code}
                    onChange={(value) => {
                      setCode(value);
                      setCodeError(null);
                    }}
                    length={START_CODE_LENGTH}
                    label={t('worker.active.code.label')}
                    error={Boolean(codeError)}
                  />
                </View>
                {codeError ? (
                  <Text className="mt-3 text-center text-sm text-worker-danger" accessibilityLiveRegion="polite">
                    {codeError}
                  </Text>
                ) : null}
                {demoCode ? (
                  <View className="mt-4 flex-row items-center rounded-xl bg-worker-primary-tint px-3 py-2.5">
                    <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                    <Text className="ml-2 flex-1 text-sm text-worker-ink">
                      {t('worker.active.code.demo', { code: demoCode })}
                    </Text>
                  </View>
                ) : null}
              </Card>
              <CustomerCard customer={customer} booking={booking} onOpen={(action) => void open(action)} onChat={openChat} />
            </>
          ) : null}

          {/* --------------------------- IN_PROGRESS -------------------------- */}
          {status === BookingStatus.IN_PROGRESS ? (
            <>
              <Card>
                <View className="items-center">
                  <Text className="text-sm text-worker-muted">{t('worker.active.working.elapsed')}</Text>
                  <ElapsedTime since={timeline.IN_PROGRESS ?? booking.updatedAt} />
                  <Text weight="semibold" className="mt-1 text-center text-base text-worker-primary">
                    {serviceName}
                  </Text>
                </View>
              </Card>
              <Hint text={t('worker.active.hint.IN_PROGRESS')} />
              <ServiceCard booking={booking} serviceName={serviceName} />
              <CustomerCard customer={customer} booking={booking} onOpen={(action) => void open(action)} onChat={openChat} />
            </>
          ) : null}

          {/* ---------------------------- FINISHED ---------------------------- */}
          {finished ? (
            <>
              <Card>
                <View className="flex-row items-center justify-between gap-2">
                  <Text weight="bold" className="flex-1 text-base text-worker-ink">
                    {t('worker.active.completedTitle')}
                  </Text>
                  <StatusBadge label={t(`worker.status.${status}`)} tone="success" />
                </View>
                <Text className="mt-1 text-xs text-worker-muted">
                  {t('worker.active.summary.jobId', { id: jobCode(booking.id) })}
                </Text>
                <Text weight="semibold" className="mt-2 text-base text-worker-ink">
                  {name}
                </Text>
                <InfoRow icon="location-outline">{`${address.line2 ?? address.line1}, ${address.city}`}</InfoRow>
              </Card>

              <Card title={t('worker.job.service.title')}>
                <Text weight="semibold" className="text-base text-worker-ink">
                  {serviceName}
                </Text>
                <InfoRow icon="calendar-outline">{formatWhen(timeline.COMPLETED ?? booking.updatedAt, t)}</InfoRow>
                {workMinutes ? (
                  <InfoRow icon="hourglass-outline">
                    {t('worker.active.summary.duration', { duration: formatDuration(workMinutes, language) })}
                  </InfoRow>
                ) : null}
              </Card>

              {fare ? (
                <>
                  <Card>
                    <Text className="text-sm text-worker-muted">{t('worker.job.pay.netLabel')}</Text>
                    <Text weight="bold" className="text-4xl text-worker-success">
                      {formatPaise(fare.workerShare, language)}
                    </Text>
                    <Text className="mt-1 text-xs text-worker-muted">
                      {status === BookingStatus.SETTLED
                        ? t('worker.active.summary.paidOut')
                        : t('worker.active.summary.addedToEarnings')}
                    </Text>
                    <Pressable
                      className="min-h-12 flex-row items-center self-start"
                      onPress={() => router.push('/earnings')}
                      accessibilityRole="link"
                      accessibilityLabel={t('worker.active.summary.openEarnings')}
                    >
                      <Text weight="semibold" className="text-sm text-worker-primary">
                        {t('worker.active.summary.openEarnings')}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </Pressable>
                  </Card>

                  <FarePanel
                    title={t('worker.active.summary.charges')}
                    locale={language}
                    rows={[
                      { kind: 'amount', key: 'gross', label: t('worker.job.pay.gross'), amount: fare.total },
                      { kind: 'caption', key: 'deducted', label: t('worker.job.pay.deducted') },
                      {
                        kind: 'amount',
                        key: 'platform',
                        label: t('worker.job.pay.platformFee', { pct: percent(PLATFORM_SHARE) }),
                        amount: fare.platformShare,
                        tone: 'muted',
                        indented: true,
                      },
                      {
                        kind: 'amount',
                        key: 'fund',
                        label: t('worker.job.pay.coopFund', { pct: percent(COOP_FUND_SHARE) }),
                        amount: fare.coopFundShare,
                        tone: 'fund',
                        indented: true,
                        icon: <Ionicons name="people" size={14} color={colors.success} />,
                      },
                    ]}
                    totalLabel={t('worker.job.pay.netLabel')}
                    totalAmount={fare.workerShare}
                  />

                  <FundHighlight
                    amount={fare.coopFundShare}
                    title={t('worker.active.summary.fundTitle')}
                    body={t('worker.active.summary.fundBody', { pct: percent(COOP_FUND_SHARE) })}
                    locale={language}
                    icon={<Ionicons name="people" size={22} color={colors.onPrimary} />}
                  />
                </>
              ) : null}

              <Card title={t('worker.active.summary.feedbackTitle')}>
                {received ? (
                  <>
                    <StarRating value={received.stars} starLabel={(n) => t('worker.rate.starA11y', { n })} />
                    <View className="mt-2 rounded-xl bg-worker-ground px-3 py-2">
                      <Text className="text-sm text-worker-ink">{`“${received.comment}”`}</Text>
                    </View>
                  </>
                ) : (
                  <Text className="text-sm text-worker-muted">{t('worker.active.summary.noFeedback')}</Text>
                )}
              </Card>

              <Card title={t('worker.active.summary.yourRatingTitle')}>
                {myRating ? (
                  <>
                    <StarRating value={myRating.stars} starLabel={(n) => t('worker.rate.starA11y', { n })} />
                    {myRating.flags.length > 0 ? (
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        {myRating.flags.map((flag) => (
                          <StatusBadge key={flag} label={t(`worker.rate.flags.${flag}`)} tone="danger" />
                        ))}
                      </View>
                    ) : null}
                    {myRating.comment ? (
                      <Text className="mt-2 text-sm text-worker-ink">{myRating.comment}</Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text className="text-sm text-worker-muted">{t('worker.active.summary.ratePrompt')}</Text>
                    <Pressable
                      className="mt-3 h-12 flex-row items-center justify-center rounded-xl border-2 border-worker-primary"
                      onPress={() => router.push(`/job/rate/${booking.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={t('worker.active.summary.rateCta', { name })}
                    >
                      <Ionicons name="star-outline" size={18} color={colors.primary} />
                      <Text weight="semibold" className="ml-2 text-sm text-worker-primary">
                        {t('worker.active.summary.rateCta', { name })}
                      </Text>
                    </Pressable>
                  </>
                )}
              </Card>
            </>
          ) : null}

          {/* ---------------------------- CANCELLED --------------------------- */}
          {cancelled ? (
            <Card>
              <StatusBadge label={t(`worker.status.${status}`)} tone="danger" />
              <Text weight="semibold" className="mt-2 text-base text-worker-ink">
                {`${name} · ${serviceName}`}
              </Text>
              <Text className="mt-1 text-sm text-worker-muted">{t('worker.active.cancelled.body')}</Text>
              {cancelReason ? (
                <Text className="mt-1 text-sm text-worker-ink">
                  {t('worker.active.cancelled.reason', { reason: cancelReason })}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <ActionBar>
        {actionError ? (
          <Text className="text-center text-sm text-worker-danger" accessibilityLiveRegion="polite">
            {actionError}
          </Text>
        ) : null}
        {status === BookingStatus.ACCEPTED ? (
          <PrimaryButton
            label={t('worker.active.actions.startJourney')}
            loading={busy}
            onPress={() => void move(() => startTrip(booking.id))}
          />
        ) : status === BookingStatus.EN_ROUTE ? (
          <PrimaryButton
            label={t('worker.active.actions.arrived')}
            loading={busy}
            onPress={() => void move(() => markArrived(booking.id))}
          />
        ) : status === BookingStatus.ARRIVED ? (
          <PrimaryButton
            label={t('worker.active.actions.startWork')}
            loading={busy}
            disabled={code.length !== START_CODE_LENGTH}
            onPress={() => void submitCode()}
          />
        ) : status === BookingStatus.IN_PROGRESS ? (
          <PrimaryButton label={t('worker.active.actions.markComplete')} onPress={() => setConfirmOpen(true)} />
        ) : cancelled ? (
          <PrimaryButton label={t('worker.active.actions.backToBookings')} onPress={() => router.dismissTo('/bookings')} />
        ) : (
          <PrimaryButton label={t('worker.active.actions.backToDashboard')} onPress={() => router.dismissTo('/')} />
        )}
      </ActionBar>

      <Sheet
        visible={confirmOpen}
        title={t('worker.active.complete.title')}
        onClose={() => setConfirmOpen(false)}
        footer={
          <View className="gap-2">
            <PrimaryButton
              label={t('worker.active.complete.confirm')}
              loading={busy}
              onPress={() => void complete()}
            />
            <Pressable
              className="h-12 items-center justify-center"
              onPress={() => setConfirmOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('worker.active.complete.cancel')}
            >
              <Text weight="semibold" className="text-base text-worker-primary">
                {t('worker.active.complete.cancel')}
              </Text>
            </Pressable>
          </View>
        }
      >
        <Text className="px-5 pt-3 text-base text-worker-ink">
          {t('worker.active.complete.body', { amount: formatPaise(fare?.workerShare ?? 0, language) })}
        </Text>
      </Sheet>
    </View>
  );
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="rounded-2xl border border-worker-border bg-worker-surface p-4">
      {title ? (
        <Text weight="bold" className="mb-2 text-base text-worker-ink" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function InfoRow({ icon, children }: { icon: IoniconName; children: string }) {
  const colors = useThemeColors();
  return (
    <View className="mt-1.5 flex-row items-center">
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text className="ml-2 flex-1 text-sm text-worker-ink">{children}</Text>
    </View>
  );
}

function Hint({ text }: { text: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center rounded-xl bg-worker-primary-tint px-3 py-2.5">
      <Ionicons name="information-circle" size={18} color={colors.primary} />
      <Text className="ml-2 flex-1 text-sm text-worker-ink">{text}</Text>
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-worker-border bg-worker-surface p-4">
      <Text className="text-xs text-worker-muted">{label}</Text>
      <Text weight="bold" className="text-2xl text-worker-ink">
        {value}
      </Text>
    </View>
  );
}

function CustomerCard({
  customer,
  booking,
  onOpen,
  onChat,
}: {
  customer?: User;
  booking: Booking;
  onOpen: (action: () => Promise<boolean>) => void;
  onChat: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const address = booking.address;
  const lines = [address.line1, address.line2, `${address.city} ${address.pincode}`].filter(Boolean).join(', ');

  return (
    <Card title={t('worker.active.customer.title')}>
      <View className="flex-row items-center">
        <Avatar name={customer?.name ?? '—'} />
        <View className="ml-3 flex-1">
          <Text weight="semibold" className="text-base text-worker-ink" numberOfLines={1}>
            {customer?.name ?? '—'}
          </Text>
          <Text className="text-sm text-worker-muted">{lines}</Text>
        </View>
        {customer ? (
          <Pressable
            className="ml-2 h-12 w-12 items-center justify-center rounded-full bg-worker-primary-tint"
            onPress={onChat}
            accessibilityRole="button"
            accessibilityLabel={t('worker.chat.thread.open', { name: customer.name })}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
        {customer ? (
          <Pressable
            className="ml-2 h-12 w-12 items-center justify-center rounded-full bg-worker-primary-tint"
            onPress={() => onOpen(() => callPhone(customer.phone))}
            accessibilityRole="button"
            accessibilityLabel={t('worker.job.customer.call', { name: customer.name })}
          >
            <Ionicons name="call" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        className="mt-1 min-h-12 flex-row items-center self-start"
        onPress={() => onOpen(() => openInMaps(address.point))}
        accessibilityRole="link"
        accessibilityLabel={t('worker.job.customer.viewOnMap')}
      >
        <Ionicons name="map-outline" size={18} color={colors.primary} />
        <Text weight="semibold" className="ml-1.5 text-sm text-worker-primary">
          {t('worker.job.customer.viewOnMap')}
        </Text>
      </Pressable>
    </Card>
  );
}

function ServiceCard({ booking, serviceName }: { booking: Booking; serviceName: string }) {
  const { t } = useTranslation();
  return (
    <Card title={t('worker.job.service.title')}>
      <Text weight="semibold" className="text-base text-worker-ink">
        {serviceName}
      </Text>
      <InfoRow icon="time-outline">
        {booking.scheduledFor ? formatWhen(booking.scheduledFor, t) : t('worker.job.service.asap')}
      </InfoRow>
      <View className="mt-3 rounded-xl bg-worker-ground px-3 py-2">
        <Text className={`text-sm ${booking.notes ? 'text-worker-ink' : 'text-worker-muted'}`}>
          {booking.notes ?? t('worker.job.service.noNotes')}
        </Text>
      </View>
    </Card>
  );
}
