/**
 * The live connection to the backend. Imported by src/services only — screens reach
 * the server through the same service functions they always called.
 */
export { ApiRequestError, api } from './api';
export {
  announceOffline,
  announceOnline,
  isLive,
  isServerBacked,
  liveWorkerId,
  sendAccept,
  sendDecline,
  startRealtime,
  stopRealtime,
} from './client';
export { refreshEarningsAndFund } from './hydrate';
