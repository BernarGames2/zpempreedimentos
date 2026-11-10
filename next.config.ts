import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1440, 1920],
  },
  // three e o renderer de splats só entram nos chunks carregados sob demanda.
  experimental: { optimizePackageImports: ["@react-three/drei", "framer-motion"] },
};

export default config;
