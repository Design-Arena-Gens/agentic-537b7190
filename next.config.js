/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["https://agentic-537b7190.vercel.app"],
    },
  },
};

module.exports = nextConfig;
