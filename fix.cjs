const fs = require('fs');
const path = 'src/components/AdminPanel.tsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let startIdx = lines.findIndex(l => l.includes('totalCost:                            </div>'));
let endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('ref={tableContainerRef}'));

if (startIdx !== -1 && endIdx !== -1) {
  let endIndexToDelete = -1;
  for (let i = endIdx; i >= 0; i--) {
      // Find the inner div that closes the button group
      if (lines[i].includes('</div>')) {
          endIndexToDelete = i;
          break;
      }
  }

  const correctCode = `                                                    totalCost: newTotalWeight * item.price
                                                  };
                                                }
                                                return item;
                                              }));
                                            }}
                                            className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold rounded-full shadow-sm shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1"
                                            title={\`Улучшить КИМ до \${res.optimizedKim.toFixed(3)} используя L заг. \${res.optimizedBilletLength}\`}
                                          >
                                            <TrendingUp className="w-2.5 h-2.5" />
                                            {res.optimizedBilletLength}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    {!isPurchasingMode && (
                                      <>
                                        <td className="px-5 py-3 whitespace-nowrap text-center font-medium text-slate-600 dark:text-slate-400">
                                          {res.price ? formatCurrency(res.price) : "—"}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap text-center font-bold text-slate-900 dark:text-white">
                                          {res.totalCost ? formatCurrency(res.totalCost) : "—"}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : supplySection === "calc-stock" ? (
                  <motion.div
                    key="supply-calc-stock"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-8"
                  >
                    {matchedDemand.length === 0 ? (
                      <div className="bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 rounded-[32px] p-12 flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-[30px] flex items-center justify-center text-sky-500 mb-6">
                          <Activity className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Нет данных</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-sm px-6 leading-relaxed">
                          Сначала выполните расчет потребности и загрузите остатки.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-2 bg-white dark:bg-[#1A1C19]">
                           <div className="flex items-center gap-4">
                             <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mr-4">Расчет с учетом наличия</h4>
                           </div>
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2">`;

  // delete the bad lines and insert correctCode as strings
  lines.splice(startIdx, endIndexToDelete - startIdx, correctCode);
  fs.writeFileSync(path, lines.join('\n'));
  console.log('Fixed');
} else {
  console.log('Indices not found:', startIdx, endIdx);
}
