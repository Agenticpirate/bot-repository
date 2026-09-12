const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const deny = [
  /api[_-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /password\s*[:=]/i,
  /token\s*[:=]/i,
  /cookie\s*[:=]/i,
  /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,
  /\.mysql\.database\.azure\.com/i,
  /ssh\s+-i/i
];
const allowFiles = new Set(['SECURITY.md', 'docs/sanitization-policy.md', 'docs/public-launch-checklist.md']);
const exts = new Set(['.md', '.json', '.js', '.html', '.css']);
let hits = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file);
    else if (exts.has(path.extname(file))) {
      const rel = path.relative(root, file);
      const txt = fs.readFileSync(file, 'utf8');
      if (allowFiles.has(rel)) continue;
      for (const rx of deny) {
        if (rx.test(txt)) hits.push(`${rel}: ${rx}`);
      }
    }
  }
}
walk(root);
if (hits.length) {
  console.error('Sensitive patterns found:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('Sensitivity sweep passed.');
