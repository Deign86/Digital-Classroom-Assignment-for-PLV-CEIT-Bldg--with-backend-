const fs = require('fs');
const path = require('path');

// Recursively collect files under the workspace and scan for textarea or Textarea usages
function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      // skip node_modules and .git
      if (file === 'node_modules' || file === '.git') return;
      walk(full, fileList);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts') || full.endsWith('.jsx') || full.endsWith('.js') || full.endsWith('.html')) {
      fileList.push(full);
    }
  });
  return fileList;
}

function checkFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const issues = [];

  // regex to find <Textarea ...> or <textarea ...>
  const re = /<(?:Textarea|textarea)([\s\S]*?)>/g;
  let match;
  while ((match = re.exec(src)) !== null) {
    const attrs = match[1];
    if (!/maxLength=|maxlength=/.test(attrs)) {
      issues.push({ file, snippet: match[0] });
    }
  }

  return issues;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const files = walk(root);
  const allIssues = [];
  files.forEach((f) => {
    const issues = checkFile(f);
    if (issues.length) allIssues.push(...issues);
  });

  if (allIssues.length) {
    console.error('\nFound textarea/Textarea usages without maxLength attribute:');
    allIssues.forEach((it) => {
      console.error(` - ${path.relative(root, it.file)}: ${it.snippet.replace(/\n/g, ' ').slice(0, 200)}...`);
    });
    console.error('\nPlease add maxLength={500} to long-text fields or mark them intentionally exempt in the script.');
    process.exit(2);
  }

  console.log('All textarea/Textarea usages include maxLength attribute.');
}

main();
