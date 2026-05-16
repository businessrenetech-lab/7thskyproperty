/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.vecteezy.com',
      },
      {
        protocol: 'https',
        hostname: 'languageacademy.com.bd',
      },
      {
        protocol: 'https',
        hostname: 'darkslateblue-cormorant-104679.hostingersite.com',
      },
    ],
  },
  // In production, /admin and /student are served by the monolith directly.
  // In dev, the gateway proxy handles routing, but these rewrites still work
  // as a convenience if running Next.js standalone.
  async rewrites() {
    // Only apply dev proxy rewrites when not in production
    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source: '/admin',
        destination: 'http://localhost:5174/admin/',
      },
      {
        source: '/admin/:path*',
        destination: 'http://localhost:5174/admin/:path*',
      },
    ];
  },
};

export default nextConfig;
