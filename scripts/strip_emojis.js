const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu;

function cleanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        cleanDir(fullPath);
      }
    } else if (entry.isFile() && /\.(html|js|css|json|md)$/.test(entry.name)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (emojiRegex.test(content)) {
        console.log(`Cleaning emojis in: ${fullPath}`);
        content = content.replace(emojiRegex, '');
        // Clean up double spaces created by emoji removal
        content = content.replace(/[ ]{2,}/g, ' ');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

cleanDir(path.join(__dirname, '../public'));
cleanDir(path.join(__dirname, '../server'));
console.log('All files stripped of emojis successfully.');
