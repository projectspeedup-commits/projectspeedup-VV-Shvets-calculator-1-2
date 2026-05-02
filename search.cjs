const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const searchStr = '{isSubRow ? (';
console.log('Index:', code.indexOf(searchStr));

const lines = code.split('\n');
const startLineOffset = lines.findIndex(l => l.includes('const renderMainRow'));
for(let i = startLineOffset; i < startLineOffset + 15; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
