const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /\ \$\{isSubRow \? 'opacity-30 dark:opacity-20 grayscale filter' : ''\}/g;

const renderMainRowIdx = code.indexOf('const renderMainRow =');

let above = code.substring(0, renderMainRowIdx);
let below = code.substring(renderMainRowIdx);

above = above.replace(regex, '');

fs.writeFileSync('src/components/AdminPanel.tsx', above + below);
console.log("Fixed above");
