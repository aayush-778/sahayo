import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Intercepts Android's hardware back button while a screen is mounted.
 *
 * Expo Router already pops the stack for hardware back, which is right almost
 * everywhere. It is wrong on terminal screens: payment `replace`s its way to
 * the confirmation, so the entry underneath is the booking screen whose draft
 * has just been cleared. Popping to it shows "pick a service first" to
 * someone who has just paid.
 *
 * `handler` returns true to say the press was dealt with. Returning false
 * falls through to the default pop, so a screen can intercept conditionally.
 *
 * iOS has no hardware back and `BackHandler` is a no-op there, so this is
 * safe to call unconditionally.
 */
export function useHardwareBack(handler: () => boolean): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [handler]);
}
