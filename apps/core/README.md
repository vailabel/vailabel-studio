# @vailabel/core

Vailabel Studio Core package.

## Installation

```sh
npm install @vailabel/core
```

## Usage

```js
import {} from /* your exported modules */ "@vailabel/core"
```

## Build

```sh
npm run build
```

## Testing

### Using jest.config.ts

This package uses `jest.config.ts` for test configuration. The configuration file allows you to:

- Set up test environment (jsdom, node, etc.)
- Configure test file patterns
- Set up module path mapping
- Configure coverage settings

Example `jest.config.ts` structure:

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

export default config;
```

### Running index.test.ts

To run the main test file (`index.test.ts`):

```sh
# Run all tests (including index.test.ts)
npm test

# Run only index.test.ts
npm test index.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Adding New Tests for Core Modules

1. **Create Test Files**
   
   Create test files alongside your modules or in a `__tests__` directory:
   
   ```
   src/
   ├── utils/
   │   ├── helper.ts
   │   └── helper.test.ts
   ├── components/
   │   ├── Button.ts
   │   └── Button.test.ts
   └── __tests__/
       └── integration.test.ts
   ```

2. **Write Test Cases**
   
   Example test structure:
   
   ```ts
   import { myFunction } from '../utils/helper';
   
   describe('Helper Utils', () => {
     test('should return correct value', () => {
       const result = myFunction('input');
       expect(result).toBe('expected output');
     });
     
     test('should handle edge cases', () => {
       expect(myFunction('')).toBe('');
       expect(myFunction(null)).toBeNull();
     });
   });
   ```

3. **Test Naming Conventions**
   
   - Use descriptive test names
   - Group related tests with `describe` blocks
   - Use `test` or `it` for individual test cases
   
   ```ts
   describe('Core Module - Authentication', () => {
     describe('login function', () => {
       test('should authenticate valid credentials', () => {
         // test implementation
       });
       
       test('should reject invalid credentials', () => {
         // test implementation
       });
     });
   });
   ```

4. **Running Specific Tests**
   
   ```sh
   # Run tests for specific file
   npm test helper.test.ts
   
   # Run tests matching pattern
   npm test -- --testNamePattern="authentication"
   
   # Run tests in specific directory
   npm test src/utils
   ```

### Testing Best Practices

- **Write tests for all public functions**
- **Test edge cases and error conditions**
- **Use descriptive test names**
- **Keep tests focused and isolated**
- **Mock external dependencies**
- **Maintain good test coverage**

```sh
# Check test coverage
npm test -- --coverage

# Generate coverage report
npm test -- --coverage --coverageReporters=html
```

## License

MIT
