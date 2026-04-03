const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  projects: [
    {
      displayName: "root",
      testEnvironment: "node",
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
      testPathIgnorePatterns: ["<rootDir>/src/mobile/"],
    },
    {
      displayName: "mobile",
      testEnvironment: "node",
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            tsconfig: {
              jsx: "react",
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              strict: true,
              moduleResolution: "node",
              module: "commonjs",
              target: "es2020",
              lib: ["es2020"],
              resolveJsonModule: true,
              skipLibCheck: true,
              types: ["node", "jest"],
              baseUrl: ".",
              paths: {
                "@domain/*": ["src/domain/*"],
                "@application/*": ["src/application/*"],
                "@mobile/*": ["src/mobile/*"],
                "@react-native-async-storage/async-storage": [
                  "src/mobile/__mocks__/@react-native-async-storage/async-storage.ts",
                ],
              },
            },
          },
        ],
      },
      testMatch: ["<rootDir>/src/mobile/**/*.test.ts", "<rootDir>/src/mobile/**/*.test.tsx"],
      moduleNameMapper: {
        "^@domain/(.*)$": "<rootDir>/src/domain/$1",
        "^@application/(.*)$": "<rootDir>/src/application/$1",
        "^@mobile/(.*)$": "<rootDir>/src/mobile/$1",
        "^@react-native-async-storage/async-storage$":
          "<rootDir>/src/mobile/__mocks__/@react-native-async-storage/async-storage.ts",
        "^react-native$": "<rootDir>/src/mobile/__mocks__/react-native.ts",
      },
    },
  ],
};