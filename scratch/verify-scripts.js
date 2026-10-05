const fs = require('fs');

['admin.html', 'index.html', 'principal.html', 'profile.html', 'site-admin.html', 'supervisor.html', 'teacher.html', 'verify.html'].forEach(f => {
  const c = fs.readFileSync('public/' + f, 'utf8');
  const matches = c.match(/<script src="[^"]+"><\/script>/g) || [];
  console.log(f, ':', matches);
});
