import { UserRole, type Id, type User } from '@sahayo/shared';

/**
 * The customers whose bookings, messages and reviews fill the worker app.
 *
 * Mixed locales on purpose: some write in Hindi, some in English, most in
 * between, which is what a Patna job feed actually looks like.
 */
const CREATED = '2025-12-02T06:30:00.000Z';
const UPDATED = '2026-08-20T09:00:00.000Z';

const customer = (id: string, name: string, phone: string, locale: 'hi-IN' | 'en-IN'): User => ({
  id,
  phone,
  name,
  role: UserRole.CUSTOMER,
  locale,
  createdAt: CREATED,
  updatedAt: UPDATED,
});

export const mockCustomers = [
  customer('usr_cust_01', 'Anita Sinha', '+919431100211', 'en-IN'),
  customer('usr_cust_02', 'Rajesh Prasad', '+919835200322', 'hi-IN'),
  customer('usr_cust_03', 'Meera Choudhary', '+919771300433', 'hi-IN'),
  customer('usr_cust_04', 'Vikram Singh', '+919430400544', 'en-IN'),
  customer('usr_cust_05', 'Sunaina Kumari', '+918210500655', 'hi-IN'),
  customer('usr_cust_06', 'Md. Faizan Ahmad', '+919708600766', 'hi-IN'),
  customer('usr_cust_07', 'Priya Raj', '+917004700877', 'en-IN'),
  customer('usr_cust_08', 'Ashok Mishra', '+919934800988', 'hi-IN'),
  customer('usr_cust_09', 'Kavita Devi', '+916201900199', 'hi-IN'),
  customer('usr_cust_10', 'Rohit Anand', '+919199100210', 'en-IN'),
  customer('usr_cust_11', 'Nazia Parveen', '+918877110321', 'hi-IN'),
  customer('usr_cust_12', 'Sanjeev Jha', '+919308120432', 'hi-IN'),
] satisfies User[];

export function findCustomer(id: Id): User | undefined {
  return mockCustomers.find((entry) => entry.id === id);
}
