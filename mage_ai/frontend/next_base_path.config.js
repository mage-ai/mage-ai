const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  basePath: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_',
  assetPrefix: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: true
  },
  reactStrictMode: true,
});
