const isVercel = Boolean(process.env.VERCEL);
const explicitBackendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

const API_PROXY_TARGET =
  explicitBackendOrigin || (isVercel ? null : "http://localhost:3000");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!API_PROXY_TARGET) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
