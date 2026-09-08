import { Stack } from 'expo-router';

/**
 * The signed-out group. `signup` is the entry point for a new user; `login`
 * is reachable from it.
 *
 * The gate in the root layout keys off `segments[0] === '(auth)'`, so every
 * signed-out screen must live inside this group and nowhere else.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} initialRouteName="signup" />;
}
