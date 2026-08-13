import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Uploads live on the local disk on a normal server, and in blob storage
       on a host with no disk. next/image has to be told the blob host is
       allowed, or it refuses to optimise those URLs. */
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
