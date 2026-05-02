const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const anchor1 = `                                       {isSubRow ? (
                                         <>
                                           <td colSpan={21} className="px-5 py-3 bg-slate-50/30 dark:bg-slate-800/10 border-r border-slate-100 dark:border-slate-800 pointer-events-none"></td>
                                         </>
                                       ) : (
                                         <>`;

const anchor2 = `                                         </>
                                       )}`;

let idx1 = code.indexOf(anchor1);
let idx2 = code.indexOf(anchor2, idx1);

if (idx1 > -1 && idx2 > -1) {
    let inner = code.substring(idx1 + anchor1.length, idx2);
    
    // add opacity to regular className strings
    inner = inner.replace(/className="([^"]+)"/g, (match, classes) => {
        return `className={\`${classes} \${isSubRow ? 'opacity-30 mix-blend-multiply dark:mix-blend-screen grayscale filter' : ''}\`}`;
    });
    
    // Now also fix the one that ALREADY uses template literals:
    // <span className={\`font-black tracking-tight \${res.remainingToProcess / res.totalWeight < 0.92 ? 'text-red-500' : 'text-amber-600'}\`}>
    inner = inner.replace(/className=\{\`([^`]+)\`\}/g, (match, classes) => {
        return `className={\`${classes} \${isSubRow ? 'opacity-30 mix-blend-multiply dark:mix-blend-screen grayscale filter' : ''}\`}`;
    });

    let replacement = `                                         <>\n` + inner + `\n                                         </>`;
    
    code = code.substring(0, idx1) + replacement + code.substring(idx2 + anchor2.length);
    fs.writeFileSync('src/components/AdminPanel.tsx', code);
    console.log("Success");
} else {
    console.log("Not found");
}
