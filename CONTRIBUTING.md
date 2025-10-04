# Contributing to Prometheus Alert Rule Generator

Thank you for your interest in contributing! We welcome contributions from the community.

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and professional in all interactions.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (browser, OS, Node version)
- **Configuration file** if relevant (sanitize sensitive data)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why is this enhancement needed?
- **Proposed solution** or implementation ideas
- **Alternatives considered**
- **Additional context** like screenshots or mockups

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our coding standards
4. **Test your changes**:
   - Run the dev server: `npm run dev`
   - Test all functionality manually
   - Run linting: `npm run lint`
   - Ensure build succeeds: `npm run build`
5. **Commit your changes** with clear, descriptive messages
6. **Push to your fork** and submit a pull request

#### Pull Request Guidelines

- **One feature per PR** - Keep changes focused and atomic
- **Update documentation** - README, comments, etc.
- **Follow existing code style** - Use ESLint configuration
- **Write clear commit messages** - Use present tense ("Add feature" not "Added feature")
- **Reference issues** - Link to related issues in PR description
- **Be responsive** - Address review feedback promptly

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/prometheus-alert-generator.git
cd prometheus-alert-generator

# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, run linting
npm run lint
```

### Project Structure

```
prometheus-alert-generator/
├── src/
│   ├── main.tsx              # Application entry point
│   ├── prometheus-rule-generator.tsx  # Main component
│   └── index.css             # Global styles
├── public/                   # Static assets
├── index.html               # HTML template
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── eslint.config.js         # ESLint configuration
```

## Coding Standards

### TypeScript

- Use **TypeScript** for all new code
- Provide **type annotations** for function parameters and return values
- Avoid `any` types when possible
- Use interfaces for object shapes

### React

- Use **functional components** with hooks
- Keep components **focused and single-purpose**
- Use **Mantine UI components** for consistency
- Follow React best practices and hooks rules

### Code Style

- Follow the **ESLint configuration** provided
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep functions **small and focused**
- Use **const** over let when possible

### Commits

Follow conventional commit messages:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(slo): add support for multiple SLOs

Add UI and logic to support configuring multiple SLO definitions
per application with independent targets and metrics.

Closes #123
```

```
fix(validation): correct PromQL metric pattern regex

The validation was incorrectly rejecting valid metric names
containing colons. Updated regex to allow colons in metric names.
```

## Testing

While we don't currently have automated tests, please manually test:

1. **Form validation** - Try invalid inputs for all fields
2. **Configuration upload/download** - Verify round-trip works
3. **Rule generation** - Check generated YAML is valid
4. **UI responsiveness** - Test on different screen sizes
5. **Browser compatibility** - Test on Chrome, Firefox, Safari

## Feature Requests

We track feature requests in GitHub Issues with the `enhancement` label. Popular requests may be added to the roadmap. When implementing features:

- Discuss significant changes in an issue first
- Consider backward compatibility
- Update configuration file version if schema changes
- Document new features in README

## Questions?

If you have questions about contributing:

- Open a [GitHub Discussion](https://github.com/CardinalityCloud/prometheus-alert-generator/discussions)
- Email: jjneely@cardinality.cloud

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Project acknowledgments

Thank you for contributing to making Prometheus monitoring more accessible! 🎉
