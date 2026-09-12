# Frequently Asked Questions (FAQ)

## General Questions

### What is Grok Agents Hub?

Grok Agents Hub is an open-source repository containing 50+ ready-made AI agents, templates, commands, and integrations for Grok (Grok 3/4). It simplifies daily work by providing pre-built AI solutions.

### Who is this for?

- **Developers**: Code review, debugging, testing
- **Business Users**: Email management, task organization
- **Content Creators**: Writing, social media, design
- **Everyone**: Daily productivity and automation

### Is it free?

Yes! The core project is completely free and open-source (MIT License). We also offer premium tiers with additional features.

### Do I need a Grok API key?

Yes, you need a Grok API key from [x.ai/api](https://x.ai/api) to use the agents. The key is free to obtain.

## Installation

### How do I install?

```bash
npx grok-agents-hub@latest
```

Or install globally:
```bash
npm install -g grok-agents-hub
```

### What are the system requirements?

- Node.js 18 or higher
- npm or yarn
- Grok API key

### Where are agents installed?

Agents are installed to `~/.grok-agents/` directory by default.

## Usage

### How do I use an agent?

1. Install the agent: `grok-agents-hub --install agents/productivity/email-summarizer`
2. Use it in your code with the GrokClient API
3. See examples in the documentation

### Can I use agents without coding?

Currently, agents require some coding knowledge. We're working on a no-code interface.

### How do I update agents?

```bash
grok-agents-hub --update
```

## API Keys & Security

### Is my API key safe?

Yes! API keys are stored locally in `.env` file, which is never committed to Git. We follow security best practices.

### Can I use the same key for multiple projects?

Yes, but be aware of rate limits. Each API key has usage limits.

### What if my key is compromised?

1. Revoke the key immediately at x.ai/api
2. Generate a new key
3. Update your `.env` file

## Components

### How many components are there?

Currently 50+ components:
- 25+ AI Agents
- 8+ Slash Commands
- 7+ Templates
- 4+ Integrations

### Can I create my own agents?

Yes! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### How do I submit a new agent?

1. Fork the repository
2. Create your agent following the format
3. Submit a Pull Request
4. We'll review and merge if approved

## Pricing

### What's the difference between Free and Premium?

**Free:**
- All open-source components
- 100 API calls/day
- Community support

**Premium ($9.99/month):**
- Unlimited API calls
- Premium agents
- Priority support
- Advanced analytics

### Can I cancel anytime?

Yes, you can cancel your subscription anytime. No long-term commitments.

## Technical

### What programming languages are supported?

Currently JavaScript/Node.js. Python support coming soon.

### Can I use this in production?

Yes! The project is production-ready. However, always test thoroughly.

### Are there rate limits?

Yes, Grok API has rate limits. Free tier: 100 calls/day. Premium: Unlimited.

### How do I report bugs?

Open an issue on GitHub: [github.com/GuBeLa/grok-agents-hub/issues](https://github.com/GuBeLa/grok-agents-hub/issues)

## Contributing

### How can I contribute?

- Add new agents/templates
- Improve documentation
- Report bugs
- Suggest features
- Share with others

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

### Do I get paid for contributions?

Currently, contributions are voluntary. We're working on a marketplace model where contributors can earn from their agents.

## Support

### Where can I get help?

- 📖 Documentation: [docs/](docs/)
- 💬 Discord: [Join our community](https://discord.gg/grok-agents-hub)
- 🐛 GitHub Issues: [Report issues](https://github.com/GuBeLa/grok-agents-hub/issues)
- 📧 Email: support@grok-agents-hub.com

### How quickly do you respond?

- GitHub Issues: Usually within 24-48 hours
- Email: Within 48 hours
- Discord: Community members help each other

---

**Still have questions?** Open an issue or join our Discord!

