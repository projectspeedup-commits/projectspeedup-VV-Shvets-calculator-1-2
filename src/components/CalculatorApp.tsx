import { DEFAULT_STEEL_GRADES, formatCurrency, formatInputValue, getGostForGrade, getLengthLabel, getProfileGost, handleNumericInput, HEX_DATA, ROUND_DATA, TECH_COEFS_ROUND, EconomyItem, DEFAULT_ECONOMY_ITEMS } from "../lib/constants";
import { AlertTriangle, ArrowRight, Briefcase, Calculator, Check, Circle, Copy, Hexagon, History, Info, Key, LogOut, Moon, Package, Printer, RotateCcw, Ruler, Save, Scale, Sun, Trash2, Wallet, TrendingUp, BarChart3, PieChart, Plus, Minus, BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PrintTemplate } from "./PrintTemplate";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/utils";

import { ConfirmModal } from "./ConfirmModal";
import { UserManualModal } from "./UserManualModal";

interface CalculatorAppProps {
  adminRawPrices: Record<string, { md: string; nd: string }>;
  adminScrapPrice: string;
  adminRemnantPrice: string;
  customGrades: string[];
  deletedGrades?: string[];
  remnantPricing: Record<string, { round: string; hex: string }>;
  economyItems?: EconomyItem[];
  onLogout: () => void;
  isCloudActive: boolean;
  user: any;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onAdminSwitch: () => void;
  onPrintDataUpdate: (data: any) => void;
}

export function CalculatorApp({
  adminRawPrices,
  adminScrapPrice,
  adminRemnantPrice,
  customGrades,
  deletedGrades = [],
  remnantPricing,
  economyItems = DEFAULT_ECONOMY_ITEMS,
  onLogout,
  isCloudActive,
  user,
  isDarkMode,
  toggleTheme,
  onAdminSwitch,
  onPrintDataUpdate,
}: CalculatorAppProps) {
  const [profileType, setProfileType] = useState<"round" | "hex">("round");
  const [steelGrade, setSteelGrade] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedRaw, setSelectedRaw] = useState("");
  const [orderWeight, setOrderWeight] = useState("");

  const [lengthInput, setLengthInput] = useState({ value: "6000", source: "raw" });
  const [orderedLength, setOrderedLength] = useState("6000");

  const [frontCoef, setFrontCoef] = useState("1.027");
  const [backCoef, setBackCoef] = useState("1.003");

  const [sellPrice, setSellPrice] = useState("");

  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isEconomyExpanded, setIsEconomyExpanded] = useState(false);

  const activeData = profileType === "round" ? ROUND_DATA : HEX_DATA;
  const allGrades = useMemo(() => {
    return [...DEFAULT_STEEL_GRADES, ...(customGrades || [])].filter(g => !deletedGrades.includes(g));
  }, [customGrades, deletedGrades]);

  const currentAdminRawPrice = useMemo(() => {
    if (!steelGrade || !adminRawPrices) return "";
    const prices = adminRawPrices[steelGrade];
    if (!prices) return "";
    
    // Auto-select MD or ND based on ordered length
    const label = getLengthLabel(orderedLength);
    const isMD = label.startsWith("МД");
    return isMD ? prices.md : prices.nd;
  }, [steelGrade, adminRawPrices, orderedLength]);

  const currentRemnantPricingRule = useMemo(() => {
    if (!steelGrade) return "remnant";
    return remnantPricing && remnantPricing[steelGrade] && remnantPricing[steelGrade][profileType]
      ? remnantPricing[steelGrade][profileType]
      : "remnant";
  }, [steelGrade, profileType, remnantPricing]);

  const effectiveRemnantPrice = useMemo(() => {
    return currentRemnantPricingRule === "scrap" ? adminScrapPrice : adminRemnantPrice;
  }, [currentRemnantPricingRule, adminScrapPrice, adminRemnantPrice]);

  const targetOptions = useMemo(() => {
    const targets = activeData.map((item) => item.target);
    return [...new Set(targets)].sort((a, b) => a - b);
  }, [activeData]);

  const rawOptions = useMemo(() => {
    if (!selectedTarget) return [];
    const targetVal = Number(selectedTarget);
    return activeData
      .filter((item) => {
        if (item.target !== targetVal) return false;
        // Business logic: if target >= 50.5, raw material should be no more than 3mm above target
        if (profileType === "round" && targetVal >= 50.5 && item.raw > targetVal + 3) {
          return false;
        }
        return true;
      })
      .map((item) => item.raw)
      .sort((a, b) => a - b);
  }, [selectedTarget, activeData, profileType]);

  const currentCoefficient = useMemo(() => {
    if (!selectedTarget || !selectedRaw) return null;
    const targetVar = Number(selectedTarget);
    const rawVar = Number(selectedRaw);

    // Try to find exact match in data tables first (preserves proprietary/manual coefficients)
    const match = activeData.find(
      (item) => item.target === targetVar && item.raw === rawVar
    );
    if (match) return match.coef;

    // Physical rule fallback: Area ratio
    // For Rounds it's (D_raw/D_target)^2
    // For Hex it depends if it's Round-to-Hex or Hex-to-Hex.
    // Based on HEX_DATA coefs (mostly ~1.22), it seems to be a specific technical rule.
    // But since we restored the table lookup, the standard cases are covered.
    return Math.pow(rawVar, 2) / Math.pow(targetVar, 2);
  }, [selectedTarget, selectedRaw, activeData]);

  useEffect(() => {
    if (selectedTarget && selectedRaw) {
      if (profileType === "round") {
        const target = Number(selectedTarget);
        const key = `${selectedTarget}_${selectedRaw}`;

        if (TECH_COEFS_ROUND[key]) {
          setFrontCoef(TECH_COEFS_ROUND[key][0].toString());
          setBackCoef(TECH_COEFS_ROUND[key][1].toString());
        } else if (target > 50) {
          let fCoef = 1.032;
          if (target > 50 && target <= 54) fCoef = 1.033;
          else if (target > 54 && target <= 58) fCoef = 1.034;
          else if (target > 58) fCoef = 1.035;

          setFrontCoef(fCoef.toFixed(3));
          setBackCoef("1.003");
        } else {
          setFrontCoef("1.027");
          setBackCoef("1.003");
        }
      } else {
        setFrontCoef("1.030");
        setBackCoef("1.003");
      }
    }
  }, [selectedTarget, selectedRaw, profileType]);

  useEffect(() => {
    setSelectedTarget("");
    setSelectedRaw("");
  }, [profileType]);

  useEffect(() => {
    if (rawOptions.length > 0) {
      const targetVal = Number(selectedTarget);
      // Try to find the exact "standard" billet for this target in activeData
      const standardMatch = activeData.find(item => item.target === targetVal);
      
      if (standardMatch && rawOptions.includes(standardMatch.raw)) {
        setSelectedRaw(standardMatch.raw.toString());
      } else if (!selectedRaw || !rawOptions.includes(Number(selectedRaw))) {
        // Fallback: select the first option if nothing is selected or current selection is invalid
        setSelectedRaw(rawOptions[0].toString());
      }
    } else {
      setSelectedRaw("");
    }
  }, [selectedTarget, rawOptions, activeData]);

  const currentDrawCoef = useMemo(() => {
    return currentCoefficient;
  }, [currentCoefficient]);

  const displayedRawLength =
    lengthInput.source === "raw"
      ? lengthInput.value
      : lengthInput.value && currentDrawCoef
      ? (Number(lengthInput.value) / currentDrawCoef).toFixed(1)
      : "";

  const displayedTargetLength =
    lengthInput.source === "target"
      ? lengthInput.value
      : lengthInput.value && currentDrawCoef
      ? (Number(lengthInput.value) * currentDrawCoef).toFixed(1)
      : "";

  const totalTechCoef = useMemo(() => {
    const f = Number(frontCoef) || 1;
    const b = Number(backCoef) || 1;
    return f * b;
  }, [frontCoef, backCoef]);

  const lengthAfterTechEnds = useMemo(() => {
    const draw = Number(displayedTargetLength);
    if (!isNaN(draw) && draw > 0 && totalTechCoef > 0) {
      return (draw / totalTechCoef).toFixed(1);
    }
    return "";
  }, [displayedTargetLength, totalTechCoef]);

  const techEndsMm = useMemo(() => {
    const draw = Number(displayedTargetLength);
    const after = Number(lengthAfterTechEnds);
    if (!isNaN(draw) && !isNaN(after) && draw > after) {
      return (draw - after).toFixed(1);
    }
    return "";
  }, [displayedTargetLength, lengthAfterTechEnds]);

  const piecesPerBar = useMemo(() => {
    if (lengthAfterTechEnds && orderedLength) {
      const usable = Number(lengthAfterTechEnds);
      const order = Number(orderedLength);
      return order > 0 && usable >= order ? Math.floor(usable / order) : 0;
    }
    return 0;
  }, [lengthAfterTechEnds, orderedLength]);

  const remnantLength = useMemo(() => {
    if (lengthAfterTechEnds && orderedLength) {
      const usable = Number(lengthAfterTechEnds);
      const order = Number(orderedLength);
      if (isNaN(usable) || isNaN(order)) return "";
      if (order > usable) return (usable - order).toFixed(1);
      return (usable - order * piecesPerBar).toFixed(1);
    }
    return "";
  }, [lengthAfterTechEnds, orderedLength, piecesPerBar]);

  const optimalLengths = useMemo(() => {
    if (!lengthAfterTechEnds) return [];
    const target = Number(lengthAfterTechEnds);
    if (isNaN(target) || target <= 0) return [];

    const options = [];
    for (let i = 1; i <= 20; i++) {
      const optLen = Math.floor(target / i) - 5;
      if (optLen >= 2500 && optLen <= 6500) {
        options.push({ pieces: i, length: optLen });
      }
    }

    const currentOrder = Number(orderedLength);
    if (!isNaN(currentOrder) && currentOrder > 0) {
      options.sort((a, b) => Math.abs(a.length - currentOrder) - Math.abs(b.length - currentOrder));
    }

    return options.slice(0, 4);
  }, [lengthAfterTechEnds, orderedLength]);

  const optimalBilletLengths = useMemo(() => {
    if (!orderedLength || !currentDrawCoef || !totalTechCoef) return [];
    
    let isND = orderedLength.toUpperCase().includes("НД") || orderedLength.toUpperCase().includes("Н/Д");
    const targetPiece = Number(orderedLength);
    
    if (!isND && (isNaN(targetPiece) || targetPiece <= 0)) return [];

    const draw = currentDrawCoef;
    const tech = totalTechCoef;
    const options = [];
    const maxBillet = Math.floor(8400 / draw);
    const maxAllowedBillet = Math.min(6000, maxBillet);

    if (isND) {
       for (let b = 4000; b <= maxAllowedBillet; b += 100) {
          const estUseful = (b * draw) / tech;
          let bestScrapForB = 999999;
          let bestN = 0;
          for (let i = 1; i <= 20; i++) {
             const optLen = Math.floor(estUseful / i) - 5;
             if (optLen >= 3000 && optLen <= 6000) {
                 const scrap = estUseful - (i * optLen);
                 if (scrap >= 0 && scrap < bestScrapForB) {
                     bestScrapForB = scrap;
                     bestN = i;
                 }
             }
          }
          if (bestN > 0) {
             options.push({ n: bestN, billetLength: b, scrap: bestScrapForB });
          }
       }
    } else {
      // Пробуем разное количество деталей (n), чтобы найти подходящие длины заготовок
      for (let n = 1; n <= 60; n++) {
        const idealBillet = (n * targetPiece * tech) / draw;
        // Округляем вверх до ближайших 100 мм (согласно запросу)
        const roundedBillet = Math.ceil(idealBillet / 100) * 100;
        
        if (roundedBillet >= 4000 && roundedBillet <= maxAllowedBillet) {
          const estUseful = (roundedBillet * draw) / tech;
          const scrap = estUseful - (n * targetPiece);
          // Добавляем только если остаток положительный (поместится)
          if (scrap >= 0) {
            options.push({ n, billetLength: roundedBillet, scrap });
          }
        }
      }
    }
    // Сортируем по минимальному остатку и берем топ-3 уникальных длин
    const uniqueOptions = Array.from(new Map(options.map(item => [item.billetLength, item])).values());
    return uniqueOptions.sort((a, b) => a.scrap - b.scrap).slice(0, 3);
  }, [orderedLength, currentDrawCoef, totalTechCoef]);

  const requiredWeight = useMemo(() => {
    if (!orderWeight) return null;
    const baseWeight = Number(orderWeight);
    if (isNaN(baseWeight) || baseWeight <= 0) return null;

    // Use the KIM-based rule: Total Weight = Order Weight / KIM
    // KIM = usefulLength / drawLength
    if (piecesPerBar > 0 && orderedLength && Number(orderedLength) > 0 && displayedTargetLength) {
      const usefulLength = Number(orderedLength) * piecesPerBar;
      const drawLength = Number(displayedTargetLength);
      
      if (drawLength > 0) {
        const kim = usefulLength / drawLength;
        const val = baseWeight / (kim > 0 ? kim : 1);
        return isNaN(val) ? baseWeight.toFixed(3) : val.toFixed(3);
      }
    }
    
    // If drawing dimensions are not fully set, we cannot calculate
    // the required weight accurately. Don't default to 1:1.
    if (!displayedTargetLength || piecesPerBar === 0) return null;

    return baseWeight.toFixed(3);
  }, [orderWeight, piecesPerBar, orderedLength, displayedTargetLength]);

  const consumptionCoefficient = useMemo(() => {
    if (requiredWeight && orderWeight && Number(orderWeight) > 0) {
      return Number(requiredWeight) / Number(orderWeight);
    }
    return currentCoefficient || null;
  }, [requiredWeight, orderWeight, currentCoefficient]);

  const orderedBarWeight = useMemo(() => {
    if (!orderedLength || Number(orderedLength) <= 0 || !selectedTarget) return null;
    const lengthMm = Number(orderedLength);
    const sizeMm = Number(selectedTarget);
    const area =
      profileType === "round"
        ? (Math.PI * Math.pow(sizeMm, 2)) / 4
        : (Math.sqrt(3) / 2) * Math.pow(sizeMm, 2);
    const weightKg = area * lengthMm * 0.00000785;
    return { tons: (weightKg / 1000).toFixed(5), kg: weightKg.toFixed(2) };
  }, [orderedLength, selectedTarget, profileType]);

  const piecesPerTon = useMemo(() => {
    if (!orderedBarWeight || Number(orderedBarWeight.kg) === 0) return 0;
    return Math.floor(1000 / Number(orderedBarWeight.kg));
  }, [orderedBarWeight]);

  const totalPiecesInOrder = useMemo(() => {
    if (!orderWeight || !orderedBarWeight || Number(orderedBarWeight.kg) === 0) return 0;
    return Math.floor((Number(orderWeight) * 1000) / Number(orderedBarWeight.kg));
  }, [orderWeight, orderedBarWeight]);

  const remnantWeight = useMemo(() => {
    if (!remnantLength || Number(remnantLength) <= 0 || !selectedTarget) return null;
    const lengthMm = Number(remnantLength);
    const sizeMm = Number(selectedTarget);
    const area =
      profileType === "round"
        ? (Math.PI * Math.pow(sizeMm, 2)) / 4
        : (Math.sqrt(3) / 2) * Math.pow(sizeMm, 2);
    const weightKg = area * lengthMm * 0.00000785;
    return { tons: (weightKg / 1000).toFixed(5), kg: weightKg.toFixed(2) };
  }, [remnantLength, selectedTarget, profileType]);

  const remnantValue = useMemo(() => {
    if (!remnantWeight || !effectiveRemnantPrice) return null;
    const val = Number(remnantWeight.tons) * Number(effectiveRemnantPrice);
    return isNaN(val) ? null : val.toFixed(2);
  }, [remnantWeight, effectiveRemnantPrice]);

  const advancedRemnantStats = useMemo(() => {
    const hasRemnant =
      remnantLength && Number(remnantLength) > 0 && orderedLength && Number(orderedLength) > 0 && piecesPerBar > 0;
    const hasTechScrap = techEndsMm && Number(techEndsMm) > 0;

    if (!hasRemnant && !hasTechScrap) return null;

    const productMm = orderedLength && piecesPerBar > 0 ? Number(orderedLength) * piecesPerBar : 0;
    if (productMm === 0) return null;

    const rawRemMm = hasRemnant ? Number(remnantLength) : 0;
    const rawTechMm = hasTechScrap ? Number(techEndsMm) : 0;

    const rawRemRatio = rawRemMm / productMm;
    const rawTechRatio = rawTechMm / productMm;
    const totalRatio = rawRemRatio + rawTechRatio;

    const remRatio = rawRemRatio;
    const techRatio = rawTechRatio;

    const kgPerTon = totalRatio * 1000;
    const tonsPerTon = totalRatio;
    const valuePerTon = currentAdminRawPrice ? totalRatio * Number(currentAdminRawPrice) : 0;

    const techValuePerTon = currentAdminRawPrice ? techRatio * Number(currentAdminRawPrice) : 0;
    const remValuePerTon = currentAdminRawPrice ? remRatio * Number(currentAdminRawPrice) : 0;

    const remnantRevenuePerTon = remRatio * Number(effectiveRemnantPrice || 0);
    const techScrapRevenuePerTon = techRatio * Number(adminScrapPrice || 0);
    const revenuePerTon = remnantRevenuePerTon + techScrapRevenuePerTon;

    let orderScrapTons = 0,
      orderScrapValue = null,
      orderRevenue = 0;
    let orderTechTons = 0,
      orderRemTons = 0;
    let orderTechValue = null,
      orderRemValue = null;
    let orderTechRevenue = 0,
      orderRemRevenue = 0;

    if (orderWeight && Number(orderWeight) > 0) {
      const w = Number(orderWeight);
      orderScrapTons = totalRatio * w;
      orderTechTons = techRatio * w;
      orderRemTons = remRatio * w;

      if (currentAdminRawPrice) {
        orderScrapValue = orderScrapTons * Number(currentAdminRawPrice);
        orderTechValue = orderTechTons * Number(currentAdminRawPrice);
        orderRemValue = orderRemTons * Number(currentAdminRawPrice);
      }

      orderTechRevenue = techScrapRevenuePerTon * w;
      orderRemRevenue = remnantRevenuePerTon * w;
      orderRevenue = revenuePerTon * w;
    }

    return {
      kgPerTon: kgPerTon.toFixed(1),
      tonsPerTon: tonsPerTon.toFixed(3),
      techTonsPerTon: techRatio,
      remTonsPerTon: remRatio,
      valuePerTon: valuePerTon !== null ? valuePerTon.toFixed(2) : null,
      techValuePerTon,
      remValuePerTon,
      revenuePerTon,
      techScrapRevenuePerTon,
      remnantRevenuePerTon,

      orderScrapTons: orderScrapTons.toFixed(3),
      orderTechTons,
      orderRemTons,
      orderScrapValue: orderScrapValue !== null ? orderScrapValue.toFixed(2) : null,
      orderTechValue,
      orderRemValue,
      orderRevenue,
      orderTechRevenue,
      orderRemRevenue,
    };
  }, [remnantLength, orderedLength, currentAdminRawPrice, adminScrapPrice, effectiveRemnantPrice, orderWeight, piecesPerBar, techEndsMm]);

  const commercialStats = useMemo(() => {
    if (!sellPrice || !currentAdminRawPrice || !orderWeight) return null;
    const sPrice = Number(sellPrice);
    const rPrice = Number(currentAdminRawPrice);
    const weight = Number(orderWeight);
    if (isNaN(sPrice) || isNaN(rPrice) || isNaN(weight)) return null;

    // Calculate detailed economy costs from economyItems
    const economyData = economyItems.map(item => {
      let costPerTon = 0;
      if (item.type === 'variable') {
        // Now treating "norm" field as the absolute cost per ton for direct costs
        costPerTon = Number(item.norm) || 0;
      } else {
        // Fixed costs distributed over the order weight (simplified logic)
        // In a real scenario, fixed costs are distributed over monthly volume, but here we can show it per order total
        costPerTon = ((Number(item.quantity) || 0) * (Number(item.price) || 0)) / weight;
      }
      return { ...item, costPerTon };
    });

    const directEconomyCostsPerTon = economyData.filter(i => i.category === 'direct').reduce((acc, curr) => acc + curr.costPerTon, 0);
    const overheadEconomyCostsPerTon = economyData.filter(i => i.category === 'overhead').reduce((acc, curr) => acc + curr.costPerTon, 0);
    
    const totalProcessingCostsPerTon = directEconomyCostsPerTon + overheadEconomyCostsPerTon;

    const lossesPerTon = advancedRemnantStats && advancedRemnantStats.valuePerTon ? Number(advancedRemnantStats.valuePerTon) : 0;
    const scrapRevenuePerTon = advancedRemnantStats && advancedRemnantStats.revenuePerTon ? Number(advancedRemnantStats.revenuePerTon) : 0;

    const netLossesPerTon = lossesPerTon - scrapRevenuePerTon;
    
    // Total variable costs = raw material + direct processing + net losses
    // Margin calculated after all costs (direct + overheads)
    const totalCostsPerTon = rPrice + totalProcessingCostsPerTon + netLossesPerTon;
    const profitPerTon = sPrice - totalCostsPerTon;
    const profitTotal = profitPerTon * weight;

    const marginPercent = sPrice > 0 ? (profitPerTon / sPrice) * 100 : 0;

    return {
      lossesPerTon,
      scrapRevenuePerTon,
      netLossesPerTon,
      directEconomyCostsPerTon,
      overheadEconomyCostsPerTon,
      totalProcessingCostsPerTon,
      totalCostsPerTon,
      profitPerTon,
      profitTotal,
      marginPercent,
      sellTotal: sPrice * weight,
      sellTotalVat: sPrice * weight * 1.22,
      rawTotal: rPrice * weight,
      lossesTotal: lossesPerTon * weight,
      scrapRevenueTotal: advancedRemnantStats ? advancedRemnantStats.orderRevenue : 0,
      netLossesTotal: netLossesPerTon * weight,
      economyData,
      isPositive: profitTotal >= 0,
    };
  }, [sellPrice, currentAdminRawPrice, adminScrapPrice, effectiveRemnantPrice, orderWeight, advancedRemnantStats, economyItems]);

  useEffect(() => {
    if (!db || !user) return;

    const q = query(
      collection(db, "calculations"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calcs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setSavedCalculations(calcs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "calculations");
    });

    return () => unsubscribe();
  }, [user]);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    if (!db || !user) {
      showNotify("Функция сохранения недоступна (нет подключения к БД).", "error");
      return;
    }
    if (!steelGrade || !selectedTarget || !selectedRaw) {
      showNotify("Заполните основные поля расчета перед сохранением.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        userId: user.uid,
        createdAt: serverTimestamp(),
        profileType,
        steelGrade,
        selectedTarget,
        selectedRaw,
        orderWeight,
        orderedLength,
        lengthInputValue: lengthInput.value,
        lengthInputSource: lengthInput.source,
        frontCoef,
        backCoef,
        usefulLength: lengthAfterTechEnds,
        sellPrice,
        rawPriceUsed: currentAdminRawPrice,
        scrapPriceUsed: adminScrapPrice,
        remnantPriceUsed: effectiveRemnantPrice,
        label: `${getProfileGost(profileType)} ${selectedTarget}мм, ${steelGrade}`
      };

      await addDoc(collection(db, "calculations"), payload);
      showNotify("Расчет успешно сохранен");
    } catch (err) {
      console.error("Error saving calculation:", err);
      handleFirestoreError(err, OperationType.CREATE, "calculations");
      showNotify("Ошибка при сохранении", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCalculation = async (id: string) => {
    if (!db) return;
    if (confirm("Удалить этот расчет?")) {
      try {
        await deleteDoc(doc(db, "calculations", id));
        showNotify("Расчет удален");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `calculations/${id}`);
      }
    }
  };

  const clearAllHistory = async () => {
    if (!db || !user) {
      showNotify("Удаление истории недоступно (нет подключения к БД).", "error");
      return;
    }
    
    if (savedCalculations.length === 0) {
      showNotify("История уже пуста");
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmClearAllHistory = async () => {
    setShowDeleteConfirm(false);
    setIsClearing(true);
    try {
      const totalDocs = savedCalculations.length;
      const BATCH_SIZE = 500;
      let deletedCount = 0;
      
      // Split documents into chunks of 500
      for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = savedCalculations.slice(i, i + BATCH_SIZE);
        chunk.forEach((calc) => {
          batch.delete(doc(db, "calculations", calc.id));
          deletedCount++;
        });
        await batch.commit();
      }
      
      showNotify(`История успешно очищена (${deletedCount} записей)`);
    } catch (err) {
      console.error("Error clearing history:", err);
      handleFirestoreError(err, OperationType.DELETE, "calculations (batch)");
      showNotify("Ошибка при очистке истории: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setIsClearing(false);
    }
  };

  const loadCalculation = (calc: any) => {
    setProfileType(calc.profileType);
    setSteelGrade(calc.steelGrade);
    setSelectedTarget(calc.selectedTarget);
    setSelectedRaw(calc.selectedRaw);
    setOrderWeight(calc.orderWeight);
    setOrderedLength(calc.orderedLength || "6000");
    setSellPrice(calc.sellPrice || "");
    
    if (calc.lengthInputValue && calc.lengthInputSource) {
      setLengthInput({ value: calc.lengthInputValue, source: calc.lengthInputSource });
    }
    if (calc.frontCoef) setFrontCoef(calc.frontCoef);
    if (calc.backCoef) setBackCoef(calc.backCoef);

    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setProfileType("round"); setFrontCoef("1.027");
    setSteelGrade("");
    setSelectedTarget("");
    setSelectedRaw("");
    setOrderWeight("");
    setLengthInput({ value: "6000", source: "raw" });
    setOrderedLength("НД");
    setSellPrice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => {
    window.print();
  };

  const reportData = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    const gost = getGostForGrade(steelGrade);
    const profileGost = getProfileGost(profileType);
    const lengthLabel = getLengthLabel(orderedLength);
    const rawPriceNum = Number(currentAdminRawPrice) || 0;
    const sellPriceNum = Number(sellPrice) || 0;
    const orderWeightNum = Number(orderWeight) || 0;
    const scrapPriceNum = Number(adminScrapPrice) || 0;
    const remnantPriceNum = Number(effectiveRemnantPrice) || 0;

    let formattedGrade = steelGrade;
    if (steelGrade && !steelGrade.toLowerCase().startsWith('ст') && !steelGrade.toLowerCase().includes('а12')) {
      formattedGrade = `ст.${steelGrade}`;
    }

    const techTons = advancedRemnantStats?.orderTechTons || 0;
    const remTons = advancedRemnantStats?.orderRemTons || 0;

    return {
      dateStr,
      gost,
      profileTypeStr: profileType === "round" ? "Круг" : "Шестигранник",
      profileGost,
      lengthLabel,
      rawPriceNum,
      sellPriceNum,
      orderWeightNum,
      scrapPriceNum,
      remnantPriceNum,
      formattedGrade,
      sellTotal: sellPriceNum * orderWeightNum,
      displayedRawLength,
      selectedRaw,
      displayedTargetLength,
      currentDrawCoef,
      techEndsMm,
      frontCoef,
      backCoef,
      lengthAfterTechEnds,
      techTons,
      remTons,
      requiredWeight,
      commercialStats,
      advancedRemnantStats,
      orderedLength,
      remnantLength,
    };
  }, [
    steelGrade, profileType, orderedLength, currentAdminRawPrice, sellPrice, orderWeight, 
    adminScrapPrice, effectiveRemnantPrice, selectedTarget, selectedRaw, displayedRawLength, 
    displayedTargetLength, currentDrawCoef, techEndsMm, frontCoef, backCoef, lengthAfterTechEnds, 
    requiredWeight, commercialStats, advancedRemnantStats, remnantLength
  ]);

  const reportText = useMemo(() => {
    const {
      dateStr, formattedGrade, gost, profileTypeStr, profileGost, lengthLabel, 
      sellPriceNum, sellTotal, displayedRawLength, selectedRaw, displayedTargetLength, 
      currentDrawCoef, techEndsMm, frontCoef, backCoef, lengthAfterTechEnds, 
      techTons, remTons, requiredWeight, commercialStats, advancedRemnantStats,
      rawPriceNum, scrapPriceNum, remnantPriceNum, orderWeightNum,
      orderedLength, remnantLength
    } = reportData;

    let text = `Детали расчета (ООО "ЗМК Арсенал") - ${dateStr}\n`;
    text += `-----------------------------------\n`;
    text += `Коммерческий блок:\n`;
    text += `Марка стали: ${formattedGrade || "Не выбрана"}${gost ? ` (${gost})` : ""}\n`;
    text += `Профиль: ${profileTypeStr} ${selectedTarget || "?"} мм (${profileGost})\n`;
    text += `Длина: ${orderedLength || "?"} мм\n`;
    text += `Объем заказа: ${orderWeight || "?"} тонн\n`;
    text += `Цена за 1 тн продукции без НДС: ${formatCurrency(sellPriceNum)} руб.\n`;
    text += `Цена за весь заказ без НДС: ${formatCurrency(sellTotal)} руб.\n`;
    text += `Цена за весь заказ с НДС (22%): ${formatCurrency(sellTotal * 1.22)} руб.\n`;
    text += `-----------------------------------\n`;
    text += `Производственный блок:\n`;
    text += `Заготовка длина: ${displayedRawLength || "?"} мм\n`;
    text += `Диаметр заготовки: ${selectedRaw || "?"} мм\n`;
    text += `Вытяжка после волочения: ${displayedTargetLength || "?"} мм. (коф.- ${currentDrawCoef ? currentDrawCoef.toFixed(3) : "?"})\n`;
    text += `Тех. концы: ${techEndsMm || "0.0"} мм (Перед: ${frontCoef}, Зад: ${backCoef})\n`;
    text += `Длина после удаления: = ${lengthAfterTechEnds || "0.0"} мм\n`;
    
    if (advancedRemnantStats) {
      text += `Лом количество: ${(techTons * 1000).toFixed(1)} кг. (${techTons.toFixed(3)} тн)\n`;
      text += `Деловые остатки: ${(remTons * 1000).toFixed(1)} кг. (${remTons.toFixed(3)} тн)\n`;
      text += `Длина делового остатка: ${remnantLength || "0"} мм\n`;
    } else {
      text += `Лом количество: ? кг.\n`;
      text += `Деловые остатки: ? кг.\n`;
    }
    text += `-----------------------------------\n`;
    text += `Блок снабжение:\n`;
    text += `Сырье к закупке: Круг г/к ГОСТ 2590-2006 ф${selectedRaw || "?"} мм ${formattedGrade || "?"} (${gost || "?"})\n`;
    
    if (optimalBilletLengths && optimalBilletLengths.length > 0) {
      const recStr = optimalBilletLengths.map(opt => `${opt.billetLength} мм (на ${opt.n} шт.)`).join(", ");
      text += `Рекомендуемая длина заготовки: ${recStr}\n`;
    }
    
    text += `Количество: ${requiredWeight || "?"} тн.\n`;
    text += `-----------------------------------\n`;
    text += `Блок экономика:\n`;
    text += `Расчет на 1 тонну продукции\n`;
    text += `Продажная цена (за 1 т): без НДС ${formatCurrency(sellPriceNum)} руб.\n`;
    text += `- Стоимость заготовки: без НДС ${formatCurrency(rawPriceNum)} руб.\n`;
    
    if (commercialStats) {
      const directCosts = commercialStats.economyData.filter(i => i.category === 'direct' && i.costPerTon > 0);
      if (directCosts.length > 0) {
        text += `- Прямые затраты: ${formatCurrency(commercialStats.totalProcessingCostsPerTon)} руб.\n`;
        directCosts.forEach(item => {
          text += `  └ ${item.name}: ${formatCurrency(item.costPerTon)} руб.\n`;
        });
      }
    }
    
    if (commercialStats && advancedRemnantStats && rawPriceNum > 0) {
      text += `- Затраты на отходы (1 т): ${formatCurrency(commercialStats.lossesPerTon)} руб.\n`;
      text += `  Лом (${(advancedRemnantStats.techTonsPerTon * 1000).toFixed(1)} кг): ${formatCurrency(advancedRemnantStats.techValuePerTon)} руб.\n`;
      text += `  Деловой остаток (${(advancedRemnantStats.remTonsPerTon * 1000).toFixed(1)} кг):  ${formatCurrency(advancedRemnantStats.remValuePerTon)} руб.\n`;
      
      text += `+ Возврат лома и остатков: ${formatCurrency(commercialStats.scrapRevenuePerTon)} руб.\n`;
      text += `  Лом (${(advancedRemnantStats.techTonsPerTon * 1000).toFixed(1)} кг × ${formatCurrency(scrapPriceNum)} руб/т): ${formatCurrency(advancedRemnantStats.techScrapRevenuePerTon)} руб.\n`;
      text += `  Деловой остаток (${(advancedRemnantStats.remTonsPerTon * 1000).toFixed(1)} кг × ${formatCurrency(remnantPriceNum)} руб/т): ${formatCurrency(advancedRemnantStats.remnantRevenuePerTon)} руб.\n`;
      
      const marginPrefix = commercialStats.isPositive ? "+" : "";
      text += `Маржа (1 тн, без НДС): ${marginPrefix}${formatCurrency(commercialStats.profitPerTon)} руб. (${marginPrefix}${commercialStats.marginPercent.toFixed(1)}%)\n`;
    }
    return text;
  }, [reportData, selectedTarget, orderWeight, optimalBilletLengths]);

  useEffect(() => {
    onPrintDataUpdate({
      reportData,
      orderWeight,
      selectedTarget,
      reportText
    });
  }, [reportData, orderWeight, selectedTarget, reportText, onPrintDataUpdate]);

  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = reportText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Ошибка копирования", err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <>
      <div className="min-h-screen bg-[#F4F5F4] dark:bg-[#121411] flex flex-col md:flex-row print:hidden transition-colors duration-300">

      {/* Mobile App Bar */}
      <div className="md:hidden fixed bottom-0 w-full bg-[#F0F4F4]/90 dark:bg-[#1A1C19]/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 z-50 print-hide">
         <div className="flex flex-col items-center justify-center w-full h-full text-slate-800 dark:text-slate-200">
           <div className="bg-slate-200 dark:bg-slate-700 px-4 py-1 rounded-full mb-1 text-slate-800 dark:text-white">
             <Calculator className="w-5 h-5" />
           </div>
           <span className="text-[10px] font-medium tracking-wide">Расчет</span>
         </div>
         <button onClick={toggleTheme} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-90">
           <div className="px-4 py-1 mb-1 transition-colors">
             {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
           </div>
           <span className="text-[10px] font-medium tracking-wide">{isDarkMode ? 'Светлая' : 'Темная'}</span>
         </button>
         <button onClick={onLogout} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
           <div className="px-4 py-1 mb-1">
             <LogOut className="w-5 h-5" />
           </div>
           <span className="text-[10px] font-medium tracking-wide">Выйти</span>
         </button>
      </div>

      {/* Desktop Navigation Rail */}
      <div className="hidden md:flex flex-col w-[88px] bg-[#F0F4F4] dark:bg-[#1A1C19] border-r border-slate-200 dark:border-slate-800 items-center py-6 fixed h-full z-50 print-hide">
        <div className="flex flex-col items-center mb-8 relative group">
           <button 
             onClick={onAdminSwitch}
             className="w-12 h-12 bg-slate-700 dark:bg-slate-600 rounded-xl flex items-center justify-center text-white mb-2 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-500 transition-all active:scale-95 peer"
             title="Вход для управления"
           >
             <Key className="w-6 h-6 outline-none" />
           </button>
           <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
             Вход для управления
           </div>
        </div>
        <div className="flex-1 flex flex-col gap-4 w-full px-3">
           <div className="w-full flex flex-col items-center justify-center py-4 text-slate-900 dark:text-slate-100">
             <div className="bg-slate-200 dark:bg-slate-700 px-5 py-1.5 rounded-full mb-1.5 text-slate-800 dark:text-white">
               <Calculator className="w-6 h-6" strokeWidth={2} />
             </div>
             <span className="text-[11px] font-medium tracking-wide">Расчет</span>
           </div>
           <button onClick={toggleTheme} className="w-full flex flex-col items-center justify-center py-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all active:scale-95 group">
              <div className="px-5 py-1.5 mb-1.5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800 rounded-full">
                {isDarkMode ? <Sun className="w-6 h-6 text-amber-500" strokeWidth={2} /> : <Moon className="w-6 h-6" strokeWidth={2} />}
              </div>
              <span className="text-[11px] font-medium tracking-wide">{isDarkMode ? 'Светлая' : 'Темная'}</span>
           </button>
        </div>
        <div className="w-full px-3">
           <button onClick={onLogout} className="w-full flex flex-col items-center justify-center py-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
             <div className="px-5 py-1.5 mb-1.5">
               <LogOut className="w-6 h-6" strokeWidth={2} />
             </div>
             <span className="text-[11px] font-medium tracking-wide">Выйти</span>
           </button>
        </div>
      </div>

      <div className="flex-1 md:ml-[88px] pb-24 md:pb-8 relative">
        <div className="max-w-[1920px] w-full px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
          {notification && (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-[100] animate-in fade-in zoom-in slide-in-from-top-4 duration-300 border ${
              notification.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
            }`}>
              <div className="flex items-center gap-3 text-sm font-semibold">
                {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {notification.message}
              </div>
            </div>
          )}
          {/* HEADER */}
          <header className="sticky top-0 z-40 bg-[#F4F5F4]/90 dark:bg-[#121411]/90 backdrop-blur-md pt-4 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/50 dark:border-slate-800/50 mb-4 print-hide transition-colors duration-300">
            <div className="flex flex-col">
              <h1 className="text-xl font-medium tracking-tight text-[#1A1C19] dark:text-[#E2E3DE]">
                Калькулятор <span className="hidden sm:inline">для менеджеров</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">ООО "ЗМК Арсенал"</p>
            </div>

            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowManual(true)}
                className="flex items-center justify-center w-9 h-9 bg-[#EAECE9] dark:bg-[#1A1C19] hover:bg-[#DDE0DC] dark:hover:bg-[#252824] text-[#1A1C19] dark:text-[#E2E3DE] rounded-xl transition-all font-medium focus:outline-none border border-[#DDE0DC] dark:border-[#2C2F2B] shadow-sm mr-1"
                title="Инструкция"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 h-9 min-w-[36px] sm:min-w-[115px] rounded-xl transition-all font-medium text-xs focus:outline-none border shadow-sm ${
                    showHistory 
                      ? "bg-[#1A1C19] dark:bg-[#E2E3DE] text-white dark:text-[#121411] border-[#1A1C19] dark:border-white" 
                      : "bg-[#EAECE9] dark:bg-[#1A1C19] hover:bg-[#DDE0DC] dark:hover:bg-[#252824] text-[#1A1C19] dark:text-[#E2E3DE] border-[#DDE0DC] dark:border-[#2C2F2B]"
                }`}
                title="История расчетов"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">История</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !steelGrade}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 h-9 min-w-[36px] sm:min-w-[115px] bg-[#EAECE9] dark:bg-[#1A1C19] hover:bg-[#DDE0DC] dark:hover:bg-[#252824] text-[#1A1C19] dark:text-[#E2E3DE] rounded-xl transition-all font-medium text-xs focus:outline-none disabled:opacity-50 border border-[#DDE0DC] dark:border-[#2C2F2B] shadow-sm"
                title="Сохранить расчет"
              >
                {isSaving ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Сохранить</span>
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 h-9 min-w-[36px] sm:min-w-[115px] rounded-xl transition-all font-medium text-xs focus:outline-none border shadow-sm ${
                  isCopied 
                    ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800" 
                    : "bg-[#EAECE9] dark:bg-[#1A1C19] hover:bg-[#DDE0DC] dark:hover:bg-[#252824] text-[#1A1C19] dark:text-[#E2E3DE] border-[#DDE0DC] dark:border-[#2C2F2B]"
                }`}
                title="Копировать расчет"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{isCopied ? "Скопировано" : "Копировать"}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 h-9 min-w-[36px] sm:min-w-[115px] bg-[#EAECE9] dark:bg-[#1A1C19] hover:bg-[#DDE0DC] dark:hover:bg-[#252824] text-[#1A1C19] dark:text-[#E2E3DE] rounded-xl transition-all font-medium text-xs focus:outline-none border border-[#DDE0DC] dark:border-[#2C2F2B] shadow-sm"
                title="Печатная форма"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Печать</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 h-9 min-w-[36px] sm:min-w-[115px] bg-[#EAECE9] dark:bg-[#1A1C19] hover:bg-[#DDE0DC] dark:hover:bg-[#252824] text-[#1A1C19] dark:text-[#E2E3DE] rounded-xl transition-all font-medium text-xs focus:outline-none border border-[#DDE0DC] dark:border-[#2C2F2B] shadow-sm"
                title="Сбросить все"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Сбросить</span>
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-8">
            {showHistory && (
              <div className="lg:col-span-12 bg-white dark:bg-[#1A1C19] rounded-[16px] border border-slate-200 dark:border-slate-800 shadow-md p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-300 text-slate-800 dark:text-slate-200">
                <div className="flex items-center justify-between mb-4 pb-2 border-b dark:border-slate-800">
                   <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <History className="w-5 h-5" /> Сохраненные расчеты
                   </h3>
                   <div className="flex items-center gap-4">
                     {savedCalculations.length > 0 && (
                       <button 
                         onClick={clearAllHistory}
                         disabled={isClearing}
                         className="text-[10px] text-red-500 hover:text-red-700 font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                       >
                         {isClearing ? (
                           <RotateCcw className="w-3 h-3 animate-spin" />
                         ) : (
                           <Trash2 className="w-3 h-3" />
                         )}
                         {isClearing ? "Очистка..." : "Очистить всё"}
                       </button>
                     )}
                     <button 
                       onClick={() => {
                         setShowHistory(false);
                         window.scrollTo({ top: 0, behavior: "smooth" });
                       }} 
                       className="text-slate-400 hover:text-slate-600"
                     >
                       <RotateCcw className="w-4 h-4" />
                     </button>
                   </div>
                </div>
                {savedCalculations.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 italic">История пуста</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
                    {savedCalculations.map((calc) => (
                      <div key={calc.id} className="group relative bg-[#F8FAFA] dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 transition-all hover:shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {calc.createdAt?.toDate ? calc.createdAt.toDate().toLocaleDateString('ru-RU') : '—'}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteCalculation(calc.id); }}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="cursor-pointer space-y-1 mt-1" onClick={() => loadCalculation(calc)}>
                          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md mb-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Сталь:</span>
                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{calc.steelGrade}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500 leading-none mb-0.5">Готовый:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{parseFloat(calc.selectedTarget || "0")} мм</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500 leading-none mb-0.5">Заготовка:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{calc.lengthInputValue || "6000"} мм</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500 leading-none mb-0.5">Заказ:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{calc.orderedLength || "6000"} мм</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[9px] uppercase font-semibold text-[#0D652D] dark:text-green-500 leading-none mb-0.5">Полезная:</span>
                              <span className="font-bold text-[#0D652D] dark:text-green-400">{calc.usefulLength || "—"} мм</span>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{calc.orderWeight} тн</span>
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">{calc.profileType === 'round' ? 'Круг' : 'Шестигр.'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="lg:col-span-12 xl:col-span-7 space-y-4">
              <section className="bg-white dark:bg-[#1A1C19] rounded-[16px] border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 print-shadow-none transition-colors duration-300">
            {/* Segmented Control */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex w-full sm:max-w-[280px] sm:mx-auto mb-6 print-hide">
              <button
                onClick={() => { setProfileType("round"); setFrontCoef("1.027"); }}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all duration-200 focus:outline-none ${
                  profileType === "round" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Circle className="w-3.5 h-3.5" /> Круг
              </button>
              <button
                onClick={() => { setProfileType("hex"); setFrontCoef("1.03"); }}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all duration-200 focus:outline-none ${
                  profileType === "hex" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Hexagon className="w-3.5 h-3.5" /> Шестигранник
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 sm:gap-6 items-end">
              <div className="space-y-1.5 text-slate-800 dark:text-white">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 border-b-0">Марка стали {steelGrade && <span className="lowercase font-normal opacity-70">({getGostForGrade(steelGrade)})</span>}</label>
                <div className="relative">
                  <select
                    value={steelGrade}
                    onChange={(e) => setSteelGrade(e.target.value)}
                    className="w-full bg-[#F0F4F4] dark:bg-slate-800 border-b border-slate-400 dark:border-slate-600 rounded-t-lg px-3 h-10 text-sm font-medium appearance-none cursor-pointer focus:border-slate-800 dark:focus:border-white focus:outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-800 text-black dark:text-white">Выберите марку...</option>
                    {allGrades.map((grade) => (
                      <option key={grade} value={grade} className="bg-white dark:bg-slate-800 text-black dark:text-white">{grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-800 dark:text-white">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Готовый пруток</label>
                <div className="relative">
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full bg-[#F0F4F4] dark:bg-slate-800 border-b border-slate-400 dark:border-slate-600 rounded-t-lg px-3 h-10 text-sm font-medium appearance-none cursor-pointer focus:border-slate-800 dark:focus:border-white focus:outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-800 text-black dark:text-white">Размер, мм...</option>
                    {targetOptions.map((size) => (
                      <option key={size} value={size} className="bg-white dark:bg-slate-800 text-black dark:text-white">{size}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-800 dark:text-white">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Заготовка</label>
                <div className="relative">
                  <select
                    value={selectedRaw}
                    onChange={(e) => setSelectedRaw(e.target.value)}
                    disabled={!selectedTarget}
                    className="w-full bg-[#F0F4F4] dark:bg-slate-800 border-b border-slate-400 dark:border-slate-600 rounded-t-lg px-3 h-10 text-sm font-medium appearance-none disabled:opacity-50 cursor-pointer focus:border-slate-800 dark:focus:border-white focus:outline-none transition-all text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-800 text-black dark:text-white">{selectedTarget ? "Выбор..." : "Ожидание"}</option>
                    {rawOptions.map((size) => (
                      <option key={size} value={size} className="bg-white dark:bg-slate-800 text-black dark:text-white">{size}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-800 dark:text-white">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Объем заказа</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Напр. 5"
                    value={orderWeight}
                    onChange={(e) => handleNumericInput(e, setOrderWeight)}
                    className="w-full bg-[#F0F4F4] dark:bg-slate-800 border-b border-slate-400 dark:border-slate-600 rounded-t-lg pl-3 pr-8 h-10 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-slate-800 dark:focus:border-white dark:text-white focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">тн</span>
                </div>
              </div>
              
              <div className="col-span-1 sm:col-span-2 2xl:col-span-4 flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                <div className="flex-1 flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Цена заготовки</span>
                  <span className="font-medium text-slate-900 dark:text-white text-sm">{currentAdminRawPrice ? formatInputValue(currentAdminRawPrice) : '—'} <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">руб/т</span></span>
                </div>
                <div className="flex-1 flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Цена лома</span>
                  <span className="font-medium text-slate-900 dark:text-white text-sm">{formatInputValue(adminScrapPrice)} <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">руб/т</span></span>
                </div>
                <div className="flex-1 flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Цена остатков</span>
                  <span className="font-medium text-slate-900 dark:text-white text-sm">{formatInputValue(adminRemnantPrice)} <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">руб/т</span></span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-[#1A1C19] rounded-2xl p-4 sm:p-5 space-y-4 sm:space-y-6 print-shadow-none relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#4A6572]/10 border border-[#4A6572]/20 text-[#4A6572] dark:text-slate-300 rounded-xl print-hide">
                  <Ruler className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-medium tracking-tight text-[#1A1C19] dark:text-white">Раскрой и остатки</h2>
              </div>

              {optimalBilletLengths.length > 0 && (
                <div className={`bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-2 rounded-2xl flex items-center gap-4 transition-all ${orderedLength !== 'НД' && orderedLength !== '6000' && orderedLength !== '' ? 'ring-2 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <Ruler className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase leading-none">Реком. заготовка</span>
                      <span className="text-[8px] font-bold text-indigo-600/60 dark:text-indigo-400/60 uppercase mt-0.5">шаг 100мм</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {optimalBilletLengths.map((opt, i) => (
                      <button 
                        key={i} 
                        onClick={() => setLengthInput({ value: opt.billetLength.toString(), source: "raw" })}
                        className="flex flex-col items-center bg-white dark:bg-[#1A1C19] border border-indigo-100 dark:border-indigo-500/30 px-2.5 py-1 rounded-xl shadow-sm hover:border-indigo-400 dark:hover:border-indigo-400 hover:scale-105 active:scale-95 transition-all focus:outline-none group"
                        title="Выбрать эту длину"
                      >
                        <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt.billetLength} мм.</span>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">на {opt.n} шт.</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Layout lengths */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center bg-white dark:bg-[#222421] border border-slate-200 dark:border-slate-700 p-4 rounded-[16px] relative z-10 shadow-sm">
              <div className="space-y-1.5 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Длина заготовки</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={displayedRawLength}
                    onChange={(e) => handleNumericInput(e, (val) => setLengthInput({ value: val, source: "raw" }))}
                    disabled={!selectedTarget}
                    className="w-full bg-[#F0F4F4] dark:bg-slate-800 border-b border-slate-400 dark:border-slate-600 rounded-t-lg pl-3 pr-10 h-10 text-sm font-medium transition-all disabled:opacity-50 placeholder:text-slate-400 focus:border-slate-800 dark:focus:border-white focus:bg-slate-200 dark:focus:bg-slate-700 focus:outline-none dark:text-white focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">мм</span>
                </div>
              </div>

              <ArrowRight className="w-6 h-6 text-slate-400 hidden md:block shrink-0 mx-2" />

              <div className="space-y-1.5 w-full">
                <label className="block text-[10px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider ml-1">Вытяжка (после волочения)</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={displayedTargetLength}
                    className="w-full bg-[#E8DEF8] dark:bg-[#4A6572]/10 border-b border-[#6750A4] dark:border-[#4A6572] text-slate-900 dark:text-white rounded-t-lg pl-3 pr-10 h-10 text-sm font-semibold transition-all cursor-default focus:outline-none opacity-90"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6750A4] font-medium text-xs">мм</span>
                </div>
              </div>
            </div>

            {/* Tech cuts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4 gap-3 items-end bg-white dark:bg-[#222421] border border-slate-200 dark:border-slate-700 p-4 rounded-[16px] relative z-10 shadow-sm">
              <div className="space-y-1 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Обрезь перед</label>
                <input
                  type="text"
                  readOnly
                  value={formatInputValue(frontCoef)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-9 text-sm font-medium cursor-default focus:outline-none"
                />
              </div>

              <div className="space-y-1 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Обрезь зад</label>
                <input
                  type="text"
                  readOnly
                  value={formatInputValue(backCoef)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-9 text-sm font-medium cursor-default focus:outline-none"
                />
              </div>

              <div className="space-y-1 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Тех. концы</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={techEndsMm}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 h-9 text-sm font-medium cursor-default focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium text-xs">мм</span>
                </div>
              </div>

              <div className="space-y-1 w-full col-span-2 sm:col-span-1 2xl:col-span-1">
                <label className="block text-[10px] font-semibold text-[#0D652D] dark:text-green-400 uppercase ml-1 tracking-wider">Полезная длина</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={lengthAfterTechEnds}
                    className="w-full bg-[#E6F4EA] dark:bg-green-900/10 border border-[#CEEAD6] dark:border-green-900/30 text-[#0D652D] dark:text-green-400 rounded-lg pl-3 pr-8 h-9 text-sm font-semibold cursor-default focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0D652D]/60 dark:text-green-400/60 font-medium text-xs">мм</span>
                </div>
              </div>
            </div>

            {/* Ordered lengths */}
            <div className="bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 shadow-sm transition-colors">
              <div>
                <label className="block text-base font-medium text-slate-900 dark:text-white tracking-tight">Длина заказа</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Размер прутка в отгрузке</p>
              </div>
              <div className="relative w-full sm:w-1/3 shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  value={orderedLength}
                  onChange={(e) => handleNumericInput(e, setOrderedLength)}
                  className="w-full bg-[#F0F4F4] dark:bg-slate-800 border-b border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white rounded-t-lg px-4 h-12 text-lg font-medium transition-all focus:border-slate-800 dark:focus:border-white focus:bg-slate-200 dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">мм</span>
              </div>
            </div>

             {optimalLengths.length > 0 && Number(lengthAfterTechEnds) > 0 && (
              <div className="bg-[#E8DEF8] dark:bg-[#4A6572]/10 border border-[#CAC4D0] dark:border-[#4A6572]/30 rounded-[16px] p-4 sm:p-5 print-hide relative z-10 shadow-sm transition-colors">
                <div className="flex flex-col lg:flex-row items-start gap-6">
                  <div className="flex-1 space-y-4 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CAC4D0]/50 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#6750A4]/10 dark:bg-white/10 rounded-xl hidden sm:flex items-center justify-center">
                          <Info className="w-5 h-5 text-[#1D192B] dark:text-slate-300" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1D192B] dark:text-slate-200 uppercase tracking-tight">
                            Безотходный раскрой 
                          </h3>
                          <p className="text-[10px] text-[#49454F] dark:text-slate-400 font-medium">
                            Оптимальная длина = (Чистая длина / Кол-во частей) − 5 мм
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-2">
                        {optimalLengths.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => setOrderedLength(opt.length.toString())}
                            className="bg-white dark:bg-[#1A1C19] hover:bg-slate-50 dark:hover:bg-slate-800 border border-[#CAC4D0] dark:border-slate-700 text-left p-3 rounded-xl transition-colors group flex items-center justify-between shadow-sm focus:outline-none"
                          >
                            <div>
                              <div className="font-semibold text-[#1D192B] dark:text-white text-sm">{opt.length} мм</div>
                              <div className="text-[10px] text-[#49454F] dark:text-slate-400 font-medium">
                                На {opt.pieces} {opt.pieces === 1 ? "часть" : opt.pieces > 1 && opt.pieces < 5 ? "части" : "частей"}
                              </div>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-[#6750A4]/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-[#6750A4]/10 dark:group-hover:bg-white/10 transition-colors shrink-0">
                              <ArrowRight className="w-3 h-3 text-[#6750A4] dark:text-slate-400" />
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remnant processing */}
            {orderedLength && Number(orderedLength) > 0 && (
              <div className="bg-slate-50 dark:bg-[#222421] border border-slate-200 dark:border-slate-700 p-4 sm:p-5 rounded-[16px] relative z-10 shadow-sm transition-colors">
                {remnantLength && Number(remnantLength) > 0 && piecesPerBar > 0 && (
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-slate-900 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider">Деловой остаток</h4>
                        <span className="text-[8px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase">после реза {piecesPerBar} шт.</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-normal text-slate-900 dark:text-white tracking-tight">{remnantLength} <span className="text-base text-slate-500 dark:text-slate-400 font-semibold">мм</span></p>
                        {remnantWeight && <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">~ {remnantWeight.tons} т ({remnantWeight.kg} кг)</p>}
                      </div>
                    </div>
                    {remnantValue && effectiveRemnantPrice && (
                      <div className={`px-4 py-3 rounded-xl w-full lg:w-auto shadow-sm border ${currentRemnantPricingRule === "scrap" ? "bg-[#FFF8E1] dark:bg-amber-900/10 border-[#FFECB3] dark:border-amber-900/30" : "bg-[#E6F4EA] dark:bg-green-900/10 border-[#CEEAD6] dark:border-green-900/30"}`}>
                        <span className={`block text-[8px] font-bold uppercase tracking-wider ${currentRemnantPricingRule === "scrap" ? "text-[#E65100] dark:text-amber-500" : "text-[#0D652D] dark:text-green-500"}`}>
                          {currentRemnantPricingRule === "scrap" ? "Стоимость лома" : "Оценка остатка"}
                        </span>
                        <span className={`text-lg font-normal tracking-tight ${currentRemnantPricingRule === "scrap" ? "text-[#E65100] dark:text-amber-500" : "text-[#0D652D] dark:text-green-500"}`}>
                          {new Intl.NumberFormat("ru-RU").format(remnantValue)} руб.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:border-r border-slate-200 dark:border-slate-800 sm:pr-4 group/bars">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Прутков ({orderedLength} мм) в 1 тн готовой продукции</span>
                    </div>
                    <div className="text-xl font-medium text-slate-900 dark:text-white">~ {piecesPerTon || 0} шт.</div>
                    {orderedBarWeight && <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-tight">Вес 1 прутка: <span className="font-bold text-slate-700 dark:text-slate-200">{orderedBarWeight.kg} кг</span></div>}
                    {orderWeight && orderedBarWeight ? (
                      <div className="text-[10px] text-[#006A6A] dark:text-teal-400 font-bold bg-[#006A6A]/10 dark:bg-teal-900/20 px-2 py-1 rounded-md mt-2 inline-block border border-teal-500/10">
                        В заказе: ~ {new Intl.NumberFormat("ru-RU").format(totalPiecesInOrder || 0)} шт.
                      </div>
                    ) : null}
                  </div>

                  {advancedRemnantStats && (
                    <>
                      <div className="space-y-1.5 sm:border-r border-slate-200 dark:border-slate-800 sm:pr-4">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Стоимость отходов (1 тн)</span>
                        <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white">
                          {currentAdminRawPrice && advancedRemnantStats.valuePerTon !== null ? `${formatCurrency(advancedRemnantStats.valuePerTon)} руб.` : "—"}
                        </div>
                        {currentAdminRawPrice && advancedRemnantStats.tonsPerTon !== null && (
                          <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 pl-3">
                            {advancedRemnantStats.techTonsPerTon > 0 && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between font-medium">
                                <span>Лом:</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(advancedRemnantStats.techValuePerTon)} руб.</span>
                              </div>
                            )}
                            {advancedRemnantStats.remTonsPerTon > 0 && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between font-medium">
                                <span>Остаток:</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(advancedRemnantStats.remValuePerTon)} руб.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Отходы на весь заказ</span>
                        <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white">
                          {currentAdminRawPrice && orderWeight && advancedRemnantStats.orderScrapValue !== null
                            ? `${formatCurrency(advancedRemnantStats.orderScrapValue)} руб.`
                            : "—"}
                        </div>
                        {currentAdminRawPrice && orderWeight && advancedRemnantStats.orderScrapTons !== null && (
                          <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 pl-3">
                            {advancedRemnantStats.orderTechTons > 0 && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between font-medium">
                                <span>Лом:</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(advancedRemnantStats.orderTechValue)} руб.</span>
                              </div>
                            )}
                            {advancedRemnantStats.orderRemTons > 0 && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between font-medium">
                                <span>Остаток:</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(advancedRemnantStats.orderRemValue)} руб.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {remnantLength && Number(remnantLength) < 0 && (
              <div className="p-3 bg-[#FFDAD6] border border-[#FFB4AB] rounded-xl flex items-start gap-3 relative z-10 shadow-sm mt-4">
                <AlertTriangle className="w-5 h-5 text-[#BA1A1A] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#BA1A1A] mb-0.5">Длина заказа превышает вытяжку</p>
                  <p className="text-xs text-[#BA1A1A]/90 font-medium leading-relaxed">
                    Из заготовки {displayedRawLength} мм получится пруток длиной {displayedTargetLength} мм. Заказанная длина {orderedLength} мм не поместится. Выберите заготовку длиннее или уменьшите длину отгрузки.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            <div className="bg-white dark:bg-[#1A1C19] p-4 sm:p-5 flex flex-col justify-center relative z-10 border border-slate-200 dark:border-slate-800 rounded-[16px] shadow-sm transition-colors overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl">
                  <Package className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Вес заготовки</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">{requiredWeight || "0.00"}</span>
                <span className="text-base font-medium text-slate-500 dark:text-slate-400">тонн</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1A1C19] p-4 sm:p-5 flex flex-col justify-center relative z-10 border border-slate-200 dark:border-slate-800 rounded-[16px] shadow-sm transition-colors overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl">
                  <Scale className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Расходный коэффициент общий</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">{consumptionCoefficient ? consumptionCoefficient.toFixed(3) : "—"}</span>
              </div>
            </div>
          </section>

          {/* COMMERCIAL COMMERCE SECTION */}
          <section className="bg-white dark:bg-[#1A1C19] rounded-2xl p-4 sm:p-5 space-y-4 sm:space-y-6 print-shadow-none relative overflow-hidden z-10 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 relative z-10">
              <div className="p-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl shadow-sm">
                <Briefcase className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-medium tracking-tight text-[#1A1C19] dark:text-white">Коммерческий расчет</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-[#222421] border border-slate-200 dark:border-slate-700 p-4 rounded-[16px] relative z-10 shadow-sm transition-colors">
              <div className="space-y-1.5 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 truncate">Продажа за 1 т (без НДС)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="55 000"
                    value={formatInputValue(sellPrice)}
                    onChange={(e) => handleNumericInput(e, setSellPrice)}
                    className="w-full bg-[#F0F4F4] dark:bg-slate-800 border-b border-slate-400 dark:border-slate-600 rounded-t-lg pl-3 pr-10 h-10 text-sm font-medium transition-all focus:border-slate-800 dark:focus:border-white focus:bg-slate-200 dark:focus:bg-slate-700 focus:outline-none dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-xs">руб</span>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 truncate">Сумма заказа (без НДС)</label>
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-10 flex items-center justify-between transition-colors">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate pl-1">{sellPrice && orderWeight ? formatCurrency(commercialStats?.sellTotal) : "0,00"}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium ml-1 text-xs">руб</span>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 truncate">Сумма (с НДС 22%)</label>
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-10 flex items-center justify-between transition-colors">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate pl-1">{sellPrice && orderWeight ? formatCurrency(commercialStats?.sellTotalVat) : "0,00"}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium ml-1 text-xs">руб</span>
                </div>
              </div>
            </div>

            {commercialStats && (
              <div className="bg-slate-50 dark:bg-[#222421] border border-slate-200 dark:border-slate-700 p-4 sm:p-5 rounded-[16px] space-y-6 mt-4 relative z-10 shadow-sm transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 pl-1">
                  {/* Per Ton Calculation */}
                  <div className="space-y-4">
                    <h4 className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                      <span>На 1 тонну продукции (без НДС)</span>
                      <TrendingUp className="w-3.5 h-3.5 opacity-60" />
                    </h4>
                    <div className="space-y-3.5 text-[13px]">
                      <div className="flex justify-between items-start gap-4 font-medium group">
                        <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0">Продажная цена:</span>
                        <span className="font-bold text-slate-900 dark:text-white text-right leading-tight">{formatCurrency(sellPrice)} руб.</span>
                      </div>
                      <div className="flex justify-between items-start gap-4 text-[#BA1A1A] dark:text-red-400/90 font-medium group">
                        <span className="group-hover:text-[#BA1A1A] transition-colors shrink-0 leading-tight">- Стоимость заготовки:</span>
                        <span className="font-bold text-right leading-tight">{currentAdminRawPrice ? `${formatCurrency(currentAdminRawPrice)} руб.` : "—"}</span>
                      </div>
                      <div className="flex justify-between items-start gap-4 text-[#BA1A1A] dark:text-red-400/90 font-medium group">
                        <span className="group-hover:text-[#BA1A1A] transition-colors shrink-0 leading-tight">- Прямые затраты:</span>
                        <span className="font-bold text-right leading-tight">{formatCurrency(commercialStats.totalProcessingCostsPerTon)} руб.</span>
                      </div>

                      {commercialStats.economyData.filter(i => i.category === 'direct' && i.costPerTon > 0).length > 0 && (
                        <div className="space-y-1.5 pl-2 border-l border-slate-200 dark:border-slate-800 ml-1.5 mb-1">
                          {commercialStats.economyData.filter(i => i.category === 'direct' && i.costPerTon > 0).map(item => (
                            <div key={item.id} className="flex justify-between text-[11px] text-[#BA1A1A]/70 dark:text-red-400/70 font-medium tracking-tight">
                              <span className="truncate pr-4 leading-none">└ {item.name}:</span>
                              <span className="shrink-0 leading-none">{formatCurrency(item.costPerTon)} ₽</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-4 text-[#BA1A1A] dark:text-red-400/90 font-medium group">
                        <span className="group-hover:text-[#BA1A1A] transition-colors shrink-0 leading-tight">- Затраты на отходы:</span>
                        <span className="font-bold text-right leading-tight">{formatCurrency(commercialStats.lossesPerTon)} руб.</span>
                      </div>
                      
                      {commercialStats.scrapRevenuePerTon > 0 && advancedRemnantStats && (
                        <div className="mt-4 bg-[#E6F4EA]/50 dark:bg-green-950/20 px-3.5 py-3 rounded-[14px] border border-[#CEEAD6] dark:border-green-900/30 flex flex-col gap-2 transition-colors">
                          <div className="flex justify-between items-start gap-4 text-[#0D652D] dark:text-green-400 font-bold text-[12px]">
                            <span>+ Возврат лома / остатков:</span>
                            <span className="text-right">{formatCurrency(commercialStats.scrapRevenuePerTon)} руб.</span>
                          </div>
                          <div className="space-y-1 pl-1">
                            <div className="flex justify-between text-[11px] text-[#0D652D]/80 dark:text-green-400/80 font-medium">
                              <span>Лом ({(advancedRemnantStats.techTonsPerTon * 1000).toFixed(1)} кг):</span>
                              <span>{formatCurrency(advancedRemnantStats.techScrapRevenuePerTon)} руб.</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-[#0D652D]/80 dark:text-green-400/80 font-medium">
                              <span>Деловой остаток ({(advancedRemnantStats.remTonsPerTon * 1000).toFixed(1)} кг):</span>
                              <span>{formatCurrency(advancedRemnantStats.remnantRevenuePerTon)} руб.</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-5 mt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                        <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">Валовая прибыль (Маржа):</span>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span className={`font-bold tracking-tight text-2xl leading-none whitespace-nowrap ${commercialStats.isPositive ? "text-[#0D652D] dark:text-green-400" : "text-[#BA1A1A] dark:text-red-400"}`}>
                            {commercialStats.isPositive ? "+" : ""}{formatCurrency(commercialStats.profitPerTon)} <span className="text-sm font-medium">руб.</span>
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shadow-sm ${commercialStats.isPositive ? "bg-[#E6F4EA] dark:bg-green-900/40 border-[#CEEAD6] dark:border-green-900/50 text-[#0D652D] dark:text-green-400" : "bg-[#FFDAD6] dark:bg-red-900/40 border-[#FFB4AB] dark:border-red-900/50 text-[#BA1A1A] dark:text-red-400"}`}>
                            {commercialStats.isPositive ? "+" : ""}{commercialStats.marginPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Order Calculation */}
                  <div className="space-y-4">
                    <h4 className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                      <span>На весь заказ ({totalPiecesInOrder} шт.)</span>
                      <BarChart3 className="w-3.5 h-3.5 opacity-60" />
                    </h4>
                    <div className="space-y-3.5 text-[13px]">
                      <div className="flex justify-between items-start gap-4 font-medium">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Сумма продажи:</span>
                        <span className="font-bold text-slate-900 dark:text-white text-right leading-tight">{formatCurrency(commercialStats.sellTotal)} руб.</span>
                      </div>
                      <div className="flex justify-between items-start gap-4 text-[#BA1A1A] dark:text-red-400/90 font-medium">
                        <span className="shrink-0">- Все затраты:</span>
                        <span className="font-bold text-right leading-tight">{formatCurrency(commercialStats.totalCostsPerTon * Number(orderWeight))} руб.</span>
                      </div>
                      {commercialStats.scrapRevenueTotal > 0 && advancedRemnantStats && (
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-start gap-4 text-[#0D652D] dark:text-green-400 font-bold">
                             <span className="shrink-0">+ Общий возврат:</span>
                             <span className="text-right leading-tight">{formatCurrency(commercialStats.scrapRevenueTotal)} руб.</span>
                          </div>
                          <div className="space-y-1.5 pl-1.5">
                            <div className="flex justify-between text-[11px] text-[#0D652D]/80 dark:text-green-400/80 font-semibold">
                              <span>Лом ({advancedRemnantStats.orderTechTons.toFixed(3)} т):</span>
                              <span>{formatCurrency(advancedRemnantStats.orderTechRevenue)} руб.</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-[#0D652D]/80 dark:text-green-400/80 font-semibold">
                              <span>Деловой остаток ({advancedRemnantStats.orderRemTons.toFixed(3)} т):</span>
                              <span>{formatCurrency(advancedRemnantStats.orderRemRevenue)} руб.</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 p-4 bg-slate-100/80 dark:bg-slate-800/60 rounded-[18px] border border-slate-200/50 dark:border-slate-700/50 space-y-3 transition-colors">
                        <div className="flex justify-between items-start gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span className="shrink-0 uppercase tracking-widest leading-none">Налог (НДС 22%):</span>
                          <span className="text-right leading-none">{formatCurrency(commercialStats.sellTotalVat - commercialStats.sellTotal)} руб.</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700/80 pt-3 flex justify-between items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Итого с НДС</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-white leading-none whitespace-nowrap">{formatCurrency(commercialStats.sellTotalVat)} <span className="text-xs font-bold opacity-60 ml-0.5">₽</span></span>
                        </div>
                      </div>

                      <div className="pt-3 flex flex-col gap-2">
                        <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">Чистая прибыль (всего):</span>
                        <span className={`font-bold tracking-tight text-2xl leading-none whitespace-nowrap ${commercialStats.isPositive ? "text-[#0D652D] dark:text-green-400" : "text-[#BA1A1A] dark:text-red-400"}`}>
                          {commercialStats.isPositive ? "+" : ""}{formatCurrency(commercialStats.profitTotal)} <span className="text-sm font-medium">руб.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILED PRODUCTION ECONOMY SECTION */}
            {commercialStats && (
               <div className="bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-slate-400">
                  <button 
                    onClick={() => setIsEconomyExpanded(!isEconomyExpanded)}
                    className="w-full px-5 py-4 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                        <Calculator className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Экономика производства</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Детализация затрат на тоннну: <span className="text-slate-900 dark:text-slate-200 font-bold">{formatCurrency(commercialStats.totalProcessingCostsPerTon)} руб.</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-[#4A6572] bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg hidden sm:block">{isEconomyExpanded ? 'СВЕРНУТЬ' : 'РАСКРЫТЬ ДЕТАЛИ'}</span>
                       {isEconomyExpanded ? <Minus className="w-4 h-4 text-slate-400" /> : <Plus className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  <div id="economy-breakdown" className={`${isEconomyExpanded ? 'block' : 'hidden'} border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-[#222421]/50`}>
                    {/* Direct Costs */}
                    <div className="p-5">
                       <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Circle className="w-1.5 h-1.5 fill-blue-500 text-blue-500" />
                            Состав прямых затрат
                          </h4>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(commercialStats.directEconomyCostsPerTon)} руб./т</span>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {commercialStats.economyData.filter(i => i.category === 'direct' && i.costPerTon > 0).map(item => (
                            <div key={item.id} className="bg-white dark:bg-[#1A1C19] p-3 rounded-[18px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                               <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 truncate pr-2">{item.name}</span>
                                  <TrendingUp className="w-3 h-3 text-slate-300 shrink-0" />
                               </div>
                               <div className="space-y-1.5">
                                 <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500 font-medium">Норма на тн:</span>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(item.costPerTon)} ₽</span>
                                 </div>
                                 <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-1.5">
                                    <span className="text-[10px] text-slate-500 font-medium">Сумма на весь заказ:</span>
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{formatCurrency(item.costPerTon * Number(orderWeight))} ₽</span>
                                 </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Overhead Costs */}
                    {commercialStats.economyData.filter(i => i.category === 'overhead' && i.costPerTon > 0).length > 0 && (
                      <div className="p-5 border-t border-slate-100 dark:border-slate-800">
                         <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Circle className="w-1.5 h-1.5 fill-amber-500 text-amber-500" />
                              Общие/Накладные расходы
                            </h4>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(commercialStats.overheadEconomyCostsPerTon)} руб./т</span>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {commercialStats.economyData.filter(i => i.category === 'overhead' && i.costPerTon > 0).map(item => (
                              <div key={item.id} className="bg-white dark:bg-[#1A1C19] p-3 rounded-[18px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                                 <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 truncate pr-2">{item.name}</span>
                                    <PieChart className="w-3 h-3 text-slate-300 shrink-0" />
                                 </div>
                                 <div className="space-y-1.5">
                                   <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-medium">Норма на тн:</span>
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(item.costPerTon)} ₽</span>
                                   </div>
                                   <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-1.5">
                                      <span className="text-[10px] text-slate-500 font-medium">Сумма на заказ:</span>
                                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{formatCurrency(item.costPerTon * Number(orderWeight))} ₽</span>
                                   </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
            )}
            
            {commercialStats && (
              <div className="grid grid-cols-1 gap-3 pt-4 relative z-10 font-sans tracking-tight">
                {commercialStats.netLossesPerTon > 0 && (
                  <div className="bg-[#FFF8E1] dark:bg-amber-900/10 border border-[#FFECB3] dark:border-amber-900/30 p-4 rounded-xl flex gap-3 shadow-sm transition-colors">
                    <Info className="w-5 h-5 text-[#E65100] dark:text-amber-500 shrink-0" />
                    <div>
                      <h5 className="font-semibold text-[#E65100] dark:text-amber-500 text-sm mb-1">Рекомендация по цене</h5>
                      <p className="text-[#E65100]/80 dark:text-amber-500/80 text-[11px] font-medium mb-2">
                        Чистые потери от отходов: <span className="font-bold">{formatCurrency(commercialStats.netLossesPerTon)} руб./т</span>.
                      </p>
                      <div className="inline-flex items-center bg-white/60 dark:bg-white/10 px-3 py-1.5 rounded-lg text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-white/10 shadow-sm">
                        Рекомендуемая цена: {formatCurrency(Number(sellPrice) + Number(commercialStats.netLossesPerTon))} руб./т (БЕЗ НДС)
                      </div>
                    </div>
                  </div>
                )}
                {commercialStats.profitPerTon > 0 && commercialStats.profitPerTon < 10000 && (
                  <div className="border border-[#FFECB3] dark:border-amber-900/30 p-4 rounded-xl flex gap-3 shadow-sm bg-white dark:bg-[#1A1C19] transition-colors">
                    <AlertTriangle className="w-5 h-5 text-[#E65100] dark:text-amber-500 shrink-0" />
                    <div>
                      <h5 className="font-semibold text-[#E65100] dark:text-amber-500 text-sm mb-1">Осторожно</h5>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Маржинальность на тонну меньше 10 000 руб. ({formatCurrency(commercialStats.profitPerTon)} руб./т).</p>
                    </div>
                  </div>
                )}
                {commercialStats.profitPerTon <= 0 && currentAdminRawPrice && sellPrice && (
                  <div className="bg-[#FFDAD6] dark:bg-red-900/20 border border-[#FFB4AB] dark:border-red-900/40 p-4 rounded-xl flex gap-3 shadow-sm transition-colors">
                    <AlertTriangle className="w-5 h-5 text-[#BA1A1A] dark:text-red-400 shrink-0" />
                    <div>
                      <h5 className="font-semibold text-[#BA1A1A] dark:text-red-400 text-sm mb-1">Сделка убыточна</h5>
                      <p className="text-[#BA1A1A]/80 dark:text-red-400/80 text-xs font-medium">Пересмотрите цену продажи или согласуйте новую длину.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  </div>
</div>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmClearAllHistory}
        title="Подтвердите действие"
        message={`Вы действительно хотите удалить историю расчетов (${savedCalculations.length} записей)? Это действие необратимо.`}
        confirmText="Удалить все"
        cancelText="Отмена"
      />
      <UserManualModal 
        isOpen={showManual}
        onClose={() => setShowManual(false)}
      />
    </>
  );
}
