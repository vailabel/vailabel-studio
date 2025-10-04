# Contributing to Vision AI Label Studio

Thank you for considering contributing to Vision AI Label Studio! We welcome contributions from the community to help improve and expand this project. Please follow the guidelines below to ensure a smooth contribution process.

## 📋 Table of Contents

- [Project-Specific Contributing Guides](#-project-specific-contributing-guides)
- [General Contributing Guidelines](#️-general-contributing-guidelines)
- [Code of Conduct](#-code-of-conduct)
- [Community](#-community)
- [License](#-license)

## � Project-Specific Contributing Guides

Each module in our monorepo has its own specialized contributing guide tailored to the specific technologies and workflows:

| Module | Technology | Contributing Guide | Description |
|--------|------------|-------------------|-------------|
| **API** | FastAPI + Python | [apps/api/CONTRIBUTING.md](apps/api/CONTRIBUTING.md) | Backend API development, testing with pytest, endpoint creation |
| **Core** | TypeScript + Jest | [apps/core/README.md#testing](apps/core/README.md#testing) | Core package testing, Jest configuration, module development |
| **Studio** | React + Vite | *Coming Soon* | Web studio application development and testing |
| **Desktop** | Electron + TypeScript | *Coming Soon* | Desktop application development and packaging |
| **Web** | Next.js + TypeScript | *Coming Soon* | Marketing website and documentation |

### 🎯 Quick Navigation

**For API Development:**
- Environment setup with Python virtual environments
- Database migrations with Alembic
- Testing with pytest and coverage
- Endpoint development patterns

**For Frontend Development:**
- TypeScript configuration and Jest testing
- Component development and testing
- Build processes and deployment

**For Documentation:**
- README improvements across all modules
- API documentation updates
- User guide enhancements

---

## 🛠️ How to Contibute

### 1. Fork the Repository

- Navigate to the [Vision AI Label Studio GitHub repository](https://github.com/vailabel/vailabel-studio).
- Click the "Fork" button to create your own copy of the repository.

### 2. Clone Your Fork

```bash
# Clone your forked repository
git clone https://github.com/vailabel/vailabel-studio.git

# Navigate to the project directory
cd vailabel-studio

# Install dependencies
yarn install
```

### 3. Create a Branch

Create a new branch for your feature or bug fix:

```bash
git checkout -b feature/your-feature-name
```

### 4. Make Changes

- Follow the existing code style and structure.
- Ensure your changes are well-documented and tested.

### 5. Commit Your Changes

```bash
git add .
git commit -m "Add a brief description of your changes"
```

### 6. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 7. Open a Pull Request

- Go to the original repository on GitHub.
- Click the "Pull Requests" tab and then "New Pull Request."
- Select your branch and submit your pull request.

---

## 📝 Code Standards & Guidelines

### Branch Naming Convention

Use descriptive branch names following this pattern:

```bash
# Feature branches
feature/add-user-authentication
feature/implement-ai-labeling

# Bug fixes
fix/resolve-login-issue
fix/correct-annotation-display

# Documentation
docs/update-api-guide
docs/add-setup-instructions

# Refactoring
refactor/optimize-performance
refactor/restructure-components
```

### Commit Message Format

Follow conventional commit format across all modules:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(api): add OAuth2 authentication endpoints"
git commit -m "fix(studio): resolve annotation rendering issue"
git commit -m "docs(core): add comprehensive testing guide"
git commit -m "test(desktop): add electron app integration tests"
```

## 🧪 Code of Conduct

Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for all contributors.

### Commit Messages

- Use clear and concise commit messages.
- Follow the format: `type(scope): description` (e.g., `feat(ui): add dark mode toggle`).

### Testing Requirements

- **API**: Use pytest with coverage requirements (see [API Contributing Guide](apps/api/CONTRIBUTING.md))
- **Frontend**: Use Jest with appropriate test environments (see module-specific guides)
- **Integration**: Ensure cross-module functionality works correctly
- **Documentation**: Update relevant documentation and README files

### Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows the established patterns and conventions
- [ ] All tests pass (run `yarn test` or module-specific test commands)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventional format
- [ ] PR description clearly explains the changes
- [ ] Related issues are referenced

---

## 🏗️ Development Setup

### Quick Start

```bash
# Clone the repository
git clone https://github.com/vailabel/vailabel-studio.git
cd vailabel-studio

# Install dependencies for all modules
yarn install

# Start development servers
yarn dev
```

### Module-Specific Setup

Refer to the individual contributing guides for detailed setup instructions:

- **API Setup**: [apps/api/CONTRIBUTING.md](apps/api/CONTRIBUTING.md) - Python virtual environment, database migrations
- **Frontend Setup**: Check individual module README files for specific requirements

---

## 🤝 Community

### Join the Discussion

- Open an issue to discuss your ideas or report bugs.
- Engage with other contributors in the [Discussions](https://github.com/vailabel/vailabel-studio/discussions) section.

### Acknowledgements

We appreciate all contributions, big or small. Thank you for helping make Vision AI Label Studio better!

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [GNU GENERAL PUBLIC LICENSE](LICENSE).
