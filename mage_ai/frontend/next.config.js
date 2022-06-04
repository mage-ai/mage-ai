const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: true
  },
  reactStrictMode: true,
});
