const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const removeImports = require('next-remove-imports')();
const path = require('path');

module.exports = removeImports({
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
  webpack: (config, { isServer }) => {
    if (!config.optimization) {
      config.optimization = {};
    }

    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['json', 'python', 'r', 'sql', 'typescript', 'yaml'],
        }),
      );

      config.module.rules.push(
        ...[
          {
            loader: 'worker-loader',
            options: {
              name: 'static/[hash].worker.js',
              publicPath: '/_next/',
            },
            test: /\.worker\.ts$/,
          },
          {
            include: [
              path.resolve(__dirname, 'node_modules/monaco-editor'),
              path.resolve(__dirname, 'node_modules/react-dom'),
              path.resolve(__dirname, 'node_modules/elkjs'),
            ],
            test: /\.(js|mjs|jsx|ts|tsx)$/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [['next/babel']],
                compact: true,
              },
            },
          },
        ],
      );
    }

    const filesToMinify = [
      '@codingame/monaco-vscode-monarch-service-override/index.js',
      '@codingame/monaco-vscode-python-default-extension/index.js',
      'monaco-editor-wrapper/dist/index.js',
      'monaco-editor-wrapper/dist/workerFactory.js',
      'monaco-editor/esm/vs/editor/editor.main.js',
    ];

    const includeRegex = new RegExp(
      filesToMinify.map(file => file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    );

    config.optimization.minimizer = [
      new TerserPlugin({
        exclude: /node_modules\/next\/dist\/compiled\/terser\/bundle\.min\.js/,
        include: includeRegex,
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ];

    // Optionally add aliases to make sure modules point to the right paths
    const alias = {
      'monaco-editor/esm/vs/editor/editor.main.js': path.resolve(
        __dirname,
        'node_modules/monaco-editor/esm/vs/editor/editor.main.js',
      ),
      'monaco-editor-wrapper/dist/index.js': path.resolve(
        __dirname,
        'node_modules/monaco-editor-wrapper/dist/index.js',
      ),
      'monaco-editor-wrapper/dist/workerFactory.js': path.resolve(
        __dirname,
        'node_modules/monaco-editor-wrapper/dist/workerFactory.js',
      ),
      '@codingame/monaco-vscode-python-default-extension/index.js': path.resolve(
        __dirname,
        'node_modules/@codingame/monaco-vscode-python-default-extension/index.js',
      ),
      '@codingame/monaco-vscode-monarch-service-override/index.js': path.resolve(
        __dirname,
        'node_modules/@codingame/monaco-vscode-monarch-service-override/index.js',
      ),
    };

    // Update Webpack's resolve.alias property
    config.resolve.alias = {
      ...config.resolve.alias,
      ...alias,
    };

    return config;
  },
});
