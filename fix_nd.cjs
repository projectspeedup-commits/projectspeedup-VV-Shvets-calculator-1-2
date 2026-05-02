const fs = require('fs');
const filePath = 'src/components/AdminPanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of НД (3000-6000) with НД(3000-6000)
content = content.replace(/"НД \(3000-6000\)"/g, '"НД(3000-6000)"');

fs.writeFileSync(filePath, content);
console.log('Fixed spaces in AdminPanel.tsx');
