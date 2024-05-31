const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  basePath: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_',
  assetPrefix: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG || 0,
  },
});
