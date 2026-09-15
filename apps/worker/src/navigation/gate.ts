import type { Href } from 'expo-router';

/**
 * The root layout's two gates, as a pure function.
 *
 *   1. Not signed in                          → the auth stack
 *   2. Signed in, onboarding not submitted    → the onboarding step reached
 *   3. Signed in, onboarding submitted        → the tabs
 *
 * A pure function rather than logic inside a `useEffect`, for one reason: it
 * can be checked. Every scenario — a fresh install, a registration abandoned on
 * step 3, a partner trying to jump ahead to review, a signed-in partner opening
 * the login route — is a call with a known answer, verifiable without a phone.
 * Retrofitting a second gate later would have touched every route; getting both
 * right now, and provably, is the point of doing them together.
 *
 * Nothing here imports React Native, which is what lets a Node script run it.
 */

/**
 * Onboarding runs 1 → 5, and 6 means submitted.
 *
 *   1  personal information   (Complete Your Profile — the signup screen itself)
 *   2  service details
 *   3  verification documents
 *   4  availability & rates
 *   5  review and submit
 *   6  submitted — onboarding is over; approval may still be pending
 *
 * Five steps since sub-phase 4.1. Availability & Rates was added because a gig
 * platform that does not know when a worker works, or what they charge, cannot
 * route them a job — and every constant below is derived from this list, so the
 * gate, the progress bar and the services moved together.
 */
export const ONBOARDING_STEPS = 5;
export const ONBOARDING_SUBMITTED = ONBOARDING_STEPS + 1;

/** The step each onboarding route belongs to. */
export const STEP_FOR_ROUTE: Record<string, number> = {
  'service-details': 2,
  documents: 3,
  availability: 4,
  review: 5,
};

export function routeForStep(step: number): Href {
  if (step <= 2) return '/service-details';
  if (step === 3) return '/documents';
  if (step === 4) return '/availability';
  return '/review';
}

export function isOnboardingComplete(step: number): boolean {
  return step >= ONBOARDING_SUBMITTED;
}

export interface GateState {
  isAuthenticated: boolean;
  onboardingStep: number;
}

/**
 * Where the user must be sent, or `null` if where they are is allowed.
 *
 * Returning `null` for an allowed location is what stops the redirect looping:
 * the root layout replaces the route, segments change, this runs again, and
 * now answers `null`.
 *
 * Inside onboarding, going BACK to an earlier step is allowed — a partner on
 * review may return to fix their documents. That includes step 1, the signup
 * screen, which is where Previous on step 2 leads. Going AHEAD of the step
 * reached is not, and neither is leaving onboarding for the tabs before
 * submitting.
 *
 * Because an allowed location returns null, the gate never moves a partner
 * forward out of a step they are on: each step's Next button does that, after
 * saving.
 */
export function resolveGate(state: GateState, segments: readonly string[]): Href | null {
  const group = segments[0];
  const inAuth = group === '(auth)';
  const inOnboarding = group === '(onboarding)';
  const onSignup = inAuth && segments[1] === 'signup';

  if (!state.isAuthenticated) return inAuth ? null : '/login';

  if (!isOnboardingComplete(state.onboardingStep)) {
    if (onSignup) return null;
    if (!inOnboarding) return routeForStep(state.onboardingStep);
    const routeStep = STEP_FOR_ROUTE[segments[1] ?? ''];
    if (routeStep === undefined || routeStep > state.onboardingStep) return routeForStep(state.onboardingStep);
    return null;
  }

  return inAuth || inOnboarding ? '/' : null;
}
