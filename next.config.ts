
import type {NextConfig} from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['firebase-admin', 'genkit', '@genkit-ai/googleai', '@genkit-ai/next', 'zod'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:5000",
        "*.replit.dev",
        "*.repl.co",
        "*.sisko.replit.dev",
        ...(process.env.REPLIT_DOMAINS ? [process.env.REPLIT_DOMAINS] : [])
      ]
    }
  },
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.sisko.replit.dev",
    "*.pike.replit.dev"
  ],
};

export default withBundleAnalyzer(nextConfig);
