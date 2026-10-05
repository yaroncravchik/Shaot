const fs = require('fs');

const map = {
  'public/index.html': ['api.js', 'auth.js'],
  'public/teacher.html': ['api.js', 'auth.js', 'teacher.js'],
  'public/profile.html': ['api.js', 'auth.js', 'profile.js'],
  'public/principal.html': ['api.js', 'auth.js', 'principal.js'],
  'public/supervisor.html': ['api.js', 'auth.js', 'supervisor.js'],
  'public/admin.html': ['api.js', 'auth.js', 'admin.js'],
  'public/site-admin.html': ['api.js', 'auth.js', 'site-admin.js'],
  'public/verify.html': ['api.js', 'auth.js', 'verify.js']
};

for (const [file, scripts] of Object.entries(map)) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove any corrupted <script src="js/.js..."></script> tags
  content = content.replace(/<script src="js\/\.js[^"]*"><\/script>\s*/g, '');
  
  // If the file already had the script tags, strip old ones
  scripts.forEach(s => {
    const re = new RegExp('<script src="js/' + s + '[^"]*"><\\/script>\\s*', 'g');
    content = content.replace(re, '');
  });

  const ts = Date.now();
  const scriptTags = scripts.map(s => `  <script src="js/${s}?v=${ts}"></script>`).join('\n');
  
  // In index.html, scripts must come BEFORE the inline <script> block
  if (file === 'public/index.html') {
    content = content.replace('<script>', `${scriptTags}\n  <script>`);
  } else if (content.includes('</body>')) {
    const parts = content.split('</body>');
    content = parts[0] + scriptTags + '\n</body>' + parts[1];
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully fixed scripts in:', file);
}
