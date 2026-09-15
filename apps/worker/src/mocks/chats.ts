import type { ChatThread } from '../types';
import { daysAgo, minutesAgo } from './time';

/**
 * Five conversations with customers.
 *
 * Message text is shown exactly as the customer wrote it, in whatever mix of
 * Hindi and English they wrote it in. Translating a customer's own words would
 * put sentences in their mouth.
 */
export const mockThreads = [
  {
    id: 'thr_01',
    bookingId: 'wbk_01',
    customerId: 'usr_cust_09',
    messages: [
      { id: 'm_01_1', from: 'customer', text: 'भैया, मेन गेट खुला है, सीधे ऊपर आ जाइए।', sentAt: minutesAgo(92) },
      { id: 'm_01_2', from: 'worker', text: 'जी, पाँच मिनट में पहुँच रहा हूँ।', sentAt: minutesAgo(90) },
      { id: 'm_01_3', from: 'customer', text: 'पंखे के साथ एक स्विच बोर्ड भी देख लीजिएगा।', sentAt: minutesAgo(20) },
    ],
  },
  {
    id: 'thr_02',
    bookingId: 'wbk_02',
    customerId: 'usr_cust_10',
    messages: [
      { id: 'm_02_1', from: 'customer', text: 'Hi, the inverter beeps every few minutes since morning.', sentAt: minutesAgo(38) },
      { id: 'm_02_2', from: 'worker', text: 'Battery water may be low. I am on the way, 15 minutes.', sentAt: minutesAgo(35) },
      { id: 'm_02_3', from: 'customer', text: 'Okay, thanks. Parking is on the left side lane.', sentAt: minutesAgo(12) },
    ],
  },
  {
    id: 'thr_03',
    bookingId: 'wbk_03',
    customerId: 'usr_cust_11',
    messages: [
      { id: 'm_03_1', from: 'customer', text: 'शाम 5 बजे आ पाएँगे? उससे पहले घर पर कोई नहीं होगा।', sentAt: minutesAgo(170) },
      { id: 'm_03_2', from: 'worker', text: 'हाँ, 5 बजे ठीक है।', sentAt: minutesAgo(160) },
    ],
  },
  {
    id: 'thr_04',
    bookingId: 'wbk_04',
    customerId: 'usr_cust_12',
    messages: [
      { id: 'm_04_1', from: 'customer', text: 'Motor ka model Crompton 1HP hai. Koi part laana ho to bata dijiye.', sentAt: daysAgo(1, 20) },
    ],
  },
  {
    id: 'thr_05',
    bookingId: 'wbk_05',
    customerId: 'usr_cust_01',
    messages: [
      { id: 'm_05_1', from: 'worker', text: 'Fan is fixed. The capacitor was weak, I replaced it.', sentAt: daysAgo(0, 10) },
      { id: 'm_05_2', from: 'customer', text: 'Working perfectly now, thank you so much!', sentAt: daysAgo(0, 11) },
    ],
  },
] satisfies ChatThread[];
