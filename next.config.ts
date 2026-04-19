import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/proposals/preview": ["node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/proposals/finalize": ["node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
