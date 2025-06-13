const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  mode: 'production',
  devtool: 'source-map',
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: false,
            configFile: 'tsconfig.json'
          }
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
  ],
  
  output: {
    filename: 'remoteEntry.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    library: {
      type: 'module',
    },
  },
  
  experiments: {
    outputModule: true,
  },
  
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
  },
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3001,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  },
};