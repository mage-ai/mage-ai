import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@api/(.*)$': '<rootDir>/api/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@context/(.*)$': '<rootDir>/context/$1',
    '^@hocs/(.*)$': '<rootDir>/hocs/$1',
    '^@interfaces/(.*)$': '<rootDir>/interfaces/$1',
    '^@mana/(.*)$': '<rootDir>/mana/$1',
    '^@oracle/(.*)$': '<rootDir>/oracle/$1',
    '^@public/(.*)$': '<rootDir>/public/$1',
    '^@storage/(.*)$': '<rootDir>/storage/$1',
    '^@styles/(.*)$': '<rootDir>/styles/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
};

export default config;
