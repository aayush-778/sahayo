import type { AdminCustomer, Id, User } from '@sahayo/shared';
import { state } from '../store';

/** The last ten digits of a phone number, however it was written. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function findByPhone(phone: string): User | undefined {
  const key = phoneKey(phone);
  for (const user of state().users.values()) if (phoneKey(user.phone) === key) return user;
  return undefined;
}

export function findById(userId: Id): User | undefined {
  return state().users.get(userId);
}

export function workerIdForUser(userId: Id): Id | undefined {
  return state().workerIdByUserId.get(userId);
}

/** The user record behind a worker id. */
export function userForWorker(workerId: Id): User | undefined {
  for (const [userId, id] of state().workerIdByUserId) if (id === workerId) return state().users.get(userId);
  return undefined;
}

export function findCustomer(customerId: Id): AdminCustomer | undefined {
  return state().customers.get(customerId);
}
