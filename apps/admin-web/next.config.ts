import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * @sahakar/shared ships TypeScript source, not a compiled dist.
   * Next has to compile it as part of this app's build.
   */
  transpilePackages: ['@sahakar/shared'],
};

export default nextConfig;
