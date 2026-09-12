# Contributing to Grok Agents Hub

Thank you for your interest in contributing to Grok Agents Hub! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### Reporting Issues

- Use GitHub Issues to report bugs or suggest features
- Provide clear descriptions and steps to reproduce
- Include relevant code snippets or error messages

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**:
   - Follow the code style guidelines
   - Add tests if applicable
   - Update documentation
4. **Commit your changes**: Use clear, descriptive commit messages
5. **Push to your fork**: `git push origin feature/your-feature-name`
6. **Open a Pull Request**: Provide a clear description of your changes

## 📝 Adding New Components

### Agents

Create a JSON file in `templates/agents/{category}/` with the following structure:

```json
{
  "name": "agent-name",
  "version": "1.0.0",
  "category": "productivity",
  "description": "Brief description of what this agent does",
  "author": "Your Name",
  "prompt": "The main prompt for the agent...",
  "examples": [
    {
      "input": "Example input",
      "output": "Example output"
    }
  ],
  "config": {
    "temperature": 0.7,
    "max_tokens": 2000
  },
  "tags": ["productivity", "email", "automation"]
}
```

### Commands

Create a JSON file in `templates/commands/`:

```json
{
  "name": "command-name",
  "version": "1.0.0",
  "description": "Command description",
  "command": "/command-name",
  "prompt": "Command prompt...",
  "examples": [],
  "tags": []
}
```

### Templates

Create a JSON file in `templates/templates/`:

```json
{
  "name": "template-name",
  "version": "1.0.0",
  "description": "Template description",
  "template": "Template content with {{variables}}",
  "variables": ["variable1", "variable2"],
  "examples": [],
  "tags": []
}
```

### Integrations

Create a JSON file in `templates/integrations/`:

```json
{
  "name": "integration-name",
  "version": "1.0.0",
  "description": "Integration description",
  "type": "api",
  "endpoint": "https://api.example.com",
  "auth": {
    "type": "api_key",
    "header": "Authorization"
  },
  "config": {},
  "tags": []
}
```

## ✅ Code Style

- Use 2 spaces for indentation
- Follow JavaScript/TypeScript best practices
- Add JSDoc comments for functions
- Keep functions small and focused

## 🧪 Testing

- Write tests for new features
- Ensure all tests pass: `npm test`
- Test your components with real Grok API calls (use test API keys)

## 📚 Documentation

- Update README.md if adding major features
- Add examples to component JSON files
- Update relevant documentation in `docs/`

## 🎯 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## 🚀 Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a git tag
4. Submit PR for review

Thank you for contributing! 🎉

