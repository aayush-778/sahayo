/**
 * Static asset module declarations.
 *
 * Expo SDK 57 does not ship these, and the `expo-env.d.ts` that would provide
 * them is generated at dev-server start AND gitignored — so relying on it makes
 * `tsc --noEmit` pass locally and fail on a clean clone. Declaring them here
 * keeps typecheck honest in CI.
 *
 * Metro resolves these imports to an asset module id at bundle time, which is
 * what <Image source={...}> expects.
 */
declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.jpg' {
  const asset: number;
  export default asset;
}

declare module '*.jpeg' {
  const asset: number;
  export default asset;
}

declare module '*.svg' {
  const asset: number;
  export default asset;
}
