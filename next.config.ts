import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing large JSON data files at build time
  // (players.json and bracket-slots.json are bundled statically)

  // Disable image optimization warnings for the bracket SVG served as <img>
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
