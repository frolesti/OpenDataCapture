const fs = require('fs');
const path = require('path');

const translationsDir = path.resolve('/home/frolesti/projects/OpenDataCapture/apps/outreach/src/i18n/translations');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  const newJson = {};

  for (const key in json) {
    if (json[key].en) {
      newJson[key] = { ca: json[key].en }; // Use English as base for Catalan
    } else if (json[key].ca) {
      newJson[key] = { ca: json[key].ca };
    } else {
      // If no 'en' or 'ca', keep as is (maybe it's not keyed by language?)
      // But usually these files are key -> { en: "...", fr: "..." }
      // Let's check structure.
      newJson[key] = json[key];
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(newJson, null, 2) + '\n');
  console.log(`Updated ${filePath}`);
}

fs.readdirSync(translationsDir).forEach((file) => {
  if (file.endsWith('.json')) {
    processFile(path.join(translationsDir, file));
  }
});
