import type { Id, User } from '@sahayo/shared';
import { workerAppCustomers } from '@sahayo/shared/seed/cast';

/**
 * The customers whose bookings, messages and reviews fill the worker app.
 *
 * Part of the demo cast in @sahayo/shared, so each is the same account, under the
 * same id, that the admin portal lists and the backend serves.
 */
export const mockCustomers: User[] = workerAppCustomers;

export function findCustomer(id: Id): User | undefined {
  return mockCustomers.find((entry) => entry.id === id);
}
