const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const removeImports = require('next-remove-imports')();
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

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
  webpack: (config, options) => {
    config.plugins.push(
      new CleanWebpackPlugin(), // This plugin removes/cleans build folders before building
      new MonacoWebpackPlugin({
        languages: ['sql', 'python', 'typescript'], // specify the languages you need
      }),
    );
    return config;
  },
});
