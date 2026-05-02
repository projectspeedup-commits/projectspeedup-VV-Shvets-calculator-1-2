const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /const renderMainRow = \(stockItem: any = null, isSubRow = false\) => \([\s\S]*?<td className="px-5 py-3 whitespace-nowrap text-center text-slate-800 dark:text-slate-200 font-medium">/;

const replacement = `const renderMainRow = (stockItem: any = null, isSubRow = false) => (
                                    <tr key={\`\${res.id}\${stockItem ? \`-\${stockItem._id}\` : ''}\`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                      {/* Demand section (duplicated on sub-rows but dimmed) */}
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>{res.internalNo || "—"}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>{res.shippingDate}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-bold text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>{res.orderNo}</td>
                                      <td className={\`px-5 py-3 text-center font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>{res.client}</td>
                                      <td className={\`px-5 py-3 text-center max-w-[200px] \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>
                                        <span className="text-[10px] text-slate-400 line-clamp-1" title={res.nomenclature}>{res.nomenclature}</span>
                                      </td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>{res.type}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-black text-slate-900 dark:text-white \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>{res.grade}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-bold text-slate-800 dark:text-slate-200 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>{parseFloat(res.diameter.toFixed(2))}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-800 dark:text-slate-200 font-medium \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    
    // Now replace the rest
    const anchorEnd = `{!isSubRow && (`;
    const idxEnd = code.indexOf(anchorEnd);
    if (idxEnd !== -1) {
        let afterStart = code.indexOf(`{res.lengthType === "НД" ? "НД (3000-6000)"`);
        if (afterStart !== -1 && afterStart < idxEnd) {
            let inside = code.substring(afterStart, idxEnd);
            inside = inside.replace(/className="([^"]+)"/g, (match, classes) => {
                return `className={\`${classes} \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}`;
            });
            inside = inside.replace(/className=\{\`([^`]+)\`\}/g, (match, classes) => {
                if (classes.includes('text-red-500')) {
                    return `className={\`${classes} \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale filter' : ''}\`}`;
                }
                return match;
            });
            code = code.substring(0, afterStart) + inside + code.substring(idxEnd);
        }
    }
    
    fs.writeFileSync('src/components/AdminPanel.tsx', code);
    console.log("Fixed start");
} else {
    console.log("No match");
}
