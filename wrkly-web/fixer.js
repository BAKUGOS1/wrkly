const fs = require('fs');

const files = [
  'src/app/design/login/page.tsx', 
  'src/app/design/workspace/page.tsx', 
  'src/app/design/board/page.tsx'
];

files.forEach(f => {
  let t = fs.readFileSync(f, 'utf8');
  // Fix viewbox
  t = t.replace(/viewbox=/g, 'viewBox=');
  // Remove inline styles completely since we use Tailwind
  t = t.replace(/style="[^"]*"/g, '');
  // Some SVG attributes like strokeWidth were handled in convert.js, 
  // let's ensure stroke-dasharray if it exists
  t = t.replace(/stroke-dasharray=/g, 'strokeDasharray=');
  
  fs.writeFileSync(f, t);
});
console.log('Fixed syntax issues.');
