module.exports = [
  {
    mode: "development",
    entry: "./src/main.ts",
    target: "electron-main",
    watch: true, // Enable watch mode
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: "ts-loader" }],
        },
      ],
    },
    output: {
      path: __dirname + "/dist",
      filename: "main.js",
    },
  },
]