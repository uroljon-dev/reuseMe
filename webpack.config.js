const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main: './script.js',
    modal: './modal-component.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, './'),
    },
    hot: true,
    open: true,
    port: 8080,
    watchFiles: ['*.html', '*.css', '*.json'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.WORKER_API_KEY': JSON.stringify(process.env.WORKER_API_KEY || ''),
    }),
    new CopyPlugin({
      patterns: [
        { from: 'index.html', to: 'index.html' },
        { from: 'style.css', to: 'style.css' },
        { from: 'geojson.json', to: 'geojson.json' },
        { from: 'favicon.ico', to: 'favicon.ico' },
      ],
    }),
  ],
  mode: 'production',
};