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
      config.optimization.minimizer = [
        new TerserPlugin({
          exclude: /node_modules\/next\/dist\/compiled\/terser\/bundle\.min\.js/,
        }),
      ];

      config.module.rules.push({
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
        test: /\.worker\.ts$/,
      });
    }

    config.plugins.push(
      new MonacoWebpackPlugin({
        // https://github.com/nicoabie/monaco-editor-webpack-plugin/blob
        // /97fa344ed9dfb3cb529cd44348cccc2a6e0fb7a4/README.md#options
        features: ['!accessibilityHelp'],
        languages: ['json', 'python', 'r', 'sql', 'typescript', 'yaml'],
      }),
    );

    if (options?.dev) {
      if (parseInt(process.env.ONLY_V || 0) === 2) {
        console.log('Ignoring pages and components not in V2...')
        config.plugins.push(...[
          new options.webpack.IgnorePlugin({
            resourceRegExp: /^\.\/pages\/(?!v2)/,
          }),
          new options.webpack.IgnorePlugin({
            resourceRegExp: /^\.\/components\/(?!v2)/,
          }),
        ]);
      }
    }

    return config;
  },
});
