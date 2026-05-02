import { formatCurrency } from "../lib/constants";

interface PrintTemplateProps {
  printText: string;
  reportData: any;
  orderWeight: string;
  selectedTarget: string;
}

export function PrintTemplate({ reportData, orderWeight, selectedTarget }: PrintTemplateProps) {
  const {
    dateStr,
    formattedGrade,
    gost,
    profileTypeStr,
    profileGost,
    lengthLabel,
    orderedLength,
    remnantLength,
    rawPriceNum,
    sellPriceNum,
    sellTotal,
    displayedRawLength,
    selectedRaw,
    displayedTargetLength,
    currentDrawCoef,
    techEndsMm,
    lengthAfterTechEnds,
    techTons,
    remTons,
    requiredWeight,
    commercialStats,
    advancedRemnantStats,
  } = reportData;

  const totalTechKg = (techTons * 1000).toFixed(1);
  const totalRemKg = (remTons * 1000).toFixed(1);

  return (
    <div className="hidden print:block print-template-container bg-white w-[210mm] min-h-[297mm] mx-auto text-black font-serif text-[12px] leading-tight shadow-none" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              width: 100%;
              height: 100%;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            
            /* Hide the main application UI */
            .print\\:hidden {
              display: none !important;
            }

            /* Isolate the print template */
            .print-template-container {
              display: block !important;
              visibility: visible !important;
              position: absolute;
              top: 0;
              left: 0;
              width: 210mm;
              min-height: 297mm;
              z-index: 9999999;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}
      </style>
      
      {/* HEADER */}
      <div className="text-center pt-10 pb-6">
        <h1 className="text-[18pt] font-bold uppercase tracking-tight">ООО «ЗМК АРСЕНАЛ»</h1>
        <p className="text-[14pt] font-bold mt-1 text-[#1A1C19]">Коммерческий расчет от {dateStr}</p>
        <p className="text-[10pt] mt-1 italic text-gray-700">Внутренний документ расчета рентабельности</p>
      </div>

      <div className="px-[15mm] pb-[15mm] space-y-6">
        
        {/* COMMERCE SECTION */}
        <section>
          <h2 className="text-[12px] font-bold border-b border-black mb-2 uppercase">1. Коммерческий блок</h2>
          <table className="w-full text-[11px] border-collapse border border-black mb-2">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 font-bold w-[20%] bg-gray-50">Марка стали:</td>
                <td className="border border-black p-1.5 w-[30%]">{formattedGrade || "Не выбрана"} {gost ? `(${gost})` : ""}</td>
                <td className="border border-black p-1.5 font-bold w-[20%] bg-gray-50">Профиль:</td>
                <td className="border border-black p-1.5 w-[30%]">{profileTypeStr} {selectedTarget ? parseFloat(selectedTarget) : "?"} мм ({profileGost})</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-50">Длина прутка:</td>
                <td className="border border-black p-1.5">{orderedLength || "?"} мм</td>
                <td className="border border-black p-1.5 font-bold bg-gray-50">Объем заказа:</td>
                <td className="border border-black p-1.5">{orderWeight || "?"} тн</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-50">Цена за 1 тн (без НДС):</td>
                <td className="border border-black p-1.5">{formatCurrency(sellPriceNum)} руб.</td>
                <td className="border border-black p-1.5 font-bold bg-gray-50">Итого (без НДС):</td>
                <td className="border border-black p-1.5 font-bold">{formatCurrency(sellTotal)} руб.</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-50" colSpan={2}></td>
                <td className="border border-black p-1.5 font-bold bg-gray-50">Итого с НДС (22%):</td>
                <td className="border border-black p-1.5 font-bold">{formatCurrency(sellTotal * 1.22)} руб.</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* PRODUCTION & SUPPLY SECTION */}
        <div className="flex gap-4">
          <section className="flex-[2]">
            <h2 className="text-[12px] font-bold border-b border-black mb-2 uppercase">2. Производственный блок</h2>
            <table className="w-full text-[11px] border-collapse border border-black">
              <tbody>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Длина заготовки:</td>
                  <td className="border border-black p-1.5 font-bold text-center">{displayedRawLength || "?"} мм</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Диаметр заготовки:</td>
                  <td className="border border-black p-1.5 font-bold text-center">{selectedRaw ? parseFloat(selectedRaw) : "?"} мм</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Вытяжка (коэф. {currentDrawCoef ? currentDrawCoef.toFixed(3) : "?"}):</td>
                  <td className="border border-black p-1.5 font-bold text-center">{displayedTargetLength || "?"} мм</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Технологические концы:</td>
                  <td className="border border-black p-1.5 font-bold text-center">{techEndsMm || "0"} мм</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Полезная длина:</td>
                  <td className="border border-black p-1.5 font-bold text-center">{lengthAfterTechEnds || "0"} мм</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Образование лома:</td>
                  <td className="border border-black p-1.5 font-bold text-center">{totalTechKg} кг</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Деловые остатки:</td>
                  <td className="border border-black p-1.5 font-bold text-center">{totalRemKg} кг</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 bg-gray-50 font-medium">Длина делового остатка:</td>
                  <td className="border border-black p-1.5 font-bold text-center">{remnantLength || "0"} мм</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="flex-1 flex flex-col">
            <h2 className="text-[12px] font-bold border-b border-black mb-2 uppercase text-center">3. Блок снабжения</h2>
            <div className="flex-1 border border-black p-3 bg-gray-50 flex flex-col items-center justify-center text-center">
               <p className="font-bold text-[11px] uppercase mb-1">Сырье к закупке</p>
               <p className="text-[18px] font-black">{requiredWeight || "?"} <span className="text-[12px] font-normal">тонн</span></p>
               <div className="mt-3 w-full border-t border-black pt-2 text-[11px] leading-snug">
                 <p>{profileTypeStr === "Шестигранник" ? "Шестигранник г/к ГОСТ 2879-2006" : "Круг г/к ГОСТ 2590-2006"} ф{selectedRaw ? parseFloat(selectedRaw) : "?"} мм</p>
                 <p className="font-bold">{formattedGrade}</p>
                 <p>{gost}</p>
               </div>
            </div>
          </section>
        </div>

        {/* ECONOMY SECTION */}
        <section>
          <h2 className="text-[12px] font-bold border-b border-black mb-2 mt-2 uppercase">4. Экономика (на 1 тонну)</h2>
          
          <table className="w-full text-[11px] border-collapse border border-black">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 w-2/3 bg-gray-50 font-bold">Продажная цена (за 1 тн)</td>
                <td className="border border-black p-1.5 font-bold text-right">{formatCurrency(sellPriceNum)} руб.</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-50">- Стоимость заготовки</td>
                <td className="border border-black p-1.5 font-bold text-right">{formatCurrency(rawPriceNum)} руб.</td>
              </tr>
              {commercialStats && advancedRemnantStats && rawPriceNum > 0 && (
                <>
                  <tr>
                    <td className="border border-black p-1.5 bg-gray-50">
                      <span className="font-bold">- Прямые производственные затраты</span>
                      {commercialStats.economyData && commercialStats.economyData.filter(i => i.category === 'direct' && i.costPerTon > 0).length > 0 && (
                        <div className="text-[9px] text-gray-600 mt-0.5 leading-tight">
                          В т.ч.: {commercialStats.economyData.filter(i => i.category === 'direct' && i.costPerTon > 0).map(i => `${i.name} (${formatCurrency(i.costPerTon)} ₽)`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="border border-black p-1.5 font-bold text-right align-middle">{formatCurrency(commercialStats.totalProcessingCostsPerTon)} руб.</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <span className="font-bold">- Затраты на отходы (1 тн)</span>
                      <div className="text-[10px] text-gray-700 mt-1 italic">
                        Лом: {formatCurrency(advancedRemnantStats.techValuePerTon)} руб. | Остаток: {formatCurrency(advancedRemnantStats.remValuePerTon)} руб.
                      </div>
                    </td>
                    <td className="border border-black p-1.5 font-bold text-right align-middle">{formatCurrency(commercialStats.lossesPerTon)} руб.</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-bold text-green-800 bg-green-50">
                      <span>+ Возврат лома и остатков</span>
                    </td>
                    <td className="border border-black p-1.5 font-bold text-right text-green-800 bg-green-50">{formatCurrency(commercialStats.scrapRevenuePerTon)} руб.</td>
                  </tr>
                  <tr className={commercialStats.isPositive ? "bg-green-100" : "bg-red-100"}>
                    <td className="border border-black p-2 font-bold uppercase text-[12px]">Маржа расчетная (на 1 тн, без НДС)</td>
                    <td className="border border-black p-2 font-bold text-right text-[13px] whitespace-nowrap">
                       {commercialStats.isPositive ? "+" : ""}{formatCurrency(commercialStats.profitPerTon)} руб. 
                       <span className="ml-1">({commercialStats.isPositive ? "+" : ""}{commercialStats.marginPercent.toFixed(1)}%)</span>
                    </td>
                  </tr>
                  <tr className="bg-gray-100 italic">
                    <td className="border border-black p-1.5 text-[10px] uppercase">Итого прибыль на весь заказ ({orderWeight} тн)</td>
                    <td className="border border-black p-1.5 text-right font-bold text-[12px]">{formatCurrency(commercialStats.profitTotal)} руб.</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </section>

        {/* FOOTER */}
        <div className="mt-10 pt-4">
           <div className="w-[60%]">
             <div className="flex items-end gap-2 mb-2">
                <span className="font-bold text-[11px] whitespace-nowrap">Ответственный менеджер:</span>
                <div className="border-b border-black flex-1 border-dashed"></div>
                <span className="text-[11px] w-24 text-center">/ ФИО /</span>
             </div>
             <div className="flex items-end gap-2">
                <span className="font-bold text-[11px] whitespace-nowrap">Согласовано (Руководитель):</span>
                <div className="border-b border-black flex-1 border-dashed"></div>
                <span className="text-[11px] w-24 text-center">/ ФИО /</span>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
