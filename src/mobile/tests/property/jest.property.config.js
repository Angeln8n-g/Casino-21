/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        moduleResolution: 'node',
        module: 'commonjs',
        target: 'es2020',
        lib: ['es2020'],
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        types: ['node', 'jest'],
      },
    }],
  },
  testMatch: ['<rootDir>/*.test.ts'],
  rootDir: __dirname,
};
