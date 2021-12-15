const { resolve } = require('path');
const nodeExternals = require('webpack-node-externals');

const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    target: 'node',
    entry: {
        main: './src/index.ts',
    },
    output: {
        path: resolve(__dirname, 'dist'),
        filename: 'src/index.js',
        libraryTarget: 'commonjs',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: '@types/**/*.d.ts' },
                { from: 'package.json' },
                { from: 'README.md' },
                { from: 'LICENSE' },
            ],
        }),
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        plugins: [
            new TsConfigPathsPlugin({
                configFile: resolve(__dirname, './tsconfig.prod.json'),
                baseUrl: resolve(__dirname, '.'),
            }),
        ],
    },
    module: {
        rules: [
            {
                loader: 'ts-loader',
            },
        ],
    },
    externals: [nodeExternals()],
    optimization: {
        minimize: false,
    },
};
