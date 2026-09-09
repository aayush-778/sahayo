import type { Id, IsoDateTime } from './common';

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  WORKER: 'WORKER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: Id;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  /** Preferred locale for notifications and UI, e.g. `hi-IN`. */
  locale?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
