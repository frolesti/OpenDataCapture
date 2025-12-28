
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, '../src');

walkDir(targetDir, (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Remove en, fr, es keys with string values
  // Matches: whitespace + key + colon + whitespace + quote + value + quote + optional comma
  content = content.replace(/(\s+)en:\s*'[^']*',?/g, "");
  content = content.replace(/(\s+)fr:\s*'[^']*',?/g, "");
  content = content.replace(/(\s+)es:\s*'[^']*',?/g, "");
  
  // Double quotes
  content = content.replace(/(\s+)en:\s*"[^"]*",?/g, "");
  content = content.replace(/(\s+)fr:\s*"[^"]*",?/g, "");
  content = content.replace(/(\s+)es:\s*"[^"]*",?/g, "");

  if (content !== originalContent) {
    console.log(`Updating ${filePath}`);
    fs.writeFileSync(filePath, content);
  }
});
