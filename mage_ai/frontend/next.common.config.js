const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
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
      config.optimization.minimizer = [
        new TerserPlugin({
          exclude: /node_modules\/next\/dist\/compiled\/terser\/bundle\.min\.js/,
        }),
      ];

      // This is responsible for the Monaco editor web worker.
      config.module.rules.push({
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
        test: /\.worker\.ts$/,
      });

      // If you move this out of !isServer, you’ll get:
      // Conflict: Multiple assets emit different content to the same filename ../main.js.nft.json
      config.plugins.push(
        new MonacoWebpackPlugin({
          // https://github.com/nicoabie/monaco-editor-webpack-plugin/blob
          // /97fa344ed9dfb3cb529cd44348cccc2a6e0fb7a4/README.md#options
          // features: ['!accessibilityHelp'],
          languages: ['json', 'python', 'r', 'sql', 'typescript', 'yaml'],
        }),
      );
    }

    if (options?.dev) {
      if (parseInt(process.env.ONLY_V || 0) === 2) {
        console.log('Ignoring pages and components not in V2...');
        config.plugins.push(
          ...[
            new options.webpack.IgnorePlugin({
              // Ignore any file in `frontend/pages` directory not in `v2` subdirectory
              resourceRegExp: /^\.\/frontend\/pages\/(?!v2\/)/,
              // Apply this only for specific context, ensuring context is frontend
              contextRegExp: /frontend\/pages/,
            }),
            new options.webpack.IgnorePlugin({
              // Ignore any file in `frontend/components` directory not in v2 subdirectory or not `accessibleDiffViewer.js`
              resourceRegExp: /^\.\/frontend\/components\/(?!v2\/|accessibleDiffViewer\.js)/,
              // Apply this only for specific context, ensuring context is frontend
              contextRegExp: /frontend\/components/,
            }),
          ],
        );
      }
    }

    // Ignore files named mock.ts or mocks.ts
    config.plugins.push(
      new options.webpack.IgnorePlugin({
        resourceRegExp: /mock(s)?\.ts$/,
      })
    );

    return config;
  },
});
