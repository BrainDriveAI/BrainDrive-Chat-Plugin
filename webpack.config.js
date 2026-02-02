const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const packageJson = require("./package.json");
const deps = packageJson.dependencies;

// BrainDrive Chat plugin federation settings
const PLUGIN_SCOPE = "BrainDriveChat";
const MODULE_NAME = "BrainDriveChat";
const DEV_PORT = 3001;
const VERSION = packageJson.version;

// Output paths
const RELEASE_PATH = "dist"; // packaged plugin
//const LOCAL_PATH = `../../backend/plugins/shared/${PLUGIN_SCOPE}/v1.0.25/dist`;
const LOCAL_PATH = `../../backend/plugins/shared/${PLUGIN_SCOPE}/v${VERSION}/dist`;

module.exports = (env = {}) => {
  const isRelease = env.release === true || env.release === "true";

  console.log(
    `[BrainDrive Plugin] Building ${
      isRelease ? "RELEASE" : "LOCAL"
    } bundle`
  );

  return {
    mode: isRelease ? "production" : "development",

    entry: "./src/index",

    output: {
      path: path.resolve(
        __dirname,
        isRelease ? RELEASE_PATH : LOCAL_PATH
      ),
      publicPath: "auto",
      clean: true,
      library: {
        type: "var",
        name: PLUGIN_SCOPE
      }
    },

    resolve: {
      extensions: [".tsx", ".ts", ".js"]
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: "ts-loader",
          exclude: [/node_modules/, /__tests__/]
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
        }
      ]
    },

    plugins: [
      new ModuleFederationPlugin({
        name: PLUGIN_SCOPE,
        library: { type: "var", name: PLUGIN_SCOPE },
        filename: "remoteEntry.js",
        exposes: {
          [`./${MODULE_NAME}`]: "./src/index"
        },
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: deps.react
          },
          "react-dom": {
            singleton: true,
            eager: true,
            requiredVersion: deps["react-dom"]
          }
        }
      }),

      new HtmlWebpackPlugin({
        template: "./public/index.html"
      })
    ],

    devServer: {
      port: DEV_PORT,
      static: {
        directory: path.join(__dirname, "public")
      },
      hot: true
    }
  };
};
