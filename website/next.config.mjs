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
    if (process.env.NODE_ENV === 'production') {
      // On single-origin hosts (e.g. Hostinger) the Express API lives on its
      // own subdomain. Proxy the website's relative /api and /uploads calls to
      // it so no client code needs absolute URLs and no CORS is required.
      const apiOrigin = (process.env.NEXT_PUBLIC_API_ORIGIN || '').replace(/\/+$/, '');
      if (!apiOrigin) return [];
      return [
        { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
        { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      ];
    }
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
