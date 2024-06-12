const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const removeImports = require('next-remove-imports')();
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(removeImports({
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: true,
    forceSwcTransforms: true,
  },
  images: {
    unoptimized: true,
  },
  // If your application is running in development mode and wrapped with `<React.StrictMode>`,
  // React deliberately double-invokes lifecycle methods
  // (including `useState`, `useEffect`, and others) to help identify side effects.
  // This does not happen in production builds.
  reactStrictMode: String(process.env.NEXT_PUBLIC_REACT_STRICT_MODE) !== '0',
  webpack: (config, { dev, isServer, webpack }) => {
    if (dev) {
      // Apply IgnorePlugin with specific patterns
      const ignorePatterns = [];

      if (parseInt(process.env.IGNORE_NODE_MODULES || 0) === 2) {
        console.log('Ignoring node modules...')
        ignorePatterns.push(...[
          /elkjs\/lib\/elk\.bundled\.js/,
          /react-dom\/.*\/.*/,
          /react-dom\/cjs\/react-dom\.development\.js/,
        ]);
      }

      if (parseInt(process.env.IGNORE_V1 || 0) === 2) {
        console.log('Ignoring pages and components not in V2...')
        ignorePatterns.push(...[
          // Pages not in v2
          /^\.\/pages\/(?!v2)/,
          // Components not in v2
          /^\.\/components\/(?!v2)/,
        ]);
      }

      if (ignorePatterns?.length >= 1) {
        ignorePatterns.forEach((pattern) => {
          config.plugins.push(
            new webpack.IgnorePlugin({
              resourceRegExp: pattern,
            })
          );
        });
      }
    }

    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['json', 'python', 'r', 'sql', 'typescript', 'yaml'],
        }),
      );

      config.optimization = {
        ...config.optimization,
        minimize: true,
        minimizer: [new TerserPlugin({
          exclude: /node_modules/,
          exclude: /node_modules\/next\/dist\/compiled\/terser\/bundle\.min\.js/,
        })],
      };

      // Configure Worker Loader
      config.module.rules.push({
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            filename: 'static/[fullhash].worker.js',
            publicPath: '/_next/',
          }
        },
      });
    }

    return config;
  },
}));
