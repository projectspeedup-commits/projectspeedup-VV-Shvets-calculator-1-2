const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

content = content.replace(/res\.lengthType === "НД" \? "НД \(3000-6000\)" : `МД \$\{res\.billetLength\}`/g, 'res.lengthType === "НД" ? "НД" : `МД ${res.billetLength}`');

content = content.replace(/curr\.lengthType === "НД" \? "НД \(3000-6000\)" : `МД \$\{curr\.billetLength\}`/g, 'curr.lengthType === "НД" ? "НД" : `МД ${curr.billetLength}`');

fs.writeFileSync('src/components/AdminPanel.tsx', content);
