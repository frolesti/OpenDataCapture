const fs = require('fs');
const path = require('path');

const translationsDir = path.join(__dirname, '../src/translations');

function processObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // Check if it's a translation object (has language keys)
  const keys = Object.keys(obj);
  const hasLangKeys = keys.some((k) => ['en', 'fr', 'es', 'ca'].includes(k));

  if (hasLangKeys) {
    // It's a translation node
    let caValue = obj['ca'];
    if (!caValue) {
      caValue = obj['en'] || obj['fr'] || obj['es'] || '';
      console.log('Missing CA translation, using fallback:', caValue);
    }
    return { ca: caValue };
  }

  // Recursively process children
  const newObj = {};
  for (const key in obj) {
    newObj[key] = processObject(obj[key]);
  }
  return newObj;
}

fs.readdirSync(translationsDir).forEach((file) => {
  if (!file.endsWith('.json')) return;

  const filePath = path.join(translationsDir, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log(`Processing ${file}...`);
  const newContent = processObject(content);

  fs.writeFileSync(filePath, JSON.stringify(newContent, null, 2) + '\n');
});
