import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" developer badge in the corner of the app
  devIndicators: false,
  // Build folder (".next" by default); lets a production build run next to the dev server
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
