import * as path from "path";
import * as webpack from "webpack";

const config: webpack.Configuration = {
  mode: "development",
  devtool: "cheap-module-source-map",
  output: {
    path: path.resolve(__dirname, "bin"),
    filename: "main.js",
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};

export default config;
