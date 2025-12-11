
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
      allowedOrigins: ["localhost:9002", "*.firebase.app", "*.vercel.app", "*.cloudworkstations.dev" ] // Adjust for your dev and prod domains
    },
    allowedDevOrigins: ["*.cloudworkstations.dev", "*.firebase.app", "*.vercel.app"]
  }
};

export default nextConfig;
