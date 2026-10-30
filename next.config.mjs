/** @type {import('next').NextConfig} */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL;

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  ...(siteUrl
    ? {
        env: {
          NEXT_PUBLIC_SITE_URL: siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`,
        },
      }
    : {}),
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
      };
    }
    return config;
  },
};

export default nextConfig;
