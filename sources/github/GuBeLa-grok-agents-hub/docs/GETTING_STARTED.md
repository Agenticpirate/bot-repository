# Getting Started with Grok Agents Hub

## Welcome! 👋

This guide will help you get started with Grok Agents Hub in just a few minutes.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **Grok API Key** from [x.ai/api](https://x.ai/api)
- **Git** (optional, for contributing)

## Step 1: Installation

### Quick Install (Recommended)

```bash
npx grok-agents-hub@latest
```

This will:
- Download and run the CLI tool
- Guide you through the setup process
- Install components to `~/.grok-agents/`

### Global Install

```bash
npm install -g grok-agents-hub
grok-agents-hub
```

## Step 2: Get Your API Key

1. Visit [x.ai/api](https://x.ai/api)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll need it in the next step)

⚠️ **Important**: Keep your API key secret! Never share it publicly.

## Step 3: Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your editor

3. Add your API key:
   ```env
   GROK_API_KEY=your_actual_api_key_here
   ```

4. Save the file

## Step 4: First Run

Run the CLI tool:

```bash
grok-agents-hub
```

You should see an interactive menu. Try:
- **List all components** - See what's available
- **Search** - Find specific agents
- **Install** - Install your first agent

## Step 5: Install Your First Agent

Let's install the email summarizer:

```bash
grok-agents-hub --install agents/productivity/email-summarizer
```

Or use interactive mode:
```bash
grok-agents-hub
# Then select "Install component"
# Enter: agents/productivity/email-summarizer
```

## Step 6: Use an Agent

### Using the CLI

After installation, agents are in `~/.grok-agents/`. You can use them with the Grok API:

```javascript
const GrokClient = require('grok-agents-hub/api/grok-client');
const grok = new GrokClient(process.env.GROK_API_KEY);

const response = await grok.useAgent(
  'agents/productivity/email-summarizer',
  'Your email content here...'
);
```

### Example: Email Summarizer

```javascript
const GrokClient = require('grok-agents-hub/api/grok-client');
require('dotenv').config();

const grok = new GrokClient();

const email = `
Subject: Project Update
Hi team, we need to finalize the Q4 report by Friday. 
Please send your sections by Thursday EOD.
Also, don't forget the client meeting next Monday at 2 PM.
`;

const response = await grok.useAgent(
  'agents/productivity/email-summarizer',
  email
);

console.log(response.choices[0].message.content);
```

## Common Commands

```bash
# Interactive mode
grok-agents-hub

# List all components
grok-agents-hub --list

# Search
grok-agents-hub --search "productivity"

# Install
grok-agents-hub --install agents/productivity/email-summarizer

# Update all
grok-agents-hub --update

# Health check
grok-agents-hub --health
```

## Next Steps

1. **Explore Components**: Browse all available agents, commands, and templates
2. **Read Documentation**: Check out the full docs in `docs/`
3. **Contribute**: Add your own agents! See [CONTRIBUTING.md](../CONTRIBUTING.md)
4. **Join Community**: Connect with other users on Discord/Twitter

## Troubleshooting

### "GROK_API_KEY is required"
- Make sure you created `.env` file
- Check that `GROK_API_KEY` is set correctly
- Restart your terminal after creating `.env`

### "Component not found"
- Make sure you're using the correct path
- Try `grok-agents-hub --list` to see available components
- Check spelling and category (e.g., `agents/productivity/...`)

### Installation fails
- Check Node.js version: `node --version` (should be 18+)
- Try: `npm install -g grok-agents-hub`
- Check internet connection

## Need Help?

- 📖 [Full Documentation](README.md)
- 💬 [Discord Community](https://discord.gg/grok-agents-hub)
- 🐛 [Report Issues](https://github.com/GuBeLa/grok-agents-hub/issues)
- 📧 Email: support@grok-agents-hub.com

---

**Happy coding! 🚀**

