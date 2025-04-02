# Contributing to zusound

Thank you for your interest in contributing to zusound! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please help keep this project open and inclusive by respecting all contributors, regardless of background or experience level.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- A detailed description of the bug
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots if applicable
- Environment information (browser, OS, etc.)

### Suggesting Features

Feature suggestions are welcome! Please create an issue with:

- A clear, descriptive title
- Detailed description of the proposed feature
- Any relevant examples or mockups
- Explanation of why this feature would be valuable

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add or update tests as necessary
5. Run tests to ensure everything passes
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Pull Request Guidelines

- Follow the existing code style
- Include tests for new features
- Update documentation as needed
- Keep PRs focused - one feature or bug fix per PR when possible
- Link any relevant issues in the PR description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/behoney/zusound.git
cd zusound

# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build
```

## Project Structure

zusound is organized as a monorepo with the following structure:

```
zusound/
├── packages/              # Monorepo packages
│   ├── core/              # Core middleware functionality
│   ├── diff/              # State diffing implementation
│   ├── sonification/      # Sound generation logic
│   ├── middleware/        # Middleware implementation
├── examples/              # Example applications
├── .devcontainer/         # Development container configuration
└── README.md              # Project documentation
```

## Testing

zusound uses [Vitest](https://vitest.dev/) for unit testing. To run the tests:

```bash
# Run all tests
bun run test

# Run tests in watch mode during development
bun run test:watch

# Run tests with coverage report
bun run test:coverage
```

### Writing Tests

When contributing to zusound, please include tests for your changes:

1. **Unit Tests**: Place test files in the `__tests__` directory next to the module being tested
2. **Naming Convention**: Use `.test.ts` suffix for test files
3. **Mock Web Audio API**: Since we use the Web Audio API, mock it appropriately in tests

Example test structure:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { yourFunction } from '../your-module'

describe('your-module', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = yourFunction(input)

    // Assert
    expect(result).toBe(expectedValue)
  })
})
```

For components that use the Web Audio API, use Vitest's mocking capabilities:

```typescript
// Mock AudioContext
vi.mock(
  'global',
  () => ({
    AudioContext: vi.fn(() => ({
      // Your mocked methods and properties
      close: vi.fn().mockResolvedValue(undefined),
    })),
  }),
  { virtual: true }
)
```

## Coding Standards

- Use TypeScript for type safety
- Follow existing formatting patterns
- Comment your code where necessary
- Use descriptive variable and function names

## Development Container

zusound provides a dev container configuration in the `.devcontainer` directory for consistent development environments. To use it:

1. Install [VS Code](https://code.visualstudio.com) and the [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension
2. Open the project in VS Code
3. When prompted, click "Reopen in Container" or use the command palette (`F1`) and select "Remote-Containers: Reopen in Container"

## License

By contributing to zusound, you agree that your contributions will be licensed under the project's MIT License.
