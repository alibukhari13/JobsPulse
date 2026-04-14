import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,   // 👈 Ye Next.js ko batayega ke root yahi folder hai
  },
};

export default nextConfig;