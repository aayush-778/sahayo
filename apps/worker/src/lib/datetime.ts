import type { TFunction } from 'i18next';

import { clockParts } from '../services/registration';

/**
 * Dates and times as a worker reads them: "Today, 5:00 PM", "सुबह 8:30".
 *
 * Built from catalogue strings, not Intl — Hermes builds vary in how much of
 * Intl they carry, and a Hindi date that falls back to English on one phone is
 * worse than one written out by hand.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function formatClock(date: Date, t: TFunction): string {
  const parts = clockParts(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
  return t('worker.onboarding.availability.clock', {
    hour: parts.hour,
    minute: parts.minute,
    period: t(`worker.onboarding.availability.periods.${parts.period}`),
  });
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "Today, 5:00 PM", "Tomorrow, …", "Yesterday, …", or "12 Sep, 4:30 PM". */
export function formatWhen(iso: string, t: TFunction, now: Date = new Date()): string {
  const at = new Date(iso);
  const time = formatClock(at, t);
  const days = Math.round((startOfDay(at) - startOfDay(now)) / 86_400_000);
  if (days === 0) return t('worker.common.today', { time });
  if (days === 1) return t('worker.common.tomorrow', { time });
  if (days === -1) return t('worker.common.yesterday', { time });
  return t('worker.common.onDate', { day: at.getDate(), month: t(`booking.schedule.months.${at.getMonth()}`), time });
}

/** A running clock: `0:42:07`. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}:${pad(minutes)}:${pad(total % 60)}`;
}

/** "12 September". */
export function formatDayMonth(iso: string, t: TFunction): string {
  const at = new Date(iso);
  return t('worker.common.dayMonth', { day: at.getDate(), month: t(`booking.schedule.months.${at.getMonth()}`) });
}

export type TimeLeft = { unit: 'days' | 'hours' | 'minutes'; n: number } | { unit: 'closed'; n: 0 };

/** How long until a deadline, in the largest whole unit that is at least 1. */
export function timeLeft(deadline: string, now: number = Date.now()): TimeLeft {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return { unit: 'closed', n: 0 };
  const minutes = Math.floor(ms / 60_000);
  if (minutes >= 24 * 60) return { unit: 'days', n: Math.floor(minutes / (24 * 60)) };
  if (minutes >= 60) return { unit: 'hours', n: Math.floor(minutes / 60) };
  return { unit: 'minutes', n: Math.max(1, minutes) };
}

/** `HH:MM` as "8:30 AM" / "सुबह 8:30". */
export function formatTimeOfDay(time: string, t: TFunction): string {
  const [hours, minutes] = time.split(':').map(Number);
  return formatClock(new Date(2000, 0, 1, hours, minutes), t);
}

/** A chat list timestamp: the time today, "Yesterday", or the date. */
export function formatChatTime(iso: string, t: TFunction, now: Date = new Date()): string {
  const at = new Date(iso);
  const days = Math.round((startOfDay(at) - startOfDay(now)) / 86_400_000);
  if (days === 0) return formatClock(at, t);
  if (days === -1) return t('worker.chat.yesterday');
  return formatDayMonth(iso, t);
}

/** A day divider inside a thread: "Today", "Yesterday", or the date. */
export function formatChatDay(iso: string, t: TFunction, now: Date = new Date()): string {
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / 86_400_000);
  if (days === 0) return t('worker.chat.thread.today');
  if (days === -1) return t('worker.chat.yesterday');
  return formatDayMonth(iso, t);
}

/** A booking id as a worker would quote it on the phone: `#WBK-05`. */
export function jobCode(id: string): string {
  return `#${id.toUpperCase().replace(/_/g, '-')}`;
}
