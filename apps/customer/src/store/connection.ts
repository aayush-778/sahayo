import { create } from 'zustand';

/**
 * Whether the app is talking to the server, for the banner and for the services that
 * choose between the server and the offline demo flow.
 *
 *   idle          signed out: nothing to connect
 *   connecting    first attempt since signing in
 *   live          connected; bookings, fares and tracking are the server's
 *   reconnecting  was live, lost the connection, retrying with backoff; server data stays on screen
 *   offline       never reached the server this session; the demo flow runs, still retrying
 */
export type ConnectionMode = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface ConnectionState {
  mode: ConnectionMode;
  /** Reconnection attempts since the connection was last up. */
  attempt: number;
  /** The customer id the socket is signed in as. */
  customerId: string | null;
  /** When the connection last came back after dropping, for a brief "back online" note. */
  restoredAt: number | null;
}

export const useConnectionStore = create<ConnectionState>()(() => ({
  mode: 'idle',
  attempt: 0,
  customerId: null,
  restoredAt: null,
}));
