import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to enable Turbopack without webpack config conflicts
  turbopack: {},
  webpack: (config: any, { webpack }: any) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Exclude test files from thread-stream and pino
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\/test\//,
        contextRegExp: /thread-stream|pino/,
      })
    );
    
    return config;
  },
};

export default nextConfig;
