import type { Localized, QuickReplyKey } from '../types';

/**
 * What a customer writes back in the demo, a couple of seconds after the worker
 * sends something — so a thread looks alive on stage.
 *
 * Keyed by the quick reply that prompted it, with `free` for anything typed.
 * Sent in the customer's own language (their account's locale), because it is
 * the customer's words, not interface copy.
 */
export const CUSTOMER_REPLIES = {
  on_my_way: { en: 'Okay, thank you. See you soon.', hi: 'ठीक है, धन्यवाद। जल्दी मिलते हैं।' },
  reached: { en: 'Coming down in 2 minutes.', hi: 'दो मिनट में नीचे आ रहे हैं।' },
  late_10: { en: 'No problem, take your time.', hi: 'कोई बात नहीं, आराम से आइए।' },
  call_you: { en: 'Sure, I am free now.', hi: 'हाँ, अभी फ़्री हूँ, कॉल कर लीजिए।' },
  send_photo: { en: 'Sending it now.', hi: 'अभी भेजते हैं।' },
  work_done: { en: 'Checked it — working fine. Thank you!', hi: 'देख लिया — ठीक चल रहा है। धन्यवाद!' },
  free: { en: 'Okay 👍', hi: 'ठीक है 👍' },
} satisfies Record<QuickReplyKey | 'free', Localized>;
