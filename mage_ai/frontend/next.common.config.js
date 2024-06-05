// mage-ai/mage_ai/frontend/next.common.config.js
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const removeImports = require('next-remove-imports')();
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const commonConfig = {
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
        new CleanWebpackPlugin(), // This plugin removes/cleans build folders before building
        new MonacoWebpackPlugin({
          languages: ['sql', 'python', 'typescript'], // specify the languages you need
        }),
      );
    }

    return config;
  },
};

module.exports = removeImports(commonConfig);
