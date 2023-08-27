/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch:["**/**/*.test.ts"],
  verbose:true,
  forceExit:true,
  // clearMocks: true, 
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/test-setup.ts"],
  setupFiles: ['./jestSetup.ts']

};