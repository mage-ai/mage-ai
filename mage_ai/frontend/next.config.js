// Any changes in this file should be replicated in next_base_path.config.js

const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  output: 'export',
  distDir: 'frontend_dist',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: true,
    instrumentationHook: true,
  },
  reactStrictMode: true,
});
