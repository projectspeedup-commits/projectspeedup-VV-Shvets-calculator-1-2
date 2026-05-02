const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const fixed = content.replaceAll('(res: Demand) =>', '(res: any) =>');
fs.writeFileSync('src/components/AdminPanel.tsx', fixed);
console.log('Fixed types');
