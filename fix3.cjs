const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const anchorStart = `                                  const renderMainRow = (stockItem: any = null, isSubRow = false) => (`;
const anchorEnd = `                                        {stockItem ? (`

const idxStart = code.indexOf(anchorStart);
const idxEnd = code.indexOf(anchorEnd, idxStart);

if (idxStart !== -1 && idxEnd !== -1) {
  const replacement = `                                  const renderMainRow = (stockItem: any = null, isSubRow = false) => (
                                    <tr key={\`\${res.id}\${stockItem ? \`-\${stockItem._id}\` : ''}\`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                      {/* Demand section (duplicated on sub-rows but dimmed) */}
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.internalNo || "—"}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.shippingDate}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-bold text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.orderNo}</td>
                                      <td className={\`px-5 py-3 text-center font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.client}</td>
                                      <td className={\`px-5 py-3 text-center max-w-[200px] \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>
                                        <span className="text-[10px] text-slate-400 line-clamp-1" title={res.nomenclature}>{res.nomenclature}</span>
                                      </td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.type}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-black text-slate-900 dark:text-white \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.grade}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-bold text-slate-800 dark:text-slate-200 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{parseFloat(res.diameter.toFixed(2))}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-800 dark:text-slate-200 font-medium \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>
                                        {res.lengthType === "НД" ? "НД (3000-6000)" : \`МД \${res.length}\`}
                                      </td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-black text-slate-900 dark:text-white \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.weightTons.toFixed(3)}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-bold text-sky-600 dark:text-sky-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.remainingToProcess.toFixed(3)}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center text-slate-500 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>Круг г/к ГОСТ 2590-2006</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-black text-slate-900 dark:text-white \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.grade}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-black text-sky-600 dark:text-sky-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{parseFloat(res.billetDia.toFixed(2))}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center font-black text-emerald-600 dark:text-emerald-400 \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>{res.totalWeight.toFixed(3)}</td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-slate-500 text-center \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>
                                        {res.lengthType === "НД" ? "НД (3000-6000)" : \`МД \${res.billetLength}\`}
                                      </td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>
                                        <span className="font-bold text-red-500/80 block">{res.drawLength > 0 ? ((res.techEnds / res.drawLength) * res.totalWeight).toFixed(3) : 0} тн</span>
                                        <span className="text-[9px] text-slate-400 block">{res.drawLength > 0 ? (((res.techEnds / res.drawLength) * res.totalWeight / res.totalWeight) * 100).toFixed(1) : 0}%</span>
                                      </td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>
                                        <span className="font-bold text-sky-500/80 block">{(res.lengthType === "НД" || res.drawLength <= 0 ? 0 : ((res.usefulLength - (res.pcsPerBillet * res.length)) / res.drawLength * res.totalWeight)).toFixed(3)} тн</span>
                                        <span className="text-[9px] text-slate-400 block">{(res.lengthType === "НД" || res.drawLength <= 0 ? 0 : (((res.usefulLength - (res.pcsPerBillet * res.length)) / res.drawLength * res.totalWeight / res.totalWeight) * 100)).toFixed(1)}%</span>
                                      </td>
                                      <td className={\`px-5 py-3 whitespace-nowrap text-center \${isSubRow ? 'opacity-30 dark:opacity-20 grayscale' : ''}\`}>
                                        <span className={\`font-black tracking-tight \${res.remainingToProcess / res.totalWeight < 0.92 ? 'text-red-500' : 'text-amber-600'}\`}>{(res.remainingToProcess / res.totalWeight).toFixed(3)}</span>
                                      </td>
                                      
                                      {/* Status and Deficit */}
                                      {!isSubRow && (
                                        <>
                                          <td className={\`px-5 py-3 whitespace-nowrap text-center font-black \${res.allocatedStock > 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'}\`} rowSpan={Math.max(1, res.matchedStockItems.length)}>
                                            {res.allocatedStock > 0 ? res.allocatedStock.toFixed(3) : "—"}
                                          </td>
                                          <td className={\`px-5 py-3 whitespace-nowrap text-center font-black \${res.shortageStock > 0.0005 ? 'text-rose-600 dark:text-rose-500' : 'text-slate-400'}\`} rowSpan={Math.max(1, res.matchedStockItems.length)}>
                                            {res.shortageStock > 0.0005 ? res.shortageStock.toFixed(3) : "—"}
                                          </td>
                                        </>
                                      )}
                                      
`;

  code = code.substring(0, idxStart) + replacement + code.substring(idxEnd);
  fs.writeFileSync('src/components/AdminPanel.tsx', code);
  console.log("Replaced");
} else {
  console.log("Not found");
}
