const fs = require('fs');
const path = require('path');

const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let code = fs.readFileSync(teacherJsPath, 'utf8');

const oldMailto = `  const mailtoUri = \`mailto:\${encodeURIComponent(email)}?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
  
  // Trigger mailto link via an anchor click
  const a = document.createElement('a');
  a.href = mailtoUri;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);`;

const newMailto = `  const mailtoUri = \`mailto:\${encodeURIComponent(email)}?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
  
  // Trigger default mail client
  try {
    window.location.href = mailtoUri;
  } catch (err) {
    const a = document.createElement('a');
    a.href = mailtoUri;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }`;

if (code.includes('const mailtoUri = `mailto:${encodeURIComponent(email)}?subject=')) {
  code = code.replace(oldMailto, newMailto);
  fs.writeFileSync(teacherJsPath, code, 'utf8');
  console.log('Successfully updated mailto trigger in teacher.js');
}
