import { DEFAULT_RAW_PRICES, sanitizeKey, DEFAULT_ECONOMY_ITEMS } from "./lib/constants";
import { app as firebaseApp, auth, db, appId } from "./lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { AdminPanel } from "./components/AdminPanel";
import { CalculatorApp } from "./components/CalculatorApp";
import { LoginScreen } from "./components/LoginScreen";
import { PrintTemplate } from "./components/PrintTemplate";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "./lib/utils";

export default function App() {
  const [view, setView] = useState<"login" | "manager" | "admin" | "purchasing">("login");
  const [user, setUser] = useState<any>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("arsenal_theme");
      return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("arsenal_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      window.localStorage.setItem("arsenal_theme", "light");
    }
  }, [isDarkMode]);

  // Global prices
  const [globalRawPrices, setGlobalRawPrices] = useState<Record<string, { md: string; nd: string }>>(DEFAULT_RAW_PRICES);
  const [globalScrapPrice, setGlobalScrapPrice] = useState("20000");
  const [globalRemnantPrice, setGlobalRemnantPrice] = useState("30000");
  const [customGrades, setCustomGrades] = useState<string[]>([]);
  const [remnantPricing, setRemnantPricing] = useState<Record<string, { round: string; hex: string }>>({});
  const [economyItems, setEconomyItems] = useState<any[]>(DEFAULT_ECONOMY_ITEMS);

  useEffect(() => {
    // Just assume connected automatically
    setUser({ uid: "local-user" });
    setIsCloudActive(true);
    setIsConnecting(false);

    const handleOnline = () => {
      setIsCloudActive(true);
      setConnectionError(null);
    };
    const handleOffline = () => {
      setIsCloudActive(false);
      setConnectionError("Нет подключения к интернету");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      if (typeof window !== "undefined") {
        const savedRaw = window.localStorage.getItem("arsenal_raw_prices");
        const savedScrap = window.localStorage.getItem("arsenal_scrap_price");
        const savedRemnant = window.localStorage.getItem("arsenal_remnant_price");
        const savedCustomGrades = window.localStorage.getItem("arsenal_custom_grades");
        const savedRemnantPricing = window.localStorage.getItem("arsenal_remnant_pricing");
        const savedEconomy = window.localStorage.getItem("arsenal_economy_items");

        let loadedCustomGrades: string[] = [];
        if (savedCustomGrades) {
          loadedCustomGrades = JSON.parse(savedCustomGrades);
          setCustomGrades(loadedCustomGrades);
        }

        if (savedRemnantPricing) {
          setRemnantPricing(JSON.parse(savedRemnantPricing));
        }

        if (savedEconomy) {
          const parsed = JSON.parse(savedEconomy);
          const initialMap = new Map(parsed.map((item: any) => [item.id, item]));
          setEconomyItems(DEFAULT_ECONOMY_ITEMS.map(defaultItem => initialMap.get(defaultItem.id) || defaultItem));
        }

        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          const loadedPrices = { ...DEFAULT_RAW_PRICES };
          const allG = [...Object.keys(DEFAULT_RAW_PRICES), ...loadedCustomGrades];
          allG.forEach((grade) => {
            if (parsed[grade] !== undefined) {
              if (typeof parsed[grade] === 'string') {
                loadedPrices[grade] = { md: parsed[grade], nd: parsed[grade] };
              } else {
                loadedPrices[grade] = parsed[grade];
              }
            }
          });
          setGlobalRawPrices(loadedPrices);
        }
        if (savedScrap) setGlobalScrapPrice(savedScrap);
        if (savedRemnant) setGlobalRemnantPrice(savedRemnant);
      }
    } catch (e) {}

    if (db && isCloudActive) {
      const pricesDocRef = doc(db, "settings", "prices");
      const unsubscribe = onSnapshot(
        pricesDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            let currentCustomGrades = customGrades;
            if (data.customGrades) {
              currentCustomGrades = data.customGrades;
              setCustomGrades(currentCustomGrades);
              if (typeof window !== "undefined") window.localStorage.setItem("arsenal_custom_grades", JSON.stringify(currentCustomGrades));
            }

            if (data.remnantPricing) {
              setRemnantPricing(data.remnantPricing);
              if (typeof window !== "undefined") window.localStorage.setItem("arsenal_remnant_pricing", JSON.stringify(data.remnantPricing));
            }

            if (data.economyItems) {
               const initialMap = new Map(data.economyItems.map((item: any) => [item.id, item]));
               const merged = DEFAULT_ECONOMY_ITEMS.map(defaultItem => initialMap.get(defaultItem.id) || defaultItem);
               setEconomyItems(merged);
               if (typeof window !== "undefined") window.localStorage.setItem("arsenal_economy_items", JSON.stringify(merged));
            }

            if (data.rawPrices) {
              const loadedPrices = { ...DEFAULT_RAW_PRICES };
              const allG = [...Object.keys(DEFAULT_RAW_PRICES), ...currentCustomGrades];
              allG.forEach((grade) => {
                const dbKey = sanitizeKey(grade);
                if (data.rawPrices[dbKey] !== undefined) {
                  const val = data.rawPrices[dbKey];
                  if (typeof val === 'string') {
                    loadedPrices[grade] = { md: val, nd: val };
                  } else {
                    loadedPrices[grade] = val;
                  }
                }
              });
              setGlobalRawPrices(loadedPrices);
              if (typeof window !== "undefined") window.localStorage.setItem("arsenal_raw_prices", JSON.stringify(loadedPrices));
            }
            if (data.scrapPrice !== undefined) {
              setGlobalScrapPrice(data.scrapPrice);
              if (typeof window !== "undefined") window.localStorage.setItem("arsenal_scrap_price", data.scrapPrice);
            }
            if (data.remnantPrice !== undefined) {
              setGlobalRemnantPrice(data.remnantPrice);
              if (typeof window !== "undefined") window.localStorage.setItem("arsenal_remnant_price", data.remnantPrice);
            }
          }
        },
        (error) => {
          console.warn("Облако недоступно, работаем локально:", error);
          handleFirestoreError(error, OperationType.GET, "settings/prices");
          setIsCloudActive(false);
        }
      );
      return () => unsubscribe();
    }
  }, [user, isCloudActive]);

  const handleSaveGlobal = async (
    rawPricesObj: Record<string, { md: string; nd: string }>,
    scrapStr: string,
    remnantStr: string,
    cGrades: string[],
    rPricing: Record<string, { round: string; hex: string }>,
    eItems?: any[]
  ) => {
    setGlobalRawPrices(rawPricesObj);
    setGlobalScrapPrice(scrapStr);
    setGlobalRemnantPrice(remnantStr);
    if (cGrades) setCustomGrades(cGrades);
    if (rPricing) setRemnantPricing(rPricing);
    if (eItems) setEconomyItems(eItems);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("arsenal_raw_prices", JSON.stringify(rawPricesObj));
        window.localStorage.setItem("arsenal_scrap_price", scrapStr);
        window.localStorage.setItem("arsenal_remnant_price", remnantStr);
        if (cGrades) window.localStorage.setItem("arsenal_custom_grades", JSON.stringify(cGrades));
        if (rPricing) window.localStorage.setItem("arsenal_remnant_pricing", JSON.stringify(rPricing));
        if (eItems) window.localStorage.setItem("arsenal_economy_items", JSON.stringify(eItems));
      }
    } catch (e) {}

    if (db && isCloudActive) {
      const firestoreRawPrices: Record<string, { md: string; nd: string }> = {};
      for (const [k, v] of Object.entries(rawPricesObj)) {
        firestoreRawPrices[sanitizeKey(k)] = v;
      }
      const payload: any = {
        rawPrices: firestoreRawPrices,
        scrapPrice: scrapStr,
        remnantPrice: remnantStr,
        updatedAt: new Date().toISOString()
      };
      if (cGrades) payload.customGrades = cGrades;
      if (rPricing) payload.remnantPricing = rPricing;
      if (eItems) payload.economyItems = eItems;

      const pricesDocRef = doc(db, "settings", "prices");
      try {
        await setDoc(pricesDocRef, payload, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "settings/prices");
      }
    }
  };

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  return (
    <>
      {printData && (
        <PrintTemplate 
          reportData={printData.reportData}
          orderWeight={printData.orderWeight}
          selectedTarget={printData.selectedTarget}
          printText={printData.reportText}
        />
      )}
      <div className="min-h-screen bg-[#F0F4F4] dark:bg-[#111310] flex flex-col font-sans print:hidden">
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <LoginScreen 
                onManagerLogin={() => setView("manager")} 
                onPurchasingLogin={() => setView("purchasing")}
                onAdminLogin={() => setView("admin")} 
                isCloudActive={isCloudActive}
                isConnecting={isConnecting}
                connectionError={connectionError}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
              />
            </motion.div>
          )}

          {view === "admin" && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-8">
                <AdminPanel
                  initialRawPrices={globalRawPrices}
                  initialScrap={globalScrapPrice}
                  initialRemnant={globalRemnantPrice}
                  initialCustomGrades={customGrades}
                  initialRemnantPricing={remnantPricing}
                  initialEconomyItems={economyItems}
                  onSave={handleSaveGlobal}
                  onLogout={() => setView("login")}
                  isCloudActive={isCloudActive}
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                />
              </div>
            </motion.div>
          )}

          {view === "purchasing" && (
            <motion.div 
              key="purchasing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-8">
                <AdminPanel
                  initialRawPrices={globalRawPrices}
                  initialScrap={globalScrapPrice}
                  initialRemnant={globalRemnantPrice}
                  initialCustomGrades={customGrades}
                  initialRemnantPricing={remnantPricing}
                  initialEconomyItems={economyItems}
                  onSave={handleSaveGlobal}
                  onLogout={() => setView("login")}
                  isCloudActive={isCloudActive}
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                  initialTab="supply"
                  isPurchasingMode={true}
                />
              </div>
            </motion.div>
          )}

          {view === "manager" && (
            <motion.div 
              key="manager"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
                <CalculatorApp
                  adminRawPrices={globalRawPrices}
                  adminScrapPrice={globalScrapPrice}
                  adminRemnantPrice={globalRemnantPrice}
                  customGrades={customGrades}
                  remnantPricing={remnantPricing}
                  economyItems={economyItems}
                  onLogout={() => setView("login")}
                  isCloudActive={isCloudActive}
                  user={user}
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                  onAdminSwitch={() => setView("login")}
                  onPrintDataUpdate={setPrintData}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
