#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const boxen = require('boxen');

const { listComponents, searchComponents, installComponent, updateComponents, showAnalytics, healthCheck } = require('./commands.js');

// Get version from package.json
const packageJson = require('../package.json');
const version = packageJson.version;

// Banner
const banner = boxen(
  chalk.bold.cyan('🤖 Grok Agents Hub') + '\n' +
  chalk.gray('Open-source repository for Grok AI Agents, Templates, Commands, and Integrations'),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan'
  }
);

program
  .name('grok-agents-hub')
  .description('CLI tool for managing Grok AI agents, templates, commands, and integrations')
  .version(version);

// Interactive mode (default)
program
  .command('interactive')
  .alias('i')
  .description('Interactive mode - browse and install components')
  .action(async () => {
    console.log(banner);
    await interactiveMode();
  });

// List all components
program
  .command('list')
  .alias('ls')
  .description('List all available components')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --type <type>', 'Filter by type (agent, command, template, integration)')
  .action(async (options) => {
    await listComponents(options);
  });

// Search components
program
  .command('search <query>')
  .alias('s')
  .description('Search for components')
  .action(async (query) => {
    await searchComponents(query);
  });

// Install component
program
  .command('install <component>')
  .alias('i')
  .description('Install a component')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (component, options) => {
    await installComponent(component, options);
  });

// Update components
program
  .command('update')
  .alias('u')
  .description('Update all installed components')
  .action(async () => {
    await updateComponents();
  });

// Analytics
program
  .command('analytics')
  .alias('stats')
  .description('Show usage analytics')
  .action(async () => {
    await showAnalytics();
  });

// Health check
program
  .command('health')
  .description('Check system health and configuration')
  .action(async () => {
    await healthCheck();
  });

// Default action (interactive mode)
if (process.argv.length === 2) {
  console.log(banner);
  interactiveMode();
} else {
  program.parse();
}

async function interactiveMode() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '📋 List all components', value: 'list' },
        { name: '🔍 Search components', value: 'search' },
        { name: '⬇️  Install component', value: 'install' },
        { name: '🔄 Update components', value: 'update' },
        { name: '📊 View analytics', value: 'analytics' },
        { name: '🏥 Health check', value: 'health' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ]);

  switch (answers.action) {
    case 'list':
      await listComponents({});
      break;
    case 'search':
      const { query } = await inquirer.prompt([
        { type: 'input', name: 'query', message: 'Search query:' }
      ]);
      await searchComponents(query);
      break;
    case 'install':
      const { component } = await inquirer.prompt([
        { type: 'input', name: 'component', message: 'Component path (e.g., agents/productivity/email-summarizer):' }
      ]);
      await installComponent(component, {});
      break;
    case 'update':
      await updateComponents();
      break;
    case 'analytics':
      await showAnalytics();
      break;
    case 'health':
      await healthCheck();
      break;
    case 'exit':
      console.log(chalk.green('👋 Goodbye!'));
      process.exit(0);
  }
}

