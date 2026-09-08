import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * @sahayo/shared ships TypeScript source, not a compiled dist.
   * Next has to compile it as part of this app's build.
   */
  transpilePackages: ['@sahayo/shared'],
};

export default nextConfig;
