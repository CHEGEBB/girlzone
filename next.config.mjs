/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['Girlzone.ai'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'Girlzone.ai',
        pathname: '/assets/**',
      },
    ],
  },
}

export default nextConfig
