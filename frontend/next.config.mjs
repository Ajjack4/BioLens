/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configure Turbopack (Next.js 16 default)
  turbopack: {
    // Empty config to silence the warning
    // Turbopack handles source maps better by default
  },
}

export default nextConfig
