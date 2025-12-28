
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDirs = [
  path.join(__dirname, 'src'),
  path.join(__dirname, '../../apps/playground/src/instruments'),
  path.join(__dirname, '../instrument-stubs/src')
];

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, (filePath) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) return;

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // Replace language definition
      content = content.replace(/language:\s*\[\s*'en'\s*,\s*'fr'\s*\]/g, "language: ['ca']");
      content = content.replace(/language:\s*\[\s*'fr'\s*,\s*'en'\s*\]/g, "language: ['ca']");
      content = content.replace(/language:\s*'en'/g, "language: 'ca'");
      
      // Replace 'en': with 'ca':
      // Matches "  en:" or "  'en':"
      content = content.replace(/(\s+)'?en'?:/g, "$1ca:");
      
      // Remove 'fr': ... lines
      // Matches "  fr: '...'," or "  fr: "...", "
      // Be careful not to match inside strings.
      // Assuming standard formatting.
      content = content.replace(/^\s*'?!?fr'?:.*?,?$/gm, "");
      
      if (content !== originalContent) {
        console.log(`Updating ${filePath}`);
        fs.writeFileSync(filePath, content);
      }
    });
  }
});
