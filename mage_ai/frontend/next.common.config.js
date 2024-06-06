const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const removeImports = require('next-remove-imports')();

module.exports = removeImports({
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: true,
  },
  images: {
    unoptimized: true,
  },
  // If your application is running in development mode and wrapped with `<React.StrictMode>`,
  // React deliberately double-invokes lifecycle methods
  // (including `useState`, `useEffect`, and others) to help identify side effects.
  // This does not happen in production builds.
  reactStrictMode: String(process.env.NEXT_PUBLIC_REACT_STRICT_MODE) !== '0',
  webpack: (config, options) => {
    if (!options?.isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['json', 'python', 'r', 'sql', 'typescript', 'yaml'],
        }),
      );

      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            excludes: /node_modules\/next\/dist\/compiled\/terser\/bundle\.min\.js/,
          },
        }),
      ];
    }

    return config;
  },
});
