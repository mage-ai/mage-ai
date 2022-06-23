const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  async rewrites() {
    return [
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/datasets',
        destination: '/datasets',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_',
        destination: '/datasets',
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: true
  },
  reactStrictMode: true,
});
