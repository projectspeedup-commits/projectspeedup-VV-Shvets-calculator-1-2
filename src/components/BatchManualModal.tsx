import React from "react";
import { X, BookOpen, CheckCircle2, ChevronRight, Info, FileSpreadsheet, Download, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BatchManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BatchManualModal({ isOpen, onClose }: BatchManualModalProps) {
  const steps = [
    {
      title: "Подготовка источника",
      description: "Скачайте производственный план из вашей системы (например, из Google Таблиц 'План продаж') в формате Excel (.xlsx) или CSV.",
      icon: <FileSpreadsheet className="w-5 h-5 text-green-500" />
    },
    {
      title: "Важные столбцы",
      description: "Убедитесь, что в файле присутствуют следующие столбцы (система распознает их по частичному совпадению): 'Внутренняя нумерация' (или №), 'Марка', 'Размер', 'Номенклатура', 'Профиль', и 'Остаток к выполнению' (или 'Кол-во').",
      icon: <Info className="w-5 h-5 text-blue-500" />
    },
    {
      title: "Загрузка файла",
      description: "Перетащите подготовленный файл в область загрузки или нажмите на нее, чтобы выбрать файл на компьютере.",
      icon: <Upload className="w-5 h-5 text-indigo-500" />
    },
    {
      title: "Результат расчета",
      description: "Система автоматически рассчитает оптимальную заготовку для каждой позиции плана, подберет нужную длину и массу. Скачайте 'Заявку на сырье.xlsx' (для закупки) или 'Сводка_заготовка.xlsx' (для производства).",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#1A1C19] sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 dark:bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C19] dark:text-white leading-tight">
                    Инструкция по расчетам 
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Как рассчитывать планы производства (Excel/CSV)
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-hide">
              <div className="grid grid-cols-1 gap-6">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 sm:gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        {step.icon}
                      </div>
                      {idx !== steps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800 mt-2 rounded-full" />
                      )}
                    </div>
                    <div className="pt-1 pb-4">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 tracking-tight group-hover:translate-x-1 transition-transform">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 dark:bg-slate-800 rounded-[24px] p-6 text-white shadow-xl">
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-4 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Подробнее о столбцах
                </h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Остаток к выполнению:</strong> Главный показатель необходимого объема. Должен быть без формул, в числовом формате (в тоннах). Если значение меньше 0.001 (т.е. 0,000), строка будет автоматически пропущена.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Марка стали:</strong> Используется для определения коэффициентов или ГОСТов (например 'ст.45', 'ст.40Х'). Система автоматически применяет ГОСТ к марке.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Размер (мм):</strong> Размер желаемого профиля. Система подберет нужный размер заготовки по таблице (например, для круга 22мм нужна заготовка 24мм).
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Длина:</strong> Опционально. Если указана длина конечной детали (например 3000-6000), система вычислит идеальную длину заготовки, чтобы минимизировать остатки.
                    </p>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 dark:bg-slate-800 rounded-[24px] p-6 text-white shadow-xl mt-6">
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-4 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Правила оптимизации КИМ (Коэффициент Использования Металла)
                </h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Правило 1 (МД заготовка):</strong> Если заготовка имеет мерную длину (МД), отличную от 6000 мм, наивысший приоритет отдается заказам с назначением МД по наибольшему значению КИМ. Система распределяет такую заготовку по заказам, сортируя их по убыванию пользы от применения.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Правило 2 (НД и МД 6000 заготовка):</strong> Для заготовок с длиной МД 6000, НД или Н/Д высший приоритет отдается заказам с назначением НД (3000-6000, НД, Н/Д). Система сначала закрывает потребность в НД заказах, а остаток распределяет на заказы с МД.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Авто-улучшение:</strong> При расчете потребности с учетом наличия на складе, эти правила применяются автоматически даже до нажатия кнопки "Применить все улучшения КИМ".
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-12 h-12 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-slate-900/10"
              >
                Понятно, приступим!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
