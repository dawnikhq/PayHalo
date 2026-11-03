import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite is an experimental Node builtin used for the prototype datastore.
  serverExternalPackages: [],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
