const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  async rewrites() {
    // Certain cloud notebooks require a base path that affects the app routing.
    // As a result, we need to replace the source placeholder base paths below
    // with the actual base paths when the mage_ai app is launched.
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
