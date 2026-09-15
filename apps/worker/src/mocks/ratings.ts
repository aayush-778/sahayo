import type { Rating } from '../types';
import { daysAgo } from './time';

/**
 * Customer reviews of this worker, one per finished booking.
 *
 * Not all five stars. A wall of perfect scores reads as fabricated, and the one
 * three-star review — a late arrival — is the kind of feedback a ratings screen
 * exists to surface.
 */
export const mockRatings = [
  { id: 'rat_01', bookingId: 'wbk_05', customerId: 'usr_cust_01', stars: 5, comment: 'Explained the problem before fixing it. Very honest.', createdAt: daysAgo(0, 12) },
  { id: 'rat_02', bookingId: 'wbk_06', customerId: 'usr_cust_03', stars: 5, comment: 'बैटरी का पानी भी चेक किया, बिना कहे।', createdAt: daysAgo(1, 16) },
  { id: 'rat_03', bookingId: 'wbk_07', customerId: 'usr_cust_06', stars: 4, comment: 'Kaam accha tha, bas thoda der se aaye.', createdAt: daysAgo(2, 15) },
  { id: 'rat_04', bookingId: 'wbk_08', customerId: 'usr_cust_02', stars: 5, comment: 'पूरी वायरिंग साफ़-सुथरी की, पैनल पर लेबल भी लगाए।', createdAt: daysAgo(6, 17) },
  { id: 'rat_05', bookingId: 'wbk_09', customerId: 'usr_cust_04', stars: 3, comment: 'Came an hour late without calling. Work itself was fine.', createdAt: daysAgo(9, 19) },
  { id: 'rat_06', bookingId: 'wbk_10', customerId: 'usr_cust_05', stars: 5, comment: 'मोटर एक घंटे में ठीक। बहुत बढ़िया।', createdAt: daysAgo(14, 14) },
  { id: 'rat_07', bookingId: 'wbk_11', customerId: 'usr_cust_07', stars: 4, comment: 'Good work, cleaned up after.', createdAt: daysAgo(22, 18) },
  { id: 'rat_08', bookingId: 'wbk_12', customerId: 'usr_cust_08', stars: 5, comment: 'समय पर आए, सही दाम बताया।', createdAt: daysAgo(31, 16) },
] satisfies Rating[];
