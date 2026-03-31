/** @type {import('next').NextConfig} */

const nextConfig = {
  // Pure Turbopack configuration (no webpack)
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // SWR and PWA handled differently for Turbopack
  // next-pwa may conflict with Turbopack, so we'll handle PWA via manifest.json instead
};

module.exports = nextConfig;
