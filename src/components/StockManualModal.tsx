import React from "react";
import { X, BookOpen, CheckCircle2, Info, FileSpreadsheet, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StockManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StockManualModal({ isOpen, onClose }: StockManualModalProps) {
  const steps = [
    {
      title: "Подготовка источника",
      description: "Скачайте реестр наличия заготовки (г/к проката) из вашей учетной системы, базы данных или Excel-файла склада.",
      icon: <FileSpreadsheet className="w-5 h-5 text-sky-500" />
    },
    {
      title: "Важные столбцы",
      description: "Для корректной работы в файле обязательно должны присутствовать столбцы 'Номенклатура' (или 'Наименование') и 'Конечный остаток' (Или 'Кол-во', 'Остаток'). Система распознает названия столбцов по частичному совпадению. Остальные данные (профиль, марка, размер, длина) извлекутся из названия номенклатуры автоматически.",
      icon: <Info className="w-5 h-5 text-blue-500" />
    },
    {
      title: "Загрузка файла",
      description: "Перетащите подготовленный файл в область загрузки или нажмите на нее, чтобы выбрать файл на компьютере.",
      icon: <Upload className="w-5 h-5 text-indigo-500" />
    },
    {
      title: "Что получаем",
      description: "Система автоматически прочитает и разнесет данные из 'Номенклатуры'. Вы получите структурированную таблицу прямо в интерфейсе для дальнейшего расчета потребностей.",
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
                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C19] dark:text-white leading-tight">
                    Инструкция по складу 
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Как загружать и обрабатывать наличие заготовки
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
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Как система разносит Номенклатуру
                </h4>
                <p className="text-sm text-slate-400 mb-4 font-medium">
                  Система автоматически прочитает столбец "Номенклатура" загруженного файла и распределит данные по следующим столбцам:  
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Профиль:</strong> определяем вид профиля (например, 'круг' или 'шестигранник').
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                     <div className="mt-1.5 w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">НТД ГОСТ на марку / ГОСТ 2590-2006:</strong> определяем ГОСТ по марке и стандартам проката.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                     <div className="mt-1.5 w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Марка стали:</strong> вытягиваем марку стали (например, 'ст.35' или 'ст.40Х').
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                     <div className="mt-1.5 w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Длина (Н/Д, М/Д):</strong> система извлекает числовое значение длины. Если в названии указано <strong className="text-sky-400">НД</strong> или пометка длины отсутствует, устанавливается значение <strong className="text-sky-400">6000</strong>.
                    </p>
                  </li>
                  <li className="flex items-start gap-3 border-t border-slate-700/50 pt-4 mt-2">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-emerald-400">Конечный остаток:</strong> Точный перенос объема из файла в числовом формате.
                    </p>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 dark:bg-slate-800 rounded-[24px] p-6 text-white shadow-xl mt-6">
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-4 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Правила распределения наличия заготовки (КИМ)
                </h4>
                <p className="text-sm text-slate-400 mb-4 font-medium">
                  При расчете наличия заготовки по заказам действуют автоматические правила оптимизации:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Правило 1 (МД заготовка):</strong> Если заготовка имеет мерную длину (МД), отличную от 6000 мм, наивысший приоритет отдается заказам с назначением МД по наибольшему значению КИМ.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90 text-slate-200">
                      <strong className="text-white">Правило 2 (НД и МД 6000 заготовка):</strong> Заготовки с длиной МД 6000, НД или Н/Д в первую очередь распределяются по заказам с НД (3000-6000), НД и Н/Д, а уже затем на заказы с МД.
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-12 h-12 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-sky-600/20"
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
