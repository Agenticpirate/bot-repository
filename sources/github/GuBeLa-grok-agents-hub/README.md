# 🤖 Grok Agents Hub

<div align="center">

**Open-source repository for Grok AI Agents, Templates, Commands, and Integrations**

[![GitHub stars](https://img.shields.io/github/stars/GuBeLa/grok-agents-hub?style=social)](https://github.com/GuBeLa/grok-agents-hub)
[![Website](https://img.shields.io/badge/Website-grok--agents--hub.com-blue)](https://grok-agents-hub.com)
[![npm version](https://img.shields.io/npm/v/grok-agents-hub)](https://www.npmjs.com/package/grok-agents-hub)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

*A centralized hub with 50+ ready-made AI agents, templates, commands, and integrations for Grok that simplifies daily work for developers, business users, and everyday users.*

[🚀 Quick Start](#-quick-start) • [📚 Documentation](#-documentation) • [💡 Examples](#-examples) • [🤝 Contributing](#-contributing) • [💰 Pricing](#-pricing)

</div>

---

## 📖 What is this project?

**Grok Agents Hub** is an open-source project that provides 50+ ready-made AI agents, templates, commands, and integrations for Grok (Grok 3/4). This project simplifies your daily work - from code generation to email management.

### 🎯 Main Goals

- ✅ **One-command installation** - Install any agent with a single command
- ✅ **100+ components** - 100+ components (agents, templates, commands, integrations)
- ✅ **Daily task automation** - Automate daily tasks
- ✅ **Open-source and free** - Open-source and free
- ✅ **Community-driven** - Built by and for the community

---

## ✨ Features

### 🤖 AI Agents (50+)
- **Development**: Code reviewer, Debug assistant, Test generator, API documenter, Security auditor
- **Productivity**: Email summarizer, Task manager, Calendar assistant, Daily planner
- **Creative**: Story generator, Content writer, Design helper, Social media writer
- **Data Analysis**: Data analyst, Report generator, Predictive analyst
- **Daily Life**: Health tracker, Finance summarizer, Life hack generator
- **Entertainment**: Meme generator, Joke teller

### ⚡ Slash Commands (8+)
- `/generate-code` - Generate code snippets
- `/analyze-data` - Analyze datasets
- `/schedule-meeting` - Schedule meetings
- `/daily-planner` - Create daily schedule
- `/translate` - Translate text
- `/write-email` - Write professional emails
- `/summarize` - Summarize text
- `/explain-code` - Explain code

### 📝 Templates (7+)
- Code generation templates
- Research report templates
- Life hack templates
- Email templates
- Presentation templates
- Blog post templates
- Meeting agenda templates

### 🔌 Integrations (4+)
- **X API** - Direct Grok API integration
- **Google Workspace** - Gmail, Calendar, Drive
- **Slack** - Team communication
- **Notion** - Note synchronization

---

## 🚀 Quick Start

### 📦 Installation

**Option 1: Using npx (Recommended)**
```bash
npx grok-agents-hub@latest
```

**Option 2: Install globally**
```bash
npm install -g grok-agents-hub
grok-agents-hub
```

**Option 3: Install specific agent**
```bash
npx grok-agents-hub@latest --agent productivity/email-summarizer --yes
```

### ⚙️ Setup

1. **Get your Grok API key**
   - Visit [x.ai/api](https://x.ai/api)
   - Sign up and get your API key

2. **Configure environment**
   ```bash
   # Copy example file
   cp env.example .env
   
   # Edit .env and add your API key
   GROK_API_KEY=your_actual_api_key_here
   ```

3. **Start using!**
   ```bash
   grok-agents-hub
   ```

---

## 📖 Usage Examples

### CLI Commands

```bash
# Interactive mode (default)
grok-agents-hub

# List all components
grok-agents-hub --list

# Search for components
grok-agents-hub --search "productivity"

# Install specific component
grok-agents-hub --install agents/productivity/email-summarizer

# Update all installed components
grok-agents-hub --update

# View usage analytics
grok-agents-hub --analytics

# Health check
grok-agents-hub --health
```

### Using Agents in Code

```javascript
const GrokClient = require('grok-agents-hub/api/grok-client');

// Initialize client
const grok = new GrokClient(process.env.GROK_API_KEY);

// Use an agent
const response = await grok.useAgent(
  'agents/productivity/email-summarizer',
  'Your email content here...'
);

console.log(response.choices[0].message.content);
```

### Python Example

```python
from grok_agents_hub import GrokClient

# Initialize client
grok = GrokClient(api_key=os.getenv('GROK_API_KEY'))

# Use an agent
response = grok.use_agent(
    'agents/productivity/email-summarizer',
    'Your email content here...'
)

print(response['choices'][0]['message']['content'])
```

---

## 📁 Project Structure

```
grok-agents-hub/
├── 📂 templates/              # All components
│   ├── 📂 agents/             # AI agents (25+)
│   │   ├── dev/               # Development agents
│   │   ├── productivity/      # Productivity agents
│   │   ├── creative/          # Creative agents
│   │   ├── data/              # Data analysis agents
│   │   ├── daily-life/        # Daily life agents
│   │   └── fun/               # Entertainment agents
│   ├── 📂 commands/           # Slash commands (8+)
│   ├── 📂 templates/          # Prompt templates (7+)
│   ├── 📂 integrations/       # API integrations (4+)
│   └── 📂 settings/           # Configuration files
├── 📂 cli-tool/               # CLI application
│   ├── index.js               # Main entry point
│   └── commands.js            # Command implementations
├── 📂 api/                    # API client
│   └── grok-client.js         # Grok API wrapper
├── 📂 scripts/                # Utility scripts
│   ├── generate_agents.py    # Agent generator
│   └── validate_components.py # JSON validator
├── 📂 docs/                   # Documentation
├── 📄 README.md               # This file
├── 📄 CONTRIBUTING.md         # Contribution guidelines
├── 📄 LICENSE                 # MIT License
└── 📄 env.example             # Environment template
```

---

## 🎯 Use Cases

### 👨‍💻 For Developers
- Code review and debugging
- Test generation
- API documentation
- Security auditing
- Performance optimization

### 📊 For Business Users
- Email management and summarization
- Meeting scheduling and notes
- Task prioritization
- Report generation
- Data analysis

### ✍️ For Content Creators
- Blog post writing
- Social media content
- Story generation
- Translation
- Design suggestions

### 🏠 For Daily Life
- Health tracking
- Finance management
- Life hacks and tips
- Calendar management
- Entertainment

---

## 🌐 Web Interface

Visit our web interface at **[grok-agents-hub.com](https://grok-agents-hub.com)** to:
- 🔍 Browse all components
- 🔎 Search and filter
- 📊 View statistics
- ⬇️ Install with one click
- 📚 Read documentation

---

## 💰 Pricing

### 🆓 Free Tier
- ✅ All open-source components
- ✅ Basic CLI functionality
- ✅ Community support
- ✅ 100 API calls/day

### ⭐ Premium ($9.99/month)
- ✅ Everything in Free
- ✅ Unlimited API calls
- ✅ Premium agents
- ✅ Priority updates
- ✅ Advanced analytics
- ✅ Email support

### 🏢 Enterprise (Custom)
- ✅ Everything in Premium
- ✅ Custom agent development
- ✅ White-label solution
- ✅ Dedicated support
- ✅ SLA guarantees

[View full pricing details →](MONETIZATION.md)

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Star the repository** ⭐
2. **Fork the project**
3. **Create a feature branch** (`git checkout -b feature/amazing-agent`)
4. **Add your agent/template/command**
5. **Commit your changes** (`git commit -m 'Add amazing agent'`)
6. **Push to the branch** (`git push origin feature/amazing-agent`)
7. **Open a Pull Request**

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### 🎁 What to Contribute
- New AI agents
- Slash commands
- Templates
- Integrations
- Documentation
- Bug fixes
- Feature suggestions

---

## 📚 Documentation

- 📖 [Full Documentation](docs/)

---

## 🔒 Security

- 🔐 API keys are stored locally in `.env` (never committed)
- 🔒 All sensitive data is excluded via `.gitignore`
- 🔒 Components are validated before installation
- 🔒 Regular security audits

**⚠️ Important**: Never commit your `.env` file or API keys!

---

## 📊 Statistics

- 📦 **50+** AI Agents
- ⚡ **8+** Slash Commands
- 📝 **7+** Templates
- 🔌 **4+** Integrations
- 🌟 **100+** Total Components (goal)

---

## 🔗 Links

- 🌐 **Website**: [grok-agents-hub.com](https://grok-agents-hub.com)
- 📦 **NPM Package**: [npmjs.com/package/grok-agents-hub](https://www.npmjs.com/package/grok-agents-hub)
- 💬 **Discord Community**: [Join us](https://discord.gg/grok-agents-hub)
- 🐦 **Twitter**: [@GrokAgentsHub](https://twitter.com/GrokAgentsHub)
- 📧 **Email**: gubelidzeirakli@gmail.com

---

## 🙏 Acknowledgments

Special thanks to:
- The Grok community
- All contributors
- Early adopters and testers

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for the Grok community**

[⭐ Star this repo](https://github.com/GuBeLa/grok-agents-hub) • [🐛 Report Bug](https://github.com/GuBeLa/grok-agents-hub/issues) • [💡 Request Feature](https://github.com/GuBeLa/grok-agents-hub/issues) • [📖 Documentation](docs/)

</div>
