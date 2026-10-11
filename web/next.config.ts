import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // The first testnet prototype (/dashboard and its /login) was folded into the workspace at /app.
  async redirects() {
    return [
      { source: "/dashboard/:path*", destination: "/app", permanent: false },
      { source: "/login", destination: "/app/login", permanent: false },
    ];
  },
  turbopack: {
    // this folder is the app root, even if a stray lockfile sits in the repo root
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
