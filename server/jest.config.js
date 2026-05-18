/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.test.json",
    }],
  },
  testMatch: ["**/tests/**/*.test.ts"],
};
