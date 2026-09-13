/**
 * The signed-in administrator.
 *
 * There is no authentication in the prototype, so this is a constant. It lives
 * here rather than inline in the sidebar so that when sign-in arrives, one
 * module changes and the shell does not.
 */
export interface AdminIdentity {
  /**
   * Stable id, written into every audit record this administrator causes — an
   * Aadhaar reveal, a KYC decision, a dispute resolution. A fixed constant rather
   * than a generated value, so the audit trail survives a reload.
   */
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export const CURRENT_ADMIN: AdminIdentity = {
  id: 'admin-anjali-verma',
  name: 'Anjali Verma',
  role: 'Cooperative administrator',
};
