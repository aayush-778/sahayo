/**
 * The signed-in administrator.
 *
 * There is no authentication in the prototype, so this is a constant. It lives
 * here rather than inline in the sidebar so that when sign-in arrives, one
 * module changes and the shell does not.
 */
export interface AdminIdentity {
  name: string;
  role: string;
  avatarUrl?: string;
}

export const CURRENT_ADMIN: AdminIdentity = {
  name: 'Anjali Verma',
  role: 'Cooperative administrator',
};
