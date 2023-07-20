const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  async rewrites() {
    // Certain cloud notebooks require a base path that affects the app routing.
    // As a result, we need to replace the source placeholder base paths below
    // with the actual base paths when the mage_ai app is launched.
    return [
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/overview',
        destination: '/overview',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/pipelines/:slug*',
        destination: '/pipelines/:slug*',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/pipelines',
        destination: '/pipelines',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/pipeline-runs',
        destination: '/pipeline-runs',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/settings',
        destination: '/settings',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/settings/:slug*',
        destination: '/settings/:slug*',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/sign-in',
        destination: '/sign-in',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/terminal',
        destination: '/terminal',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/triggers',
        destination: '/triggers',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/manage',
        destination: '/manage',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/manage/:slug*',
        destination: '/manage/:slug*',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_/version-control',
        destination: '/version-control',
      },
      {
        source: '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_',
        destination: '/',
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
