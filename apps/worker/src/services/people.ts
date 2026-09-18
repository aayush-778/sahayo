import type { Id, User } from '@sahayo/shared';

import { findCustomer as findDemoCustomer } from '../mocks';
import { useSessionStore } from '../store/session';

/**
 * A customer by id: from the session, which holds everyone the server's bookings and
 * payouts mention, and failing that from the demo cast.
 */
export function findCustomer(id: Id): User | undefined {
  return useSessionStore.getState().customers[id] ?? findDemoCustomer(id);
}
