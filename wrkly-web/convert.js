import fs from 'fs';
import path from 'path';

const files = [
  { in: 'auth.html', out: 'src/app/design/login/page.tsx', name: 'LoginPage' },
  { in: 'dashboard.html', out: 'src/app/design/workspace/page.tsx', name: 'WorkspaceDashboard' },
  { in: 'board.html', out: 'src/app/design/board/page.tsx', name: 'BoardView' }
];

files.forEach(({ in: inFile, out, name }) => {
  if (!fs.existsSync(inFile)) {
    console.log(`${inFile} not found, skipping.`);
    return;
  }
  
  let html = fs.readFileSync(inFile, 'utf8');
  
  // Extract body
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    console.log(`No body found in ${inFile}`);
    return;
  }
  
  let bodyAttrs = bodyMatch[1];
  let content = bodyMatch[2];
  
  // Convert body to div
  let jsx = `<div${bodyAttrs}>\n${content}\n</div>`;
  
  // React specifics
  jsx = jsx.replace(/class=/g, 'className=');
  jsx = jsx.replace(/for=/g, 'htmlFor=');
  
  // Self closing tags
  jsx = jsx.replace(/<(img|input|br|hr)([^>]*?)(?<!\/)>/g, '<$1$2 />');
  
  // SVG attributes to camelCase
  const svgAttrs = [
    'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule',
    'stroke-opacity', 'fill-opacity', 'tabindex', 'readonly', 'colspan', 'rowspan',
    'clip-path'
  ];
  
  svgAttrs.forEach(attr => {
    const regex = new RegExp(`\\s${attr}=((?:'[^']*')|(?:"[^"]*"))`, 'gi');
    const camel = attr.replace(/-([a-z])/g, g => g[1].toUpperCase());
    jsx = jsx.replace(regex, ` ${camel}=$1`);
  });
  
  // Some generated HTML might have empty href="" which is okay in jsx, but let's leave it.
  // Comments <!-- --> to {/* */}
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

  const component = `
export default function ${name}() {
  return (
    ${jsx}
  );
}
`;

  const outPath = path.resolve(out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, component, 'utf8');
  console.log(`Successfully created ${outPath}`);
});
