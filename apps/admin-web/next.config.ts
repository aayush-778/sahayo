import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * @sahayo/shared ships TypeScript source, not a compiled dist.
   * Next has to compile it as part of this app's build.
   */
  transpilePackages: ['@sahayo/shared'],

  /**
   * Where build output goes. `.next` unless NEXT_DIST_DIR says otherwise.
   *
   * `next dev` and `next build` both write `.next`, so building while a dev server is
   * running corrupts the dev server's output and its pages start failing. Setting
   * NEXT_DIST_DIR=.next-verify for a verification build keeps the two apart.
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
