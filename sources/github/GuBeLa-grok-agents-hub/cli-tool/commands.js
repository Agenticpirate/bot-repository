const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const os = require('os');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const USER_AGENTS_DIR = path.join(os.homedir(), '.grok-agents');

// Ensure user agents directory exists
fs.ensureDirSync(USER_AGENTS_DIR);

/**
 * List all available components
 */
async function listComponents(options = {}) {
  const spinner = ora('Loading components...').start();
  
  try {
    const components = await getAllComponents();
    spinner.stop();

    if (options.category) {
      const filtered = components.filter(c => c.category === options.category);
      displayComponents(filtered, options.type);
    } else if (options.type) {
      const filtered = components.filter(c => c.type === options.type);
      displayComponents(filtered);
    } else {
      displayComponents(components);
    }
  } catch (error) {
    spinner.fail('Failed to load components');
    console.error(chalk.red(error.message));
  }
}

/**
 * Search for components
 */
async function searchComponents(query) {
  const spinner = ora('Searching...').start();
  
  try {
    const components = await getAllComponents();
    const results = components.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.description?.toLowerCase().includes(query.toLowerCase()) ||
      c.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    
    spinner.stop();
    
    if (results.length === 0) {
      console.log(chalk.yellow(`No components found for "${query}"`));
    } else {
      console.log(chalk.green(`Found ${results.length} component(s):\n`));
      displayComponents(results);
    }
  } catch (error) {
    spinner.fail('Search failed');
    console.error(chalk.red(error.message));
  }
}

/**
 * Install a component
 */
async function installComponent(componentPath, options = {}) {
  const spinner = ora(`Installing ${componentPath}...`).start();
  
  try {
    const sourcePath = path.join(TEMPLATES_DIR, componentPath);
    const targetPath = path.join(USER_AGENTS_DIR, componentPath);
    
    if (!await fs.pathExists(sourcePath)) {
      spinner.fail('Component not found');
      console.error(chalk.red(`Component "${componentPath}" does not exist`));
      return;
    }

    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(sourcePath, targetPath);
    
    spinner.succeed(`Installed ${componentPath}`);
    console.log(chalk.green(`Component installed to: ${targetPath}`));
    
    // Show usage instructions
    const componentData = await fs.readJson(path.join(targetPath, path.basename(componentPath) + '.json'));
    if (componentData.usage) {
      console.log(chalk.cyan('\nUsage:'));
      console.log(componentData.usage);
    }
  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red(error.message));
  }
}

/**
 * Update all installed components
 */
async function updateComponents() {
  const spinner = ora('Updating components...').start();
  
  try {
    const installed = await getInstalledComponents();
    let updated = 0;
    
    for (const component of installed) {
      const sourcePath = path.join(TEMPLATES_DIR, component);
      const targetPath = path.join(USER_AGENTS_DIR, component);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath, { overwrite: true });
        updated++;
      }
    }
    
    spinner.succeed(`Updated ${updated} component(s)`);
  } catch (error) {
    spinner.fail('Update failed');
    console.error(chalk.red(error.message));
  }
}

/**
 * Show usage analytics
 */
async function showAnalytics() {
  const analyticsPath = path.join(USER_AGENTS_DIR, 'analytics.json');
  
  if (!await fs.pathExists(analyticsPath)) {
    console.log(chalk.yellow('No analytics data available yet'));
    return;
  }
  
  try {
    const analytics = await fs.readJson(analyticsPath);
    
    console.log(chalk.bold.cyan('\n📊 Usage Analytics\n'));
    
    if (analytics.components) {
      console.log(chalk.bold('Most Used Components:'));
      const sorted = Object.entries(analytics.components)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      sorted.forEach(([name, count], index) => {
        console.log(chalk.gray(`${index + 1}. ${name}: ${count} times`));
      });
    }
    
    if (analytics.totalUsage) {
      console.log(chalk.bold(`\nTotal Usage: ${analytics.totalUsage} times`));
    }
  } catch (error) {
    console.error(chalk.red('Failed to load analytics'));
  }
}

/**
 * Health check
 */
async function healthCheck() {
  console.log(chalk.bold.cyan('\n🏥 System Health Check\n'));
  
  // Check templates directory
  const templatesExists = await fs.pathExists(TEMPLATES_DIR);
  console.log(templatesExists ? chalk.green('✓ Templates directory') : chalk.red('✗ Templates directory missing'));
  
  // Check user agents directory
  const userDirExists = await fs.pathExists(USER_AGENTS_DIR);
  console.log(userDirExists ? chalk.green('✓ User agents directory') : chalk.red('✗ User agents directory missing'));
  
  // Check .env file
  const envPath = path.join(process.cwd(), '.env');
  const envExists = await fs.pathExists(envPath);
  console.log(envExists ? chalk.green('✓ .env file exists') : chalk.yellow('⚠ .env file not found (use .env.example)'));
  
  // Check API key
  if (envExists) {
    require('dotenv').config();
    const hasApiKey = !!process.env.GROK_API_KEY;
    console.log(hasApiKey ? chalk.green('✓ GROK_API_KEY configured') : chalk.red('✗ GROK_API_KEY not set'));
  }
  
  // Count installed components
  const installed = await getInstalledComponents();
  console.log(chalk.cyan(`\nInstalled components: ${installed.length}`));
}

/**
 * Get all components from templates directory
 */
async function getAllComponents() {
  const components = [];
  
  const categories = ['agents', 'commands', 'templates', 'integrations'];
  
  for (const category of categories) {
    const categoryPath = path.join(TEMPLATES_DIR, category);
    if (!await fs.pathExists(categoryPath)) continue;
    
    const items = await fs.readdir(categoryPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        // Subcategory (e.g., agents/dev, agents/productivity)
        const subPath = path.join(categoryPath, item.name);
        const files = await fs.readdir(subPath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(subPath, file);
            const data = await fs.readJson(filePath);
            components.push({
              ...data,
              type: category.slice(0, -1), // Remove 's'
              category: item.name,
              path: `${category}/${item.name}/${file.replace('.json', '')}`
            });
          }
        }
      } else if (item.name.endsWith('.json')) {
        // Direct file in category
        const filePath = path.join(categoryPath, item.name);
        const data = await fs.readJson(filePath);
        components.push({
          ...data,
          type: category.slice(0, -1),
          path: `${category}/${item.name.replace('.json', '')}`
        });
      }
    }
  }
  
  return components;
}

/**
 * Get installed components
 */
async function getInstalledComponents() {
  const components = [];
  
  if (!await fs.pathExists(USER_AGENTS_DIR)) {
    return components;
  }
  
  async function scanDir(dir, basePath = '') {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relPath = path.join(basePath, item.name);
      
      if (item.isDirectory()) {
        await scanDir(fullPath, relPath);
      } else if (item.name.endsWith('.json')) {
        components.push(relPath.replace('.json', ''));
      }
    }
  }
  
  await scanDir(USER_AGENTS_DIR);
  return components;
}

/**
 * Display components in a formatted way
 */
function displayComponents(components, filterType = null) {
  if (components.length === 0) {
    console.log(chalk.yellow('No components found'));
    return;
  }
  
  const grouped = {};
  
  components.forEach(comp => {
    if (filterType && comp.type !== filterType) return;
    
    const key = comp.type || 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(comp);
  });
  
  Object.entries(grouped).forEach(([type, items]) => {
    console.log(chalk.bold.cyan(`\n${type.toUpperCase()} (${items.length})`));
    items.forEach(comp => {
      console.log(chalk.gray(`  • ${comp.path}`));
      if (comp.description) {
        console.log(chalk.white(`    ${comp.description}`));
      }
    });
  });
}

module.exports = {
  listComponents,
  searchComponents,
  installComponent,
  updateComponents,
  showAnalytics,
  healthCheck
};

