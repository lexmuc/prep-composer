/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["<rootDir>/src"],
  moduleDirectories: ["node_modules", "src"],
};