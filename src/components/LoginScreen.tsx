import { Calculator, Key, Lock, Moon, Package, Sun, User } from "lucide-react";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoginScreenProps {
  onManagerLogin: () => void;
  onPurchasingLogin: () => void;
  onAdminLogin: () => void;
  onGoogleLogin?: () => void;
  isCloudActive: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export function LoginScreen({ 
  onManagerLogin, 
  onPurchasingLogin, 
  onAdminLogin, 
  onGoogleLogin,
  isCloudActive, 
  isConnecting,
  connectionError,
  isDarkMode, 
  toggleTheme 
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "trushin" && password === "rfhectkm") {
      setError(false);
      onAdminLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F4F5F4] dark:bg-[#121411] transition-colors duration-300 relative overflow-hidden">
      {/* Background blobs for depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full" />

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-3 rounded-full bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all z-50 focus:outline-none"
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-6 w-full max-w-md relative z-10"
      >
        
        <div className="flex flex-col items-center mb-6 text-center">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-16 h-16 bg-slate-800 dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-xl mb-4 text-white"
          >
            <Calculator className="w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl tracking-tight text-[#1A1C19] dark:text-white mb-2 font-light"
          >
            Система расчетов
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#43483F] dark:text-slate-400 font-semibold tracking-[0.2em] uppercase text-[10px]"
          >
            ООО "ЗМК Арсенал"
          </motion.p>
        </div>

        <div className="space-y-6">
          {/* Manager Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white dark:bg-[#1A1C19] p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center group transition-colors"
          >
            <div className="flex items-center gap-3 mb-3 justify-center">
              <User className="w-6 h-6 text-slate-700 dark:text-slate-400" strokeWidth={1.5} />
              <h2 className="text-xl font-medium text-[#1A1C19] dark:text-white">Вход для менеджеров по продажам</h2>
            </div>
            <p className="text-sm text-[#43483F] dark:text-slate-400 mb-6 leading-relaxed text-center opacity-80">
              Доступ к калькулятору для расчета производственных параметров и экономики заказов.
            </p>
            <button
              onClick={onManagerLogin}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-2xl h-14 px-6 text-sm font-semibold transition-all shadow-md active:scale-[0.98] focus:outline-none"
            >
              Войти в калькулятор
            </button>
          </motion.div>

          {/* Purchasing Manager Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white dark:bg-[#1A1C19] p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center group transition-colors"
          >
            <div className="flex items-center gap-3 mb-3 justify-center">
              <Package className="w-6 h-6 text-slate-700 dark:text-slate-400" strokeWidth={1.5} />
              <h2 className="text-xl font-medium text-[#1A1C19] dark:text-white">Вход для менеджеров по закупкам</h2>
            </div>
            <p className="text-sm text-[#43483F] dark:text-slate-400 mb-6 leading-relaxed text-center opacity-80">
              Доступ к разделу снабжения для управления закупками и складскими остатками.
            </p>
            <button
              onClick={onPurchasingLogin}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-2xl h-14 px-6 text-sm font-semibold transition-all shadow-md active:scale-[0.98] focus:outline-none"
            >
              Войти в снабжение
            </button>
          </motion.div>

          {/* Admin Card */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white dark:bg-[#1A1C19] p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center transition-colors"
          >
            <div className="flex items-center gap-3 mb-5 justify-center">
              <Key className="w-6 h-6 text-slate-700 dark:text-slate-400" strokeWidth={1.5} />
              <h2 className="text-xl font-medium text-[#1A1C19] dark:text-white">Вход для управления</h2>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4 w-full">
              <div className="space-y-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Логин"
                  className="w-full bg-[#f8f9f8] dark:bg-slate-800/50 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl px-5 h-14 text-base focus:border-slate-800 dark:focus:border-white focus:outline-none focus:ring-0 transition-all placeholder:text-slate-500"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  className="w-full bg-[#f8f9f8] dark:bg-slate-800/50 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl px-5 h-14 text-base focus:border-slate-800 dark:focus:border-white focus:outline-none focus:ring-0 transition-all placeholder:text-slate-500"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 dark:text-red-400 text-xs font-semibold px-2"
                  >
                    Неверный логин или пароль
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 border-2 border-slate-800/10 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl h-14 px-6 text-sm font-bold transition-all active:scale-[0.98] focus:outline-none mt-2"
              >
                Редактировать цены
              </button>
            </form>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className={`w-2 h-2 rounded-full ${
               isConnecting ? 'bg-amber-400 animate-pulse' : 
               isCloudActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
               'bg-slate-400'
             }`} />
             <span className={`text-[10px] font-bold uppercase tracking-widest ${isConnecting ? 'text-amber-500 dark:text-amber-400' : isCloudActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
               {isConnecting ? 'Подключение...' : isCloudActive ? 'CLOUD ACTIVE' : 'АВТОНОМНЫЙ РЕЖИМ'}
             </span>
             {!isConnecting && !isCloudActive && (
               <button 
                 onClick={() => window.location.reload()}
                 className="ml-2 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
               >
                 Подключиться
               </button>
             )}
          </div>
          {connectionError && !isCloudActive && !isConnecting && (
            <p className="mt-2 text-[10px] text-red-500 dark:text-red-400 max-w-[300px] mx-auto">
              Ошибка: {connectionError}
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
