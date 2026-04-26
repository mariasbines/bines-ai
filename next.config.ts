import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

/**
 * Security response headers applied to every route.
 *
 * - Strict-Transport-Security: HTTPS-only for two years, preload-eligible.
 * - X-Content-Type-Options: blocks MIME-sniffing.
 * - X-Frame-Options: site cannot be iframed (clickjacking defence).
 * - Referrer-Policy: strip referrer cross-origin.
 * - Permissions-Policy: explicitly disable APIs we never use.
 */
const SECURITY_HEADERS = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',
  },
];

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  experimental: {
    mdxRs: false, // use JS-based MDX for remark-gfm support
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [['remark-gfm', {}]],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
