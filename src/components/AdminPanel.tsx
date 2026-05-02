import { DEFAULT_STEEL_GRADES, formatInputValue, handleNumericInput, DEFAULT_ECONOMY_ITEMS, EconomyItem, ROUND_DATA, HEX_DATA, getGostForGrade } from "../lib/constants";
import { Activity, LogOut, Plus, Trash2, Settings, Moon, Sun, Info, TrendingUp, Calculator, Wallet, Layers, Package, Upload, FileText, X, BookOpen, ChevronLeft, Download, Copy, Check } from "lucide-react";
import { useEffect, useState, useRef, ChangeEvent, MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx-js-style";
import { BatchManualModal } from "./BatchManualModal";
import { StockManualModal } from "./StockManualModal";

interface CalculationResult {
  id: string;
  grade: string;
  diameter: number;
  billetDia: number;
  length: number;
  lengthType: "НД" | "МД";
  targetLength: number;
  quantity: number;
  billetLength: number;
  drawLength: number;
  usefulLength: number;
  techEnds: number;
  drawRatio: number;
  wastePercent: number;
  totalWeight: number;
  billetCount: number;
  pcsPerBillet: number;
  client: string;
  nomenclature: string;
  type: string;
  orderNo: string;
  shippingDate: string;
  internalNo: string;
  weightTons: number;
  remainingToProcess: number;
  price: number;
  totalCost: number;
  optimizedBilletLength?: number;
  optimizedKim?: number;
}

interface AdminPanelProps {
  initialRawPrices: Record<string, { md: string; nd: string }>;
  initialScrap: string;
  initialRemnant: string;
  initialCustomGrades: string[];
  initialDeletedGrades?: string[];
  initialRemnantPricing: Record<string, { round: string; hex: string }>;
  initialEconomyItems?: EconomyItem[];
  onSave: (
    rawPrices: Record<string, { md: string; nd: string }>,
    scrap: string,
    remnant: string,
    customGrades: string[],
    remnantPricing: Record<string, { round: string; hex: string }>,
    economyItems: EconomyItem[],
    deletedGrades?: string[]
  ) => Promise<void>;
  onLogout: () => void;
  isCloudActive: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
  initialTab?: "economy" | "supply";
  isPurchasingMode?: boolean;
}

export function AdminPanel({
  initialRawPrices,
  initialScrap,
  initialRemnant,
  initialCustomGrades,
  initialDeletedGrades,
  initialRemnantPricing,
  initialEconomyItems,
  onSave,
  onLogout,
  isCloudActive,
  isDarkMode,
  toggleTheme,
  initialTab = "economy",
  isPurchasingMode = false,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"economy" | "supply">(initialTab);
  const [rawPrices, setRawPrices] = useState<Record<string, { md: string; nd: string }>>(initialRawPrices);
  const [scrap, setScrap] = useState(initialScrap);
  const [remnant, setRemnant] = useState(initialRemnant);
  const [customGrades, setCustomGrades] = useState(initialCustomGrades || []);
  const [isBatchManualOpen, setIsBatchManualOpen] = useState(false);
  const [isStockManualOpen, setIsStockManualOpen] = useState(false);
  const [deletedGrades, setDeletedGrades] = useState<string[]>(initialDeletedGrades || []);
  const [remnantPricing, setRemnantPricing] = useState<Record<string, { round: string; hex: string }>>(initialRemnantPricing || {});
  const [economyItems, setEconomyItems] = useState<EconomyItem[]>(() => {
    if (!initialEconomyItems || initialEconomyItems.length === 0) return DEFAULT_ECONOMY_ITEMS;
    const initialMap = new Map(initialEconomyItems.map(item => [item.id, item]));
    return DEFAULT_ECONOMY_ITEMS.map(defaultItem => initialMap.get(defaultItem.id) || defaultItem);
  });

  const [newGrade, setNewGrade] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [adminSection, setAdminSection] = useState<"direct" | "prices" | "grades">("direct");
  const [supplySection, setSupplySection] = useState<"files" | "calc" | "stock" | "calc-stock">("files");
  const [isCopied, setIsCopied] = useState(false);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";
  };
  const [planFiles, setPlanFiles] = useState<{ id: string; name: string; size: string; date: string; file?: File }[]>([]);
  const [stockFiles, setStockFiles] = useState<{ id: string; name: string; size: string; date: string; file?: File }[]>([]);
  const [processedStock, setProcessedStock] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stockFileInputRef = useRef<HTMLInputElement>(null);

  // Calculation state
  const [calcLength, setCalcLength] = useState("6");
  const [calcQuantity, setCalcQuantity] = useState("100");
  const [calcWaste, setCalcWaste] = useState("3");
  const [calcKIM, setCalcKIM] = useState("0.92");

  // Supply Calculation Logic & Mock Data Extraction
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingStock, setIsProcessingStock] = useState(false);
  const [calculationResults, setCalculationResults] = useState<CalculationResult[]>([]);

  const applyAllOptimizations = () => {
    setCalculationResults(prev => prev.map(item => {
      if (item.optimizedBilletLength && item.optimizedBilletLength !== item.billetLength && item.optimizedKim && item.optimizedKim > (item.remainingToProcess / item.totalWeight) + 0.005) {
        const newBilletLength = item.optimizedBilletLength;
        const newDrawLen = newBilletLength * item.drawRatio;
        const newUsefulLen = newDrawLen / (item.type === "Шестигранник" ? 1.03 * 1.003 : 1.027 * 1.003);
        
        let newPcs = 0;
        let newActualUL = 0;
        if (item.lengthType === "НД") {
          for (let i = 1; i <= 20; i++) {
            const optLen = Math.floor(newUsefulLen / i) - 5;
            if (optLen >= 2500 && optLen <= 6500) {
              newPcs = i;
              newActualUL = newPcs * optLen;
              break;
            }
          }
          if (newPcs === 0) newActualUL = newUsefulLen;
        } else {
          newPcs = Math.floor(newUsefulLen / item.length);
          newActualUL = newPcs * item.length;
        }
        
        const newKim = newDrawLen > 0 ? newActualUL / newDrawLen : 0;
        const newTotalWeight = newKim > 0 ? item.remainingToProcess / newKim : item.remainingToProcess;
        const billetArea = item.type === "Шестигранник" 
          ? (Math.sqrt(3) / 2) * Math.pow(item.billetDia, 2)
          : (Math.PI * Math.pow(item.billetDia, 2)) / 4;
        const wPerM = billetArea * 0.00000785 * 1000;
        const singleBMass = (newBilletLength / 1000) * wPerM;
        const newBilletCount = singleBMass > 0 ? Math.ceil((newTotalWeight * 1000) / singleBMass) : 0;
        const gradePrices = rawPrices[item.grade] || { md: "0", nd: "0" };
        const basePr = parseFloat(gradePrices.nd || "0");
        const newPr = item.lengthType === "МД" ? basePr * 1.06 : basePr;
        const newTotCost = newTotalWeight * newPr;

        return {
          ...item,
          billetLength: newBilletLength,
          drawLength: newDrawLen,
          usefulLength: newUsefulLen,
          actualUsefulLength: newActualUL,
          kim: newKim,
          totalWeight: newTotalWeight,
          billetCount: newBilletCount,
          totalCost: newTotCost
        };
      }
      return item;
    }));
  };

  // Grab-to-scroll state for the table
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: MouseEvent) => {
    if (!tableContainerRef.current) return;
    setIsDragging(true);
    // Use pageX relative to container offset
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setScrollLeftState(tableContainerRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // adjust scrolling speed
    tableContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  // Synchronize prices in calculation results when rawPrices changes
  useEffect(() => {
    if (calculationResults.length === 0) return;
    
    setCalculationResults(prev => prev.map(res => {
      const gradePrices = rawPrices[res.grade] || { md: "0", nd: "0" };
      const price = res.lengthType === "МД" ? parseFloat(gradePrices.md || "0") : parseFloat(gradePrices.nd || "0");
      const totalCost = res.totalWeight * price;
      
      return {
        ...res,
        price,
        totalCost
      };
    }));
  }, [rawPrices]);

  // Helper for date formatting
  const formatDate = (input: any): string => {
    if (!input) return "";
    let dateObj: Date | null = null;
    
    if (typeof input === 'number') {
      // Excel date serial conversion
      dateObj = new Date(Math.round((input - 25569) * 86400 * 1000));
    } else if (typeof input === 'string' && input.trim()) {
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      } else {
        // Handle DD.MM.YYYY strings manually if browser can't parse them
        const parts = input.trim().split(/[.-/]/);
        if (parts.length === 3) {
          const d = parseInt(parts[0]);
          const m = parseInt(parts[1]) - 1;
          const y = parseInt(parts[2]);
          if (y > 1000 && m < 12 && d < 32) {
             dateObj = new Date(y, m, d);
          }
        }
      }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    }
    return String(input).trim();
  };

  const handleProcessPlans = async () => {
    if (planFiles.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const allExtractedData: Omit<CalculationResult, "billetDia" | "billetLength" | "drawRatio" | "drawLength" | "usefulLength" | "techEnds" | "wastePercent" | "totalWeight" | "billetCount" | "pcsPerBillet" | "targetLength" | "quantity" | "price" | "totalCost">[] = [];
      
      for (const fileObj of planFiles) {
        if (!fileObj.file) continue;
        
        const data = await fileObj.file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
          
          let startRow = 0;
          let colMap = {
            client: 1, // B
            nomenclature: 2, // C
            orderNo: 3, // D
            type: 5, // F
            grade: 6, // G
            size: 7, // H
            weight: 8, // I
            remaining: -1,
            shippingDate: -1, 
            internalNo: -1,
          };

          // Dynamically find header row and map columns
          for (let i = 0; i < Math.min(100, jsonData.length); i++) {
            const row = jsonData[i] || [];
            const rowStr = row.join(" ").toLowerCase();
            
            if (rowStr.includes("заказ") || rowStr.includes("клиент") || rowStr.includes("профиль") || rowStr.includes("марка") || rowStr.includes("размер") || rowStr.includes("кол-во") || rowStr.includes("вес") || rowStr.includes("номенклатура")) {
              startRow = i + 1;
              
              row.forEach((cell: any, colIdx: number) => {
                const cellStr = String(cell).toLowerCase().trim();
                
                // Specific mappings requested by user
                if (cellStr === "внутренний номер" || cellStr === "внутренняя нумерация") colMap.internalNo = colIdx;
                if (cellStr === "дата отгрузки") colMap.shippingDate = colIdx;
                if (cellStr === "клиент") colMap.client = colIdx;
                if (cellStr === "номенклатура") colMap.nomenclature = colIdx;
                if (cellStr === "№ заказа") colMap.orderNo = colIdx;
                if (cellStr === "кол-во" || cellStr === "кол-во тн") colMap.weight = colIdx;
                if (cellStr === "итого остаток к выполнению" || cellStr === "итого остаток выполнению" || cellStr === "остаток к выполнению" || cellStr === "остаток") colMap.remaining = colIdx;
                
                // Fallbacks and other fields
                if (colMap.internalNo === -1 && cellStr.includes("внутр") && (cellStr.includes("номер") || cellStr.includes("№"))) colMap.internalNo = colIdx;
                if (colMap.client === -1 && (cellStr.includes("клиент") || cellStr.includes("покупатель") || cellStr.includes("партнер"))) colMap.client = colIdx;
                if (colMap.nomenclature === -1 && (cellStr.includes("номенклатура") || cellStr.includes("наименование") || cellStr.includes("товар"))) colMap.nomenclature = colIdx;
                if (colMap.orderNo === -1 && cellStr.includes("заказ")) colMap.orderNo = colIdx;
                if (cellStr.includes("профиль") || cellStr.includes("тип")) colMap.type = colIdx;
                if (cellStr.includes("марка") || cellStr.includes("сталь") || cellStr.includes("материал")) colMap.grade = colIdx;
                if (cellStr.includes("размер") || cellStr.includes("диаметр")) colMap.size = colIdx;
                if (colMap.weight === -1 && (cellStr.includes("кол-во") || cellStr.includes("количество") || cellStr.includes("вес") || cellStr.includes("масса") || cellStr.includes("кг") || cellStr.includes("тн"))) colMap.weight = colIdx;
                if (colMap.shippingDate === -1 && (cellStr.includes("отгруз") || cellStr.includes("дата"))) colMap.shippingDate = colIdx;
              });
              break;
            }
          }
          
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i] || [];
            
            if (row.length === 0 || row.every((c: any) => !c || String(c).trim() === '')) continue;
            
            const orderNo = String(row[colMap.orderNo] || "").trim();
            const internalNo = colMap.internalNo !== -1 ? String(row[colMap.internalNo] || "").trim() : "";
            const shippingDate = formatDate(colMap.shippingDate !== -1 ? row[colMap.shippingDate] : "");

            const client = String(row[colMap.client] || "").trim();
            let nomenclature = String(row[colMap.nomenclature] || "");
            nomenclature = nomenclature.replace(/Прокат калиброванный/i, "").trim();
            
            const rawWeight = row[colMap.weight];
            let weightTons = typeof rawWeight === "number" ? rawWeight : parseFloat(String(rawWeight || "0").replace(/\s/g, "").replace(",", "."));
            if (isNaN(weightTons) || weightTons < 0) weightTons = 0;

            const rawRemaining = colMap.remaining !== -1 ? row[colMap.remaining] : null;
            let remainingToProcess = rawRemaining !== null ? (typeof rawRemaining === "number" ? rawRemaining : parseFloat(String(rawRemaining || "0").replace(/\s/g, "").replace(",", "."))) : weightTons;
            if (isNaN(remainingToProcess) || remainingToProcess < 0) remainingToProcess = weightTons;
            
            let typeStr = String(row[colMap.type] || nomenclature).toLowerCase();
            let type = typeStr.includes("шестигранник") || typeStr.includes("шестиг") ? "Шестигранник" : "Круг";
            let gradeStr = String(row[colMap.grade] || "").trim();
            let grade = gradeStr || "ст.35";
            
            // Fix for incorrect grade extraction
            if (grade.toUpperCase().includes("1050") || grade.toUpperCase().includes("1414") || grade.toUpperCase().includes("4543") || grade.toUpperCase().includes("ГОСТ") || gradeStr === "") {
              const gMatch = nomenclature.match(/(?:^|[^а-яА-ЯёЁa-zA-Z])(?:ст\.?|сталь)\s*([0-9a-zA-Zа-яА-Я-]+)/i);
              if (gMatch) {
                grade = "ст." + gMatch[1].toUpperCase();
              } else {
                const alloyMatch = nomenclature.match(/\b(\d{2}[ХхНнМмТтВвГгДд]+[0-9a-zA-Zа-яА-Я-]*)\b/);
                if (alloyMatch) {
                  grade = "ст." + alloyMatch[1].toUpperCase();
                } else {
                  if (grade.includes("1050")) grade = "ст.35";
                  else if (grade.includes("1414")) grade = "ст.А12";
                  else if (grade.includes("4543")) grade = "ст.40Х";
                  else grade = "ст.35";
                }
              }
            } else if (grade.toUpperCase().startsWith("СТ.")) {
               grade = "ст." + grade.substring(3).toUpperCase();
            } else if (grade.toUpperCase().startsWith("СТ")) {
               grade = "ст." + grade.substring(2).toUpperCase();
            } else if (grade.toUpperCase() !== "А12" && !grade.toLowerCase().startsWith("ст")) {
               grade = "ст." + grade.toUpperCase();
            } else if (grade.toUpperCase() === "А12") {
               grade = "ст.А12";
            }
            
            grade = grade.replace(/[хХxX]\s*\d{3,}$/i, '');
            
            const rawSize = row[colMap.size];
            let diameter = typeof rawSize === "number" ? rawSize : parseFloat(String(rawSize || "0").replace(/\s/g, "").replace(",", "."));
            if (isNaN(diameter) || diameter <= 0) {
              const sizeMatch = nomenclature.match(/(?:круг|шестигранник)\s*(?:калибровоченный|калибровочный|калиброванный|калибр\.?)?\s*(\d+(?:[.,]\d+)?)/i);
              if (sizeMatch) {
                diameter = parseFloat(sizeMatch[1].replace(",", "."));
              }
            }
            if (isNaN(diameter) || diameter < 0) diameter = 0;
            
            let length = 6000;
            let lengthType: "НД" | "МД" = "МД";
            
            const lengthMatch = nomenclature.match(/х\s*(\d+)/i);
            const nomClean = nomenclature.toUpperCase().replace(/\s/g, '');
            const lenTypeMatch = nomClean.match(/(М\/Д|МД|Н\/Д|НД)/);
            const isND = (lenTypeMatch && (lenTypeMatch[1] === "НД" || lenTypeMatch[1] === "Н/Д")) || nomClean.includes("НД") || nomClean.includes("Н.Д.") || nomClean.includes("Н/Д");
            
            if (lengthMatch && !isND) {
              length = parseInt(lengthMatch[1]);
              if (isNaN(length) || length <= 0) length = 6000;
            } else if (isND) {
              length = 6000; // Default to 6000 for calculations
            }
            lengthType = isND ? "НД" : "МД";

            allExtractedData.push({
              id: Math.random().toString(36).substring(7),
              client,
              nomenclature,
              type,
              grade,
              diameter,
              length,
              lengthType,
              weightTons,
              orderNo,
              shippingDate,
              internalNo,
              remainingToProcess
            });
          }
        }
      }

      if (allExtractedData.length === 0) {
        alert("Не удалось распознать данные.");
        setIsProcessing(false);
        return;
      }

      const processed: CalculationResult[] = allExtractedData.map(item => {
        const dataTable = item.type === "Шестигранник" ? HEX_DATA : ROUND_DATA;
        const match = dataTable.find(d => Math.abs(d.target - item.diameter) < 0.001);
        
        let billetDia = item.diameter ? item.diameter + 2 : 0;
        let drawRatio = match ? match.coef : (item.diameter > 0 ? Math.pow(billetDia, 2) / Math.pow(item.diameter, 2) : 1);
        
        if (match) {
          billetDia = match.raw;
        } else if (item.diameter > 0) {
          billetDia = item.diameter + 2;
          drawRatio = Math.pow(billetDia, 2) / Math.pow(item.diameter, 2);
        } else {
          billetDia = 0;
          drawRatio = 1;
        }
        
        let billetLength = 0;
        const totalTechCoef = item.type === "Шестигранник" ? 1.03 * 1.003 : 1.027 * 1.003;

                if (item.lengthType === "НД") {
          billetLength = 6000;
        } else {
          billetLength = 6000; // Default billet length is 6000, optimization is suggested via button
        }

        const drawLength = billetLength * drawRatio;
        const usefulLength = drawLength / totalTechCoef;
        const techEnds = drawLength - usefulLength;
        
        let piecesCount = 0;
        let actualUsefulLength = 0;

        if (item.lengthType === "НД") {
          for (let i = 1; i <= 20; i++) {
            const optLen = Math.floor(usefulLength / i) - 5;
            if (optLen >= 2500 && optLen <= 6500) {
              piecesCount = i;
              actualUsefulLength = piecesCount * optLen;
              break;
            }
          }
          if (piecesCount === 0) actualUsefulLength = usefulLength;
        } else {
          piecesCount = Math.floor(usefulLength / item.length);
          actualUsefulLength = piecesCount * item.length;
        }

        // --- Optimization Step for KIM improvement ---
        let optimizedBilletLength = billetLength;
        let optimizedKim = drawLength > 0 ? actualUsefulLength / drawLength : 0;

        if (item.lengthType === "МД" && item.length > 0) {
          const MIN_B = 4000;
          const MAX_B = Math.floor(8400 / drawRatio);
          const STEP = 100;
          
          for (let l = MIN_B; l <= MAX_B; l += STEP) {
            const dL = l * drawRatio;
            const uL = dL / totalTechCoef;
            const pCount = Math.floor(uL / item.length);
            if (pCount <= 0) continue;
            const aUL = pCount * item.length;
            const k = dL > 0 ? aUL / dL : 0;
            
            if (k > optimizedKim + 0.005) { // Suggest only if improvement > 0.5%
              optimizedKim = k;
              optimizedBilletLength = l;
            }
          }
        }
        // ----------------------------------------------

        const billetArea = item.type === "Шестигранник" 
          ? (Math.sqrt(3) / 2) * Math.pow(billetDia, 2)
          : (Math.PI * Math.pow(billetDia, 2)) / 4;
        const weightPerMBillet = billetArea * 0.00000785 * 1000; 

        const kim = drawLength > 0 ? actualUsefulLength / drawLength : 0;
        const totalWeight = kim > 0 ? item.remainingToProcess / kim : item.remainingToProcess;
        
        const singleBilletMass = (billetLength / 1000) * weightPerMBillet;
        const billetCount = singleBilletMass > 0 ? Math.ceil((totalWeight * 1000) / singleBilletMass) : 0;

        const gradePrices = rawPrices[item.grade] || { md: "0", nd: "0" };
        const basePrice = parseFloat(gradePrices.nd || "0");
        const price = item.lengthType === "МД" ? basePrice * 1.06 : basePrice;
        const totalCost = totalWeight * price;

        return {
          ...item,
          billetDia,
          billetLength,
          drawRatio,
          drawLength,
          usefulLength,
          techEnds,
          wastePercent: (1 - kim) * 100,
          totalWeight,
          billetCount,
          pcsPerBillet: piecesCount || 1,
          targetLength: item.length,
          quantity: billetCount,
          price,
          totalCost,
          optimizedBilletLength,
          optimizedKim
        } as CalculationResult;
      });

      setCalculationResults(processed);
    } catch (err) {
      console.error("Error processing files:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessStock = async () => {
    if (stockFiles.length === 0) return;
    setIsProcessingStock(true);
    
    try {
      const extractedStock: any[] = [];
      
      for (const fileObj of stockFiles) {
        if (!fileObj.file) continue;
        
        const data = await fileObj.file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
          
          let startRow = 0;
          let nomCol = -1;
          let weightCol = -1;
          
          for (let i = 0; i < Math.min(100, jsonData.length); i++) {
            const rowStr = jsonData[i].join(" ").toLowerCase();
            if (rowStr.includes("номенклатура") || rowStr.includes("остаток")) {
              startRow = i + 1;
              jsonData[i].forEach((cell: any, idx: number) => {
                const c = String(cell).toLowerCase().trim();
                if (c.includes("номенклатура") || c.includes("наименование")) nomCol = idx;
                if (c.includes("конечный остаток") || c.includes("остаток") || c.includes("кол-во")) weightCol = idx;
              });
              break;
            }
          }
          
          if (nomCol === -1 || weightCol === -1) continue;
          
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i] || [];
            if (!row[nomCol]) continue;
            
            const rawNom = String(row[nomCol]).trim();
            const rawWeight = row[weightCol];
            let weight = typeof rawWeight === "number" ? rawWeight : parseFloat(String(rawWeight || "0").replace(/\s/g, "").replace(",", "."));
            if (isNaN(weight) || weight <= 0.0001) continue;
            
            let profile = "круг";
            if (rawNom.toLowerCase().includes("шестиг")) profile = "шестигранник";
            
            let grade = "ст.35";
            const gMatch = rawNom.match(/(?:^|[^а-яА-ЯёЁa-zA-Z])(?:ст\.?|сталь)\s*([0-9a-zA-Zа-яА-Я-]+)/i);
            if (gMatch) {
              grade = "ст." + gMatch[1].toUpperCase();
            } else {
               const alloyMatch = rawNom.match(/\b(\d{2}[ХхНнМмТтВвГгДд]+[0-9a-zA-Zа-яА-Я-]*)\b/);
               if (alloyMatch) grade = "ст." + alloyMatch[1].toUpperCase();
            }
            grade = grade.replace(/[хХxX]\s*\d{3,}$/i, '');
            
            let diameter = "";
            const sizeMatch = rawNom.match(/(?:круг|шестигранник)\s*(?:калибровоченный|калибровочный|калиброванный|калибр\.?)?\s*(\d+(?:[.,]\d+)?)/i);
            if (sizeMatch) {
                diameter = sizeMatch[1];
            } else {
                const sizeFallback = rawNom.match(/\s+(\d+(?:[.,]\d+)?)\s*(?:мм)?\s*/i);
                if (sizeFallback && !sizeFallback[1].includes("1050") && !sizeFallback[1].includes("7417") && !sizeFallback[1].includes("2590")) {
                    diameter = sizeFallback[1];
                }
            }
            
            const nomUpper = rawNom.toUpperCase();
            const nomClean = nomUpper.replace(/\s/g, '');
            
            let lengthType = "Н/Д";
            
            // Парсинг М/Д, МД, Н/Д
            const mdMatch = nomClean.match(/(?:М\/Д|МД)(\d+)?/);
            const ndSlashMatch = nomClean.match(/Н\/Д(\d+)?/);
            const ndMatch = nomClean.includes("НД");
            
            if (mdMatch) {
              const val = mdMatch[1] === "6000" || !mdMatch[1] ? "6000" : mdMatch[1];
              lengthType = "МД " + val;
            }

            extractedStock.push({
              "Исходная Номенклатура": rawNom,
              "Профиль": profile,
              "НТД": getGostForGrade(grade) + " / ГОСТ 2590-2006",
              "Марка стали": grade,
              "Размер": diameter,
              "Длина": lengthType,
              "Конечный остаток тн.": weight
            });
          }
        }
      }
      
      if (extractedStock.length === 0) {
        alert("Не удалось извлечь остатки из загруженных файлов.");
        return;
      }
      
      setProcessedStock(extractedStock);
      
    } catch (err) {
      console.error("Error processing stock files:", err);
    } finally {
      setIsProcessingStock(false);
    }
  };

  const handleCopyForSheets = async () => {
    if (processedStock.length === 0) return;
    
    const keys = Object.keys(processedStock[0]);
    const headerRow = keys.join("\t");
    const rows = processedStock.map(row => 
      keys.map(key => {
        const val = row[key];
        return String(val ?? "").replace(/\t/g, " ").replace(/\n/g, " ");
      }).join("\t")
    );
    
    const tsvData = [headerRow, ...rows].join("\n");
    
    try {
      await navigator.clipboard.writeText(tsvData);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Ошибка копирования: ", err);
      alert("Не удалось скопировать данные.");
    }
  };

  const handleExportStock = () => {
    if (processedStock.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(processedStock);
    const wscols = Object.keys(processedStock[0]).map(key => ({ wch: Math.max(key.length, 15) }));
    wscols[0].wch = 50;
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Остатки_Склад");
    XLSX.writeFile(workbook, "Остатки_обработанные.xlsx");
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        file: file
      }));
      setPlanFiles(prev => [...newFiles, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStockFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        file: file
      }));
      setStockFiles(prev => [...newFiles, ...prev]);
      if (stockFileInputRef.current) stockFileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setPlanFiles(prev => prev.filter(f => f.id !== id));
  };

  const removeStockFile = (id: string) => {
    setStockFiles(prev => prev.filter(f => f.id !== id));
  };

  useEffect(() => {
    if (stockFiles.length > 0) {
      handleProcessStock();
    } else {
      setProcessedStock([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockFiles]);

  useEffect(() => {
    if (planFiles.length > 0) {
      handleProcessPlans();
    } else {
      setCalculationResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFiles]);

  useEffect(() => {
    setRawPrices(prev => JSON.stringify(prev) === JSON.stringify(initialRawPrices) ? prev : initialRawPrices);
    setScrap(prev => prev === initialScrap ? prev : initialScrap);
    setRemnant(prev => prev === initialRemnant ? prev : initialRemnant);
    setCustomGrades(prev => JSON.stringify(prev) === JSON.stringify(initialCustomGrades || []) ? prev : (initialCustomGrades || []));
    setDeletedGrades(prev => JSON.stringify(prev) === JSON.stringify(initialDeletedGrades || []) ? prev : (initialDeletedGrades || []));
    setRemnantPricing(prev => JSON.stringify(prev) === JSON.stringify(initialRemnantPricing || {}) ? prev : (initialRemnantPricing || {}));
    
    if (initialEconomyItems && initialEconomyItems.length > 0) {
      setEconomyItems(prev => {
        const initialMap = new Map(initialEconomyItems.map(item => [item.id, item]));
        const merged = DEFAULT_ECONOMY_ITEMS.map(defaultItem => initialMap.get(defaultItem.id) || defaultItem);
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        return merged;
      });
    }
  }, [initialRawPrices, initialScrap, initialRemnant, initialCustomGrades, initialDeletedGrades, initialRemnantPricing, initialEconomyItems]);

  const allGrades = [...DEFAULT_STEEL_GRADES, ...customGrades].filter(g => !deletedGrades.includes(g));

  const RemnantPricingTooltip = () => (
    <div className="group relative inline-block ml-1 align-middle">
      <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 cursor-help" />
      <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#1A1C19] dark:bg-slate-700 text-white text-[10px] rounded-xl shadow-2xl w-60 z-[100] transition-all normal-case font-normal text-left border border-slate-700">
        <div className="font-bold mb-1 border-b border-white/10 pb-1 text-[11px]">Типы остатков</div>
        <div className="space-y-2 opacity-95">
          <div>
            <span className="text-sky-300 font-bold uppercase tracking-tighter">Деловой остаток:</span>
            <p className="mt-0.5 leading-relaxed">Длинные куски (обычно &gt;2.5м), которые можно продать как полноценную заготовку по цене делового остатка.</p>
          </div>
          <div>
            <span className="text-red-400 font-bold uppercase tracking-tighter">По цене лома:</span>
            <p className="mt-0.5 leading-relaxed">Мелкие обрезки и технические концы, которые не имеют складской ценности и продаются по весу лома.</p>
          </div>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1A1C19] dark:border-t-slate-700"></div>
      </div>
    </div>
  );

  const [copySuccess, setCopySuccess] = useState(false);

  const handlePriceChange = (grade: string, type: 'md' | 'nd', value: string) => {
    let val = value.replace(/\s/g, "").replace(/,/g, ".");
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setRawPrices((prev) => {
        const current = prev[grade] || { md: '', nd: '' };
        const otherType = type === 'md' ? 'nd' : 'md';
        
        // If the prices were identical or other was empty, keep them synchronized
        const shouldSync = !current.md || !current.nd || current.md === current.nd;
        
        return { 
          ...prev, 
          [grade]: { 
            ...current, 
            [type]: val,
            ...(shouldSync ? { [otherType]: val } : {})
          } 
        };
      });
    }
  };

  const handlePricingChange = (grade: string, profile: "round" | "hex", value: string) => {
    setRemnantPricing((prev) => ({
      ...prev,
      [grade]: {
        ...(prev[grade] || { round: "remnant", hex: "remnant" }),
        [profile]: value,
      },
    }));
  };

  const handleAddGrade = () => {
    const grade = newGrade.trim();
    if (grade && !allGrades.includes(grade)) {
      setCustomGrades([...customGrades, grade]);
      setRawPrices({ ...rawPrices, [grade]: { md: '', nd: '' } });
      setNewGrade("");
    }
  };

  const handleRemoveGrade = (gradeToRemove: string) => {
    if (DEFAULT_STEEL_GRADES.includes(gradeToRemove)) {
      setDeletedGrades([...deletedGrades, gradeToRemove]);
    } else {
      setCustomGrades(customGrades.filter((g) => g !== gradeToRemove));
    }

    const newPrices = { ...rawPrices };
    delete newPrices[gradeToRemove];
    setRawPrices(newPrices);

    const newPricing = { ...remnantPricing };
    delete newPricing[gradeToRemove];
    setRemnantPricing(newPricing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError("");
    try {
      const savePromise = onSave(rawPrices, scrap, remnant, customGrades, remnantPricing, economyItems, deletedGrades);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("CloudTimeout")), 5000)
      );

      await Promise.race([savePromise, timeoutPromise]);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Ошибка сохранения:", e);
      setSaveError("Облако недоступно. Сохранено локально.");
      setTimeout(() => setSaveError(""), 4000);
    }
    setIsSaving(false);
  };

  const handleEconomyChange = (id: string, field: keyof EconomyItem, value: string) => {
    const val = value.replace(/\s/g, "").replace(/,/g, ".");
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setEconomyItems(prev => prev.map(item => 
        item.id === id ? { ...item, [field]: val } : item
      ));
    }
  };

  const directItems = economyItems.filter(i => i.category === 'direct');
  const overheadItems = economyItems.filter(i => i.category === 'overhead');

  return (
    <div className="min-h-screen bg-[#F4F5F4] dark:bg-[#121411] flex flex-col md:flex-row transition-colors duration-300">
      {/* Mobile App Navigation Bar */}
      <div className="md:hidden fixed bottom-0 w-full bg-white/95 dark:bg-[#1A1C19]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-between items-center h-16 px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         {!isPurchasingMode && (
           <button 
             onClick={() => setActiveTab("economy")}
             className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${activeTab === 'economy' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
           >
             <div className={`px-4 py-1 rounded-full mb-1 transition-colors ${activeTab === 'economy' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
               <TrendingUp className="w-5 h-5" />
             </div>
             <span className="text-[10px] font-bold tracking-tight">Экономика</span>
           </button>
         )}

         <button 
           onClick={() => setActiveTab("supply")}
           className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${activeTab === 'supply' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
         >
           <div className={`px-4 py-1 rounded-full mb-1 transition-colors ${activeTab === 'supply' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
             <Package className="w-5 h-5" />
           </div>
           <span className="text-[10px] font-bold tracking-tight">Снабжение</span>
         </button>

         <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 mx-1"></div>

         <button onClick={toggleTheme} className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-400 dark:text-slate-500 active:scale-95 transition-all">
           <div className="px-3 py-1 mb-1">
             {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
           </div>
           <span className="text-[10px] font-bold tracking-tight">Тема</span>
         </button>

         <button onClick={onLogout} className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-all">
           <div className="px-3 py-1 mb-1">
             <LogOut className="w-5 h-5" />
           </div>
           <span className="text-[10px] font-bold tracking-tight font-sans">Выйти</span>
         </button>
      </div>

      {/* Desktop Navigation Rail */}
      <div className="hidden md:flex flex-col w-[88px] bg-[#F0F4F4] dark:bg-[#1A1C19] border-r border-slate-200 dark:border-slate-800 items-center py-6 fixed h-full z-50">
        <div className="flex flex-col items-center mb-8">
           <div className="w-12 h-12 bg-slate-700 dark:bg-slate-600 rounded-xl flex items-center justify-center text-white mb-2 shadow-sm">
             <Calculator className="w-6 h-6" />
           </div>
        </div>
        <div className="flex-1 flex flex-col gap-4 w-full px-3">
           {!isPurchasingMode && (
             <button 
               onClick={() => setActiveTab("economy")}
               className={`w-full flex flex-col items-center justify-center py-4 transition-all active:scale-95 group ${activeTab === 'economy' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
             >
               <div className={`px-5 py-1.5 mb-1.5 rounded-full transition-colors ${activeTab === 'economy' ? 'bg-slate-200 dark:bg-slate-700' : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}`}>
                 <TrendingUp className="w-6 h-6" strokeWidth={2} />
               </div>
               <span className="text-[11px] font-medium tracking-wide">Экономика</span>
             </button>
           )}

           <button 
             onClick={() => setActiveTab("supply")}
             className={`w-full flex flex-col items-center justify-center py-4 transition-all active:scale-95 group ${activeTab === 'supply' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <div className={`px-5 py-1.5 mb-1.5 rounded-full transition-colors ${activeTab === 'supply' ? 'bg-slate-200 dark:bg-slate-700' : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}`}>
               <Package className="w-6 h-6" strokeWidth={2} />
             </div>
             <span className="text-[11px] font-medium tracking-wide">Снабжение</span>
           </button>

           <button onClick={toggleTheme} className="w-full flex flex-col items-center justify-center py-4 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 group">
              <div className="px-5 py-1.5 mb-1.5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800 rounded-full">
                {isDarkMode ? <Sun className="w-6 h-6 text-amber-500" strokeWidth={2} /> : <Moon className="w-6 h-6" strokeWidth={2} />}
              </div>
              <span className="text-[11px] font-medium tracking-wide">{isDarkMode ? 'Светлая' : 'Темная'}</span>
           </button>
        </div>
        <div className="w-full px-3">
           <button onClick={onLogout} className="w-full flex flex-col items-center justify-center py-4 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
             <div className="px-5 py-1.5 mb-1.5">
               <LogOut className="w-6 h-6" strokeWidth={2} />
             </div>
             <span className="text-[11px] font-medium tracking-wide">Выйти</span>
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[88px] pb-24 md:pb-8 pt-8 px-4 sm:px-8 w-full">
        <AnimatePresence mode="wait">
          {activeTab === "supply" && (
            <motion.div
              key="supply"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-[#1A1C19] dark:text-white">
                    Снабжение и закупки
                  </h2>
                  <p className="text-sm text-[#43483F] dark:text-slate-400 mt-2 max-w-2xl">
                    Управление реестром поставок, складскими остатками и расчет потребности в сырье.
                  </p>
                </div>
              </div>

              {/* Sub-navigation for Supply */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-white dark:bg-[#1A1C19] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                  <button
                    onClick={() => setSupplySection("files")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      supplySection === "files" 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Файлы
                  </button>
                  <button
                    onClick={() => setSupplySection("calc")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      supplySection === "calc" 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Потребность
                  </button>
                  <button
                    onClick={() => setSupplySection("stock")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      supplySection === "stock" 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Наличие
                  </button>
                  <button
                    onClick={() => setSupplySection("calc-stock")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all border border-transparent ${
                      supplySection === "calc-stock" 
                        ? "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" 
                        : "text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 outline outline-1 outline-slate-200 dark:outline-slate-800 outline-offset-[-1px] hover:bg-sky-50 dark:hover:bg-sky-900/10 ml-2"
                    }`}
                  >
                    Расчет с учетом наличия
                  </button>
                </div>
                
                {supplySection === "calc" && calculationResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const headers = ["НТД", "Профиль", "Марка заг.", "Размер мм. (Заг.)", "Длина мм.", "Кол-во тн заг."];
                        if (!isPurchasingMode) headers.push("Сумма (руб)");

                        const rows = Object.entries<{weight: number, count: number, cost: number}>(
                          calculationResults.reduce((acc, curr) => {
                            const label = curr.lengthType === "НД" ? "НД" : `МД ${curr.billetLength}`;
                            const key = `${curr.grade} | ${curr.billetDia} | ${label}`;
                            if (!acc[key]) acc[key] = { weight: 0, count: 0, cost: 0 };
                            acc[key].weight += curr.totalWeight;
                            acc[key].count += curr.billetCount || 0;
                            acc[key].cost += curr.totalCost || 0;
                            return acc;
                          }, {} as Record<string, {weight: number, count: number, cost: number}>)
                        )
                        .filter(([_, data]) => data.weight >= 0.0005)
                        .sort((a, b) => b[1].weight - a[1].weight)
                        .map(([key, data]) => {
                          const [grade, size, length] = key.split(' | ');
                          const row = [
                            `ГОСТ 2590-2006/${getGostForGrade(grade)}`,
                            "Круг",
                            grade,
                            String(size).replace(".", ","),
                            length,
                            String(data.weight.toFixed(3)).replace(".", ",")
                          ];
                          if (!isPurchasingMode) row.push(String(Math.round(data.cost)).replace(".", ","));
                          return row;
                        });

                        const tsv = [headers, ...rows].map(row => row.join("\t")).join("\n");
                        navigator.clipboard.writeText(tsv);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        copySuccess 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                      title="Скопировать заявку для вставки (Ctrl+V) в Google Таблицы"
                    >
                      {copySuccess ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Скопировано!
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          Копировать заявку
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        const headers = ["НТД", "Профиль", "Марка заг.", "Размер мм. (Заг.)", "Длина мм.", "Кол-во тн заг."];
                        if (!isPurchasingMode) headers.push("Сумма (руб)");

                        const rows = Object.entries<{weight: number, count: number, cost: number}>(
                          calculationResults.reduce((acc, curr) => {
                            const label = curr.lengthType === "НД" ? "НД" : `МД ${curr.billetLength}`;
                            const key = `${curr.grade} | ${curr.billetDia} | ${label}`;
                            if (!acc[key]) acc[key] = { weight: 0, count: 0, cost: 0 };
                            acc[key].weight += curr.totalWeight;
                            acc[key].count += curr.billetCount || 0;
                            acc[key].cost += curr.totalCost || 0;
                            return acc;
                          }, {} as Record<string, {weight: number, count: number, cost: number}>)
                        )
                        .filter(([_, data]) => data.weight >= 0.0005)
                        .sort((a, b) => b[1].weight - a[1].weight)
                        .map(([key, data]) => {
                          const [grade, size, length] = key.split(' | ');
                          const row = [
                            `ГОСТ 2590-2006/${getGostForGrade(grade)}`,
                            "Круг",
                            grade,
                            String(size).replace(".", ","),
                            length,
                            String(data.weight.toFixed(3)).replace(".", ",")
                          ];
                          if (!isPurchasingMode) row.push(String(Math.round(data.cost)).replace(".", ","));
                          return row;
                        });

                        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                        
                        for (let R = range.s.r; R <= range.e.r; ++R) {
                          for (let C = range.s.c; C <= range.e.c; ++C) {
                            const cell_address = { c: C, r: R };
                            const cell_ref = XLSX.utils.encode_cell(cell_address);
                            if (!worksheet[cell_ref]) continue;

                            worksheet[cell_ref].s = {
                              font: { sz: 8 },
                              alignment: { 
                                horizontal: "center", 
                                vertical: "center"
                              }
                            };
                            
                            if (R === 0) {
                              worksheet[cell_ref].s.font.bold = true;
                            }
                          }
                        }

                        worksheet["!views"] = [{ state: "frozen", ySplit: 1 }];
                        const out_wcut = [
                            { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
                        ];
                        worksheet["!cols"] = out_wcut;
                        
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "Заявка");
                        XLSX.writeFile(workbook, "Заявка_на_сырье.xlsx");
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Скачать заявку 
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {supplySection === "files" ? (
                  <motion.div
                    key="supply-files"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-8"
                  >
                    {/* File Upload Section */}
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-2 px-1">
                        <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Планы производства</h3>
                      </div>
                      
                      <div className="relative">
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              const event = { target: { files } } as unknown as ChangeEvent<HTMLInputElement>;
                              handleFileUpload(event);
                            }
                          }}
                          className="bg-white dark:bg-[#1A1C19] rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center gap-4 group cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-sm"
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden" 
                            multiple
                            accept=".pdf,.xlsx,.csv,.txt,.docx"
                          />
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                            <Upload className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900 dark:text-white">Нажмите или перетащите файл</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Excel или CSV файлы планов</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsBatchManualOpen(true);
                          }}
                          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white dark:bg-[#1A1C19] hover:bg-slate-100 dark:hover:bg-[#252824] text-slate-600 dark:text-[#E2E3DE] rounded-xl transition-all focus:outline-none border border-slate-200 dark:border-[#2C2F2B] shadow-sm z-10"
                          title="Инструкция по расчетам"
                        >
                          <BookOpen className="w-5 h-5" />
                        </button>
                      </div>

                      {planFiles.length > 0 && (
                        <div className="bg-white dark:bg-[#1A1C19] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Загруженные файлы</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full">{planFiles.length} файлов</span>
                              {isProcessing && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 font-medium">
                                  <div className="w-3 h-3 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                                  Расчет...
                                </div>
                              )}
                              {!isProcessing && calculationResults.length > 0 && (
                                <motion.button 
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => setSupplySection("calc")}
                                  className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-[10px] font-bold px-4 py-1.5 rounded-full hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-all flex items-center gap-2"
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                  <span>Показать расчеты</span>
                                </motion.button>
                              )}
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {planFiles.map(file => (
                              <div key={file.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors px-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{file.name}</h4>
                                    <p className="text-[10px] font-medium text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>{file.size}</span>
                                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                      <span>{file.date}</span>
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => removeFile(file.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stock Inventory Section */}
                      <div className="flex items-center gap-2 px-1 mt-4">
                        <Layers className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Наличие на складе (г/к прокат)</h3>
                      </div>
                      
                      <div className="relative">
                        <div 
                          onClick={() => stockFileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              const event = { target: { files } } as unknown as ChangeEvent<HTMLInputElement>;
                              handleStockFileUpload(event);
                            }
                          }}
                          className="bg-white dark:bg-[#1A1C19] rounded-[24px] border-2 border-dashed border-sky-200 dark:border-sky-900/30 p-12 flex flex-col items-center justify-center text-center gap-4 group cursor-pointer hover:border-sky-400 dark:hover:border-sky-700 transition-all shadow-sm"
                        >
                          <input 
                            type="file" 
                            ref={stockFileInputRef}
                            onChange={handleStockFileUpload}
                            className="hidden" 
                            multiple
                            accept=".pdf,.xlsx,.csv,.txt,.docx"
                          />
                          <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center text-sky-400 group-hover:text-sky-600 transition-colors">
                            <Layers className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900 dark:text-white">Загрузить реестр склада</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Остатки горячекатаного проката в любом формате</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsStockManualOpen(true);
                              }}
                              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium text-sm mt-3 underline"
                            >
                              Как правильно подготовить файл склада?
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsStockManualOpen(true);
                          }}
                          className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-white dark:bg-[#1A1C19] hover:bg-slate-100 dark:hover:bg-[#252824] text-slate-600 dark:text-[#E2E3DE] rounded-xl transition-all focus:outline-none border border-slate-200 dark:border-[#2C2F2B] shadow-sm z-10"
                          title="Инструкция по складу"
                        >
                          <BookOpen className="w-5 h-5" />
                        </button>
                      </div>

                      {stockFiles.length > 0 && (
                        <div className="bg-white dark:bg-[#1A1C19] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Загруженные файлы склада</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 px-2.5 py-1 rounded-full">{stockFiles.length} файлов</span>
                              
                              {isProcessingStock && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 font-medium">
                                  <div className="w-3 h-3 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                  Обработка...
                                </div>
                              )}

                              {!isProcessingStock && processedStock.length > 0 && (
                                <motion.button 
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => setSupplySection("stock")}
                                  className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-[10px] font-bold px-4 py-1.5 rounded-full hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-all flex items-center gap-2"
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>Показать наличие</span>
                                </motion.button>
                              )}
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {stockFiles.map(file => (
                              <div key={file.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors px-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                                    <Layers className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{file.name}</h4>
                                    <p className="text-[10px] font-medium text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>{file.size}</span>
                                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                      <span>{file.date}</span>
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeStockFile(file.id);
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : supplySection === "stock" ? (
                  <motion.div
                    key="supply-stock"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-8"
                  >
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1C19] p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                           <Layers className="w-6 h-6" />
                         </div>
                         <div>
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white">Актуальные остатки</h3>
                           <div className="flex items-center gap-3 mt-1 text-sm font-medium">
                             <span className="text-slate-500">Обнаружено {processedStock.length} позиций</span>
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                             <span className="text-emerald-600 dark:text-emerald-400 font-black">
                               Итого: {processedStock.reduce((acc, curr) => acc + (typeof curr["Конечный остаток тн."] === 'number' ? curr["Конечный остаток тн."] : parseFloat(curr["Конечный остаток тн."]) || 0), 0).toFixed(3)} тн.
                             </span>
                           </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <button 
                           onClick={handleCopyForSheets}
                           className="h-12 px-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-bold transition-all flex items-center gap-2"
                         >
                           {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                           {isCopied ? <span className="text-emerald-500">Скопировано!</span> : "Копировать для sheets"}
                         </button>
                         <button 
                           onClick={handleExportStock}
                           className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                         >
                           <Download className="w-4 h-4" />
                           Скачать Excel
                         </button>
                      </div>
                   </div>

                   <div className="bg-white dark:bg-[#1A1C19] rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                      <div className="overflow-auto custom-scrollbar max-h-[calc(100vh-300px)] min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 sticky top-0 z-10 shadow-sm">
                            <tr>
                              <th className="px-8 py-5 bg-[#F8FAFC] dark:bg-[#1A1C19] sticky top-0 uppercase tracking-widest text-[10px]">Номенклатура</th>
                              <th className="px-6 py-5 bg-[#F8FAFC] dark:bg-[#1A1C19] sticky top-0 uppercase tracking-widest text-[10px]">Профиль</th>
                              <th className="px-6 py-5 text-center bg-[#F8FAFC] dark:bg-[#1A1C19] sticky top-0 uppercase tracking-widest text-[10px]">Сталь</th>
                              <th className="px-6 py-5 text-center bg-[#F8FAFC] dark:bg-[#1A1C19] sticky top-0 uppercase tracking-widest text-[10px]">Размер</th>
                              <th className="px-6 py-5 text-center bg-[#F8FAFC] dark:bg-[#1A1C19] sticky top-0 uppercase tracking-widest text-[10px]">Длина</th>
                              <th className="px-8 py-5 text-right bg-[#F8FAFC] dark:bg-[#1A1C19] sticky top-0 uppercase tracking-widest text-[10px]">Тн.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {processedStock.map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-8 py-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                  <div className="max-w-[300px] truncate font-mono text-[10px]" title={row["Исходная Номенклатура"]}>
                                    {row["Исходная Номенклатура"]}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-bold">{row["Профиль"]}</span>
                                </td>
                                <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">{row["Марка стали"]}</td>
                                <td className="px-6 py-4 text-center">
                                   <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full font-black">
                                     Ø {row["Размер"]}
                                   </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                   <span className="px-3 py-1 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-lg font-black">{row["Длина"]}</span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                   <span className="text-slate-900 dark:text-white font-black text-xs">{row["Конечный остаток тн."]}</span>
                                   <span className="ml-1 text-[10px] text-slate-400 font-bold">тн</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                   </div>
                  </motion.div>
                ) : supplySection === "calc" ? (
                  <motion.div
                    key="supply-calc"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-8"
                  >
                    {calculationResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-[#1A1C19]/40 rounded-[40px] border border-slate-100 dark:border-slate-800/50">
                        <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-[30px] flex items-center justify-center text-sky-500 mb-6">
                          <Calculator className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Нет данных</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-sm px-6 leading-relaxed">
                          Загрузите планы производства во вкладке «Файлы». Система автоматически выполнит расчет потребностей.
                        </p>
                        
                        {isProcessing && (
                          <div className="mt-8 flex items-center gap-3 h-12 px-8 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></div>
                            Идет расчет...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        <div className={`grid grid-cols-1 ${!isPurchasingMode ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
                          {!isPurchasingMode && (
                            <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 p-6 rounded-[24px] flex flex-col justify-center">
                              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-500 uppercase tracking-widest">Общая стоимость (без НДС)</span>
                              <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mt-1">
                                {Math.round(calculationResults.reduce((acc, curr) => acc + (curr.totalCost || 0), 0)).toLocaleString()} <span className="text-lg font-normal">₽</span>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-violet-100 dark:border-violet-900/30">
                                <div className="mb-2">
                                  <span className="text-[9px] font-bold text-violet-500/60 uppercase tracking-wider">ср/цена на закупку г/к проката</span>
                                </div>
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                                  {Object.entries<{ totalCost: number; totalWeight: number }>(
                                    calculationResults.reduce((acc, curr) => {
                                      const key = curr.grade;
                                      if (!acc[key]) acc[key] = { totalCost: 0, totalWeight: 0 };
                                      acc[key].totalCost += curr.totalCost || 0;
                                      acc[key].totalWeight += curr.totalWeight;
                                      return acc;
                                    }, {} as Record<string, { totalCost: number; totalWeight: number }>)
                                  )
                                    .map(([grade, data]) => ({
                                      grade,
                                      avgPrice: data.totalWeight > 0 ? data.totalCost / data.totalWeight : 0
                                    }))
                                    .sort((a, b) => b.avgPrice - a.avgPrice)
                                    .map(({ grade, avgPrice }) => (
                                      <div key={grade} className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">{grade}</span>
                                        <span className="text-violet-600 dark:text-violet-400 font-bold">
                                          {Math.round(avgPrice).toLocaleString()} ₽/тн
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 p-6 rounded-[24px] flex flex-col relative shadow-sm transition-all hover:shadow-md">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 dark:bg-sky-500/10 rounded-bl-[64px] rounded-tr-[24px] pointer-events-none"></div>
                            <div className="z-10 flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                                  <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Итого заготовка</h3>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none h-[40px] flex items-baseline">
                                    {calculationResults.reduce((acc, curr) => acc + curr.totalWeight, 0).toFixed(3)}
                                  </span>
                                  <span className="text-sm font-bold text-slate-400">тн</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const headers = ["НТД", "Профиль", "Марка заг.", "Размер мм.", "Длина", "Кол-во тн"];
                                  if (!isPurchasingMode) headers.push("Сумма (руб)");

                                  const rows = Object.entries<{weight: number, count: number, cost: number}>(
                                    calculationResults.reduce((acc, curr) => {
                                      const label = curr.lengthType === "НД" ? "НД" : `МД ${curr.billetLength}`;
                                      const key = `${curr.grade} | ${curr.billetDia} | ${label}`;
                                      if (!acc[key]) acc[key] = { weight: 0, count: 0, cost: 0 };
                                      acc[key].weight += curr.totalWeight;
                                      acc[key].count += curr.billetCount || 0;
                                      acc[key].cost += curr.totalCost || 0;
                                      return acc;
                                    }, {} as Record<string, {weight: number, count: number, cost: number}>)
                                  )
                                  .filter(([_, data]) => data.weight >= 0.0005)
                                  .sort((a, b) => b[1].weight - a[1].weight)
                                  .map(([key, data]) => {
                                    const [grade, size, length] = key.split(' | ');
                                    const row = [
                                      `ГОСТ 2590-2006/${getGostForGrade(grade)}`,
                                      "Круг",
                                      grade,
                                      String(size).replace(".", ","),
                                      length,
                                      String(data.weight.toFixed(3)).replace(".", ",")
                                    ];
                                    if (!isPurchasingMode) row.push(String(Math.round(data.cost)).replace(".", ","));
                                    return row;
                                  });

                                  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                                  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                                  
                                  for (let R = range.s.r; R <= range.e.r; ++R) {
                                    for (let C = range.s.c; C <= range.e.c; ++C) {
                                      const cell_address = { c: C, r: R };
                                      const cell_ref = XLSX.utils.encode_cell(cell_address);
                                      if (!worksheet[cell_ref]) continue;

                                      worksheet[cell_ref].s = {
                                        font: { sz: 8 },
                                        alignment: { 
                                          horizontal: "center", 
                                          vertical: "center"
                                        }
                                      };
                                      
                                      if (R === 0) {
                                        worksheet[cell_ref].s.font.bold = true;
                                      }
                                    }
                                  }

                                  worksheet["!views"] = [{ state: "frozen", ySplit: 1 }];
                                  const out_wcut = [
                                      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
                                  ];
                                  worksheet["!cols"] = out_wcut;
                                  
                                  const workbook = XLSX.utils.book_new();
                                  XLSX.utils.book_append_sheet(workbook, worksheet, "Итого заготовка");
                                  XLSX.writeFile(workbook, "Сводка_заготовка.xlsx");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-bold transition-colors border border-sky-200 dark:border-sky-500/20 shadow-sm"
                                title="Скачать сводку по заготовке в Excel"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Скачать
                              </button>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex-1 z-10 flex flex-col min-h-0">
                              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 transition-all custom-scrollbar flex-1">
                                {Object.entries<{weight: number, count: number, cost: number}>(
                                  calculationResults.reduce((acc, curr) => {
                                    const label = curr.lengthType === "НД" ? "НД" : `МД ${curr.billetLength}`;
                                    const key = `${curr.grade} | ${curr.billetDia} | ${label}`;
                                    if (!acc[key]) acc[key] = { weight: 0, count: 0, cost: 0 };
                                    acc[key].weight += curr.totalWeight;
                                    acc[key].count += curr.billetCount || 0;
                                    acc[key].cost += curr.totalCost || 0;
                                    return acc;
                                  }, {} as Record<string, {weight: number, count: number, cost: number}>)
                                )
                                  .sort((a, b) => b[1].weight - a[1].weight)
                                  .map(([key, data]) => {
                                    const [grade, size, length] = key.split(' | ');
                                    return (
                                      <div key={key} className="flex justify-between items-center group bg-slate-50 dark:bg-slate-800/30 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/50 px-2 py-1.5 rounded-lg transition-colors">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-700 dark:text-slate-300 font-bold text-[10px] min-w-[32px]">{grade}</span>
                                          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[9px] min-w-[20px]">Ø{size}</span>
                                          <span className="text-[8px] text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30 px-1 py-0.5 rounded font-bold uppercase">{length}</span>
                                        </div>
                                        <div className="flex flex-col items-end leading-none gap-0.5">
                                          <div className="flex items-baseline gap-1.5">
                                            <span className="text-sky-700 dark:text-sky-400 font-black text-[10px]">{data.weight.toFixed(3)} <span className="font-medium text-[8px] text-sky-600/60 uppercase">тн</span></span>
                                          </div>
                                          {!isPurchasingMode && <span className="text-[7.5px] text-slate-400 font-medium uppercase">{Math.round(data.cost).toLocaleString()} ₽</span>}
                                        </div>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 p-6 rounded-[24px] flex flex-col relative shadow-sm transition-all hover:shadow-md">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-bl-[64px] rounded-tr-[24px] pointer-events-none"></div>
                            <div className="z-10">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                  <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    Коэф. Использования (КИМ)
                                    <div className="group relative z-[100]">
                                      <Info className="w-3.5 h-3.5 text-amber-500/70 hover:text-amber-500 cursor-help transition-colors" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-[10.5px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover:translate-y-0 shadow-xl normal-case tracking-normal">
                                        Показывает, какая часть заготовки идет в продукцию. Чем ближе к 1.0, тем лучше.
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-b border-r border-slate-700 rotate-45"></div>
                                      </div>
                                    </div>
                                  </h3>
                                </div>
                                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                  Цель ≥ 0.980
                                </div>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none h-[40px] flex items-baseline">
                                  {(calculationResults.reduce((acc, curr) => acc + curr.remainingToProcess, 0) / (calculationResults.reduce((acc, curr) => acc + curr.totalWeight, 0) || 1)).toFixed(3)}
                                </span>
                                <span className="text-sm font-bold text-amber-500/80">средний</span>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex-1 z-10 flex flex-col justify-end">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 p-3 rounded-xl transition-colors hover:bg-amber-50 dark:hover:bg-slate-800">
                                  <div className="flex flex-col">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider mb-0.5">Лом (Тех. отходы)</span>
                                    <span className="text-amber-600 dark:text-amber-500 font-black text-[13px]">
                                      {calculationResults.reduce((acc, curr) => acc + (curr.drawLength > 0 ? (curr.techEnds / curr.drawLength) * curr.totalWeight : 0), 0).toFixed(3)} <span className="font-medium text-[9px] text-amber-600/60 uppercase">тн</span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-slate-400 font-medium text-[9px] uppercase tracking-widest mb-0.5">Доля</span>
                                    <span className="text-slate-700 dark:text-slate-200 font-bold text-[13px]">
                                      {((calculationResults.reduce((acc, curr) => acc + (curr.drawLength > 0 ? (curr.techEnds / curr.drawLength) * curr.totalWeight : 0), 0) / (calculationResults.reduce((acc, curr) => acc + curr.totalWeight, 0) || 1)) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 p-3 rounded-xl transition-colors hover:bg-amber-50 dark:hover:bg-slate-800">
                                  <div className="flex flex-col">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider mb-0.5">Деловой остаток</span>
                                    <span className="text-amber-600 dark:text-amber-500 font-black text-[13px]">
                                      {calculationResults.reduce((acc, curr) => {
                                        const leftovers = curr.lengthType === "НД" ? 0 : (curr.usefulLength - (curr.pcsPerBillet * curr.length));
                                        return acc + (curr.drawLength > 0 ? (leftovers / curr.drawLength) * curr.totalWeight : 0);
                                      }, 0).toFixed(3)} <span className="font-medium text-[9px] text-amber-600/60 uppercase">тн</span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-slate-400 font-medium text-[9px] uppercase tracking-widest mb-0.5">Доля</span>
                                    <span className="text-slate-700 dark:text-slate-200 font-bold text-[13px]">
                                      {((calculationResults.reduce((acc, curr) => {
                                        const leftovers = curr.lengthType === "НД" ? 0 : (curr.usefulLength - (curr.pcsPerBillet * curr.length));
                                        return acc + (curr.drawLength > 0 ? (leftovers / curr.drawLength) * curr.totalWeight : 0);
                                      }, 0) / (calculationResults.reduce((acc, curr) => acc + curr.totalWeight, 0) || 1)) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-[#1A1C19] rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="flex items-center gap-4">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mr-4">Потребность по позициям</h4>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-xs font-bold text-slate-400 dark:text-slate-500">{calculationResults.length} строк</div>
                              
                              <button
                                onClick={() => {
                                  const headers = [
                                    "Внутренняя нумерация", "Дата отгрузки", "№ Заказа", "Клиент", "Номенклатура", "Профиль", "Марка", "Размер мм.", "Длина", "Кол-во тн в заказе", "Остаток к выполнению",
                                    "Номенклатура заг.", "Марка заг.", "Размер мм. (Заг.)", "Кол-во тн заг.", "Длина мм.", "Тех. Отходы (тн)", "Деловой Остаток (тн)"
                                  ];
                                  if (!isPurchasingMode) headers.push("Цена (руб)", "Сумма (руб)");

                                  const rows = calculationResults
                                    .filter(res => res.totalWeight >= 0.0005)
                                    .map(res => {
                                      const row = [
                                      res.internalNo || "",
                                      res.shippingDate || "",
                                      res.orderNo || "",
                                      res.client || "",
                                      res.nomenclature || "",
                                      res.type || "",
                                      res.grade || "",
                                      String(res.diameter).replace(".", ","),
                                      res.lengthType === "НД" ? "НД 6000" : (res.lengthType && String(res.lengthType).startsWith("МД")) ? res.lengthType : `МД ${res.length}`,
                                      String(res.weightTons).replace(".", ","),
                                      String(res.remainingToProcess.toFixed(3)).replace(".", ","),
                                      "Круг г/к ГОСТ 2590-2006",
                                      res.grade,
                                      String(res.billetDia).replace(".", ","),
                                      String(res.totalWeight.toFixed(3)).replace(".", ","),
                                      res.lengthType === "НД" ? "НД" : (res.lengthType && String(res.lengthType).startsWith("МД")) ? res.lengthType : `МД ${res.billetLength}`,
                                      String(res.drawLength > 0 ? ((res.techEnds / res.drawLength) * res.totalWeight).toFixed(3) : 0).replace(".", ","),
                                      String(res.lengthType === "НД" || res.drawLength <= 0 ? 0 : ((res.usefulLength - (res.pcsPerBillet * res.length)) / res.drawLength * res.totalWeight).toFixed(3)).replace(".", ",")
                                    ];
                                    if (!isPurchasingMode) {
                                      row.push(String(res.price).replace(".", ","), String(res.totalCost.toFixed(0)).replace(".", ","));
                                    }
                                    return row;
                                  });
                                  
                                  const tsv = [headers, ...rows].map(row => row.join("\t")).join("\n");
                                  navigator.clipboard.writeText(tsv);
                                  setCopySuccess(true);
                                  setTimeout(() => setCopySuccess(false), 2000);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                  copySuccess 
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                }`}
                                title="Скопировать для вставки (Ctrl+V) в Google Таблицы"
                              >
                                {copySuccess ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Скопировано!
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    Копировать для Sheets
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  if (calculationResults.length === 0) return;
                                  
                                  const headers = [
                                    "Внутренняя нумерация", "Дата отгрузки", "№ Заказа", "Клиент", "Номенклатура", "Профиль", "Марка", "Размер мм.", "Длина", "Кол-во тн в заказе", "Остаток к выполнению",
                                    "Номенклатура заг.", "Марка заг.", "Размер мм. (Заг.)", "Кол-во тн заг.", "Длина мм.", "Тех. Отходы (тн)", "Деловой Остаток (тн)"
                                  ];
                                  if (!isPurchasingMode) headers.push("Цена (руб)", "Сумма (руб)");
                                  
                                  const rows = calculationResults
                                    .filter(res => res.totalWeight >= 0.0005)
                                    .map(res => {
                                      const row = [
                                      res.internalNo || "",
                                      res.shippingDate || "",
                                      res.orderNo || "",
                                      res.client || "",
                                      res.nomenclature || "",
                                      res.type || "",
                                      res.grade || "",
                                      String(res.diameter).replace(".", ","),
                                      res.lengthType === "НД" ? "НД 6000" : (res.lengthType && String(res.lengthType).startsWith("МД")) ? res.lengthType : `МД ${res.length}`,
                                      String(res.weightTons).replace(".", ","),
                                      String(res.remainingToProcess.toFixed(3)).replace(".", ","),
                                      "Круг г/к ГОСТ 2590-2006",
                                      res.grade,
                                      String(res.billetDia).replace(".", ","),
                                      String(res.totalWeight.toFixed(3)).replace(".", ","),
                                      res.lengthType === "НД" ? "НД 6000" : (res.lengthType && String(res.lengthType).startsWith("МД")) ? res.lengthType : `МД ${res.billetLength}`,
                                      String(res.drawLength > 0 ? ((res.techEnds / res.drawLength) * res.totalWeight).toFixed(3) : 0).replace(".", ","),
                                      String(res.lengthType === "НД" || res.drawLength <= 0 ? 0 : ((res.usefulLength - (res.pcsPerBillet * res.length)) / res.drawLength * res.totalWeight).toFixed(3)).replace(".", ",")
                                    ];
                                    if (!isPurchasingMode) {
                                      row.push(String(res.price).replace(".", ","), String(res.totalCost.toFixed(0)).replace(".", ","));
                                    }
                                    return row;
                                  });
                                  
                                  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

                                  // Apply styling
                                  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                                  const centerCols = [0, 1, 6, 7, 9, 10, 12, 13, 14, 15]; 

                                  for (let R = range.s.r; R <= range.e.r; ++R) {
                                    for (let C = range.s.c; C <= range.e.c; ++C) {
                                      const cell_address = { c: C, r: R };
                                      const cell_ref = XLSX.utils.encode_cell(cell_address);
                                      if (!worksheet[cell_ref]) continue;

                                      const isCentered = centerCols.includes(C);

                                      worksheet[cell_ref].s = {
                                        font: { sz: 8 },
                                        alignment: { 
                                          horizontal: isCentered ? "center" : "left", 
                                          vertical: "center",
                                          wrapText: C === 4 || C === 11 // Wrap text for Nomenclature columns
                                        }
                                      };
                                      
                                      // Bold headers
                                      if (R === 0) {
                                        worksheet[cell_ref].s.font.bold = true;
                                        worksheet[cell_ref].s.alignment.horizontal = "center";
                                      }
                                    }
                                  }

                                  // Freeze the first row
                                  worksheet["!views"] = [{ state: "frozen", ySplit: 1 }];

                                  const out_wcut = [
                                      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 },
                                      { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
                                      { wch: 15 }, { wch: 15 },
                                      { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
                                  ];
                                  worksheet["!cols"] = out_wcut;
                                  
                                  const workbook = XLSX.utils.book_new();
                                  XLSX.utils.book_append_sheet(workbook, worksheet, "Потребность");
                                  XLSX.writeFile(workbook, "Потребность_в_сырье.xlsx");
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Скачать Excel
                              </button>
                               {calculationResults.some(item => item.optimizedBilletLength && item.optimizedBilletLength !== item.billetLength && item.optimizedKim && item.optimizedKim > (item.remainingToProcess / item.totalWeight) + 0.005) && (
                                <button
                                  onClick={applyAllOptimizations}
                                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                                  title="Автоматически применить все предложенные улучшения КИМ"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                  Применить все улучшения КИМ
                                </button>
                              )}
                            </div>
                          </div>

                          <div 
                            ref={tableContainerRef}
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseLeaveOrUp}
                            onMouseUp={handleMouseLeaveOrUp}
                            onMouseMove={handleMouseMove}
                            className={`overflow-auto max-h-[60vh] custom-scrollbar relative ${isDragging ? 'select-none cursor-grabbing' : 'cursor-grab'}`}
                          >
                            <table className="w-full border-collapse pointer-events-auto">
                              <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50/95 dark:bg-[#1A1C19]/95 backdrop-blur-sm shadow-[0_1px_0_rgba(241,245,249,1)] dark:shadow-[0_1px_0_rgba(30,41,59,1)]">
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Внутренняя нумерация</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16">Дата отгрузки</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">№ Заказа</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Клиент</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Номенклатура</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Профиль</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Марка</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Размер мм.</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Длина</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Кол-во тн в заказе</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-sky-600 uppercase tracking-widest whitespace-nowrap">Остаток к выполнению</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Номенклатура</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Марка заг.</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Размер мм.</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-emerald-600">Кол-во тн заг.</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Длина мм.</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-amber-500/80">Тех. Отходы</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-amber-500/80">Делов. Остаток</th>
                                  <th className="px-5 py-4 text-center text-[10px] font-bold text-amber-500 uppercase tracking-widest whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      КИМ / Совет
                                      <div className="group relative z-[100]">
                                        <Info className="w-3.5 h-3.5 text-amber-500/70 hover:text-amber-500 cursor-help transition-colors" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-[10.5px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover:translate-y-0 shadow-xl normal-case tracking-normal whitespace-normal">
                                          Показывает, какая часть заготовки идет в продукцию. Чем ближе к 1.0, тем лучше.
                                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-b border-r border-slate-700 rotate-45"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </th>
                                  {!isPurchasingMode && (
                                    <>
                                      <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Цена за 1т</th>
                                      <th className="px-5 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Сумма</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                                {calculationResults.map(res => (
                                  <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">
                                      {res.internalNo}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">
                                      {res.shippingDate}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-bold text-slate-600 dark:text-slate-400">
                                      {res.orderNo}
                                    </td>
                                    <td className="px-5 py-3 text-center font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                      {res.client}
                                    </td>
                                    <td className="px-5 py-3 text-center max-w-[200px]">
                                      <span className="text-[10px] text-slate-400 line-clamp-1" title={res.nomenclature}>
                                        {res.nomenclature}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">
                                      {res.type}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-black text-slate-900 dark:text-white">
                                      {res.grade}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-bold text-slate-800 dark:text-slate-200">
                                      {parseFloat(res.diameter.toFixed(2))}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center text-slate-800 dark:text-slate-200 font-medium">
                                      {res.lengthType === "НД" ? "НД 6000" : res.lengthType.startsWith("МД") ? res.lengthType : `МД ${res.length}`}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-black text-slate-900 dark:text-white">
                                      {res.weightTons.toFixed(3)}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-bold text-sky-600 dark:text-sky-400">
                                      {res.remainingToProcess.toFixed(3)}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center text-slate-500">
                                      Круг г/к ГОСТ 2590-2006
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-black text-slate-900 dark:text-white">
                                      {res.grade}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-black text-sky-600 dark:text-sky-400">
                                      {parseFloat(res.billetDia.toFixed(2))}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center font-black text-emerald-600 dark:text-emerald-400">
                                      {res.totalWeight.toFixed(3)}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-slate-500 text-center">
                                      {res.lengthType === "НД" ? "НД" : `МД ${res.billetLength}`}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center">
                                      <span className="font-bold text-red-500/80 block">{res.drawLength > 0 ? ((res.techEnds / res.drawLength) * res.totalWeight).toFixed(3) : 0} тн</span>
                                      <span className="text-[9px] text-slate-400 block">{res.drawLength > 0 ? (((res.techEnds / res.drawLength) * res.totalWeight / res.totalWeight) * 100).toFixed(1) : 0}%</span>
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center">
                                      <span className="font-bold text-sky-500/80 block">{(res.lengthType === "НД" || res.drawLength <= 0 ? 0 : ((res.usefulLength - (res.pcsPerBillet * res.length)) / res.drawLength * res.totalWeight)).toFixed(3)} тн</span>
                                      <span className="text-[9px] text-slate-400 block">{(res.lengthType === "НД" || res.drawLength <= 0 ? 0 : (((res.usefulLength - (res.pcsPerBillet * res.length)) / res.drawLength * res.totalWeight / res.totalWeight) * 100)).toFixed(1)}%</span>
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <span className={`font-black text-[10px] ${res.remainingToProcess / res.totalWeight < 0.92 ? 'text-red-500' : 'text-amber-600'}`}>
                                          {(res.remainingToProcess / res.totalWeight).toFixed(3)}
                                        </span>
                                        {res.optimizedBilletLength && res.optimizedBilletLength !== res.billetLength && res.optimizedKim && res.optimizedKim > (res.remainingToProcess / res.totalWeight) + 0.005 && (
                                          <button 
                                            onClick={() => {
                                              // Implement applying optimization logic
                                              setCalculationResults(prev => prev.map(item => {
                                                if (item.id === res.id && res.optimizedBilletLength) {
                                                  const newBilletLength = res.optimizedBilletLength;
                                                  const newDrawLen = newBilletLength * item.drawRatio;
                                                  const newUsefulLen = newDrawLen / (item.type === "Шестигранник" ? 1.03 * 1.003 : 1.027 * 1.003);
                                                  const newPcs = Math.floor(newUsefulLen / item.length);
                                                  const newActualUL = newPcs * item.length;
                                                  const newKim = newDrawLen > 0 ? newActualUL / newDrawLen : 0;
                                                  const newTotalWeight = newKim > 0 ? item.remainingToProcess / newKim : item.remainingToProcess;
                                                  const billetArea = item.type === "Шестигранник" 
                                                    ? (Math.sqrt(3) / 2) * Math.pow(item.billetDia, 2)
                                                    : (Math.PI * Math.pow(item.billetDia, 2)) / 4;
                                                  const wPerM = billetArea * 0.00000785 * 1000;
                                                  const singleBMass = (newBilletLength / 1000) * wPerM;
                                                  const newBilletCount = singleBMass > 0 ? Math.ceil((newTotalWeight * 1000) / singleBMass) : 0;
                                                  
                                                  return {
                                                    ...item,
                                                    billetLength: newBilletLength,
                                                    drawLength: newDrawLen,
                                                    usefulLength: newUsefulLen,
                                                    pcsPerBillet: newPcs,
                                                    wastePercent: (1 - newKim) * 100,
                                                    totalWeight: newTotalWeight,
                                                    billetCount: newBilletCount,
                                                    quantity: newBilletCount,
                                                    totalCost: newTotalWeight * item.price
                                                  };
                                                }
                                                return item;
                                              }));
                                            }}
                                            className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold rounded-full shadow-sm shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1"
                                            title={`Улучшить КИМ до ${res.optimizedKim.toFixed(3)} используя L заг. ${res.optimizedBilletLength}`}
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
                    <div className="bg-white dark:bg-[#1A1C19] border border-slate-200 dark:border-slate-800 rounded-[32px] p-12 flex flex-col items-center justify-center min-h-[400px]">
                      <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 rounded-[30px] flex items-center justify-center text-sky-500 mb-6">
                        <Activity className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Расчет с учетом наличия</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-sm px-6 leading-relaxed">
                        Алгоритм распределения остатков на потребность в разработке...
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Content tabs */}
          {activeTab === "economy" && (
            <motion.div
              key="economy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-normal tracking-tight text-[#1A1C19] dark:text-white">
                    Экономика производства
                  </h2>
                  <p className="text-sm text-[#43483F] dark:text-slate-400 mt-2 max-w-2xl">
                    Управление ценами заготовок, марками стали и прямыми затратами.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                   <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center justify-center gap-2 px-6 h-12 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                      saved ? "bg-emerald-500 text-white" : "bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800"
                    } ${isSaving ? "opacity-70" : ""}`}
                  >
                    {isSaving ? "Сохранение..." : saved ? "✓ Сохранено" : "Сохранить всё"}
                  </button>
                </div>
              </div>

              {/* Sub-navigation */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1A1C19] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                <button
                  onClick={() => setAdminSection("direct")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    adminSection === "direct" 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Прямые затраты
                </button>
                <button
                  onClick={() => setAdminSection("prices")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    adminSection === "prices" 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Цены
                </button>
                <button
                  onClick={() => setAdminSection("grades")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    adminSection === "grades" 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Марки
                </button>
              </div>

              <AnimatePresence mode="wait">
                {adminSection === "direct" ? (
                  <motion.div
                    key="direct"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-8"
                  >
                    {/* Direct Variable Costs */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 px-1">
                        <TrendingUp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Прямые затраты</h3>
                      </div>
                      <div className="bg-white dark:bg-[#1A1C19] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left min-w-[300px]">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <tr>
                                <th className="px-4 sm:px-6 py-4">Статья</th>
                                <th className="px-4 sm:px-6 py-4 text-right">Норма на тн (руб)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {directItems.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</td>
                                  <td className="px-4 sm:px-6 py-4">
                                    <div className="relative w-full max-w-[140px] sm:max-w-[192px] ml-auto">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={item.norm}
                                        onChange={(e) => handleEconomyChange(item.id, 'norm', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-0 rounded-xl pl-3 pr-8 sm:pl-4 sm:pr-10 h-11 text-right text-sm font-bold focus:ring-2 focus:ring-slate-400 dark:text-white"
                                      />
                                      <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-xs pointer-events-none">₽</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 motion-safe:animate-pulse">
                         <Info className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Как это работает?</h4>
                        <p className="text-xs text-blue-800/70 dark:text-blue-400/70 leading-relaxed">
                          Для <b>Прямых затрат</b> укажите норму расхода (абсолютную стоимость) на 1 тонну готовой продукции. Калькулятор автоматически вычислит влияние этих цифр на рентабельность заказов при расчете в основном интерфейсе.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : adminSection === "prices" ? (
                  <motion.div
                    key="prices"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-col md:grid md:grid-cols-12 gap-6 w-full">
                      {/* Main settings column */}
                      <div className="col-span-12 flex flex-col gap-6">
                        
                        {/* Pricing table */}
                        <div className="bg-white dark:bg-[#1A1C19] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors">
                          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-base font-medium text-[#1A1C19] dark:text-white">
                              Цены заготовки
                            </h3>
                          </div>
                          <div className="overflow-x-auto p-0 m-0">
                            <div className="inline-block min-w-full align-middle">
                              <table className="w-full text-left whitespace-nowrap">
                                <thead className="text-[#43483F] dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
                                  <tr>
                                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Марка стали</th>
                                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-right">Цена МД (руб/тн)</th>
                                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-right">Цена НД (руб/тн)</th>
                                    <th className="px-4 py-3 w-12"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {allGrades.map((grade) => {
                                    const prices = rawPrices[grade] || { md: "", nd: "" };

                                    return (
                                      <tr key={grade} className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#1A1C19] dark:text-slate-100 text-sm">
                                          {grade}
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="relative w-[110px] sm:w-[130px] ml-auto">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={formatInputValue(prices.md)}
                                              onChange={(e) => handlePriceChange(grade, 'md', e.target.value)}
                                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-slate-800 dark:focus:border-slate-400 focus:outline-none text-right text-sm font-bold h-9 pl-1 pr-1 dark:text-white placeholder:text-slate-400"
                                            />
                                          </div>
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="relative w-[110px] sm:w-[130px] ml-auto">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="0"
                                              value={formatInputValue(prices.nd)}
                                              onChange={(e) => handlePriceChange(grade, 'nd', e.target.value)}
                                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-slate-800 dark:focus:border-slate-400 focus:outline-none text-right text-sm font-bold h-9 pl-1 pr-1 dark:text-white placeholder:text-slate-400"
                                            />
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 text-center align-middle">
                                            <button
                                              onClick={() => handleRemoveGrade(grade)}
                                              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                              title="Удалить марку"
                                            >
                                              <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="grades"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-8"
                  >
                    <div className="flex flex-col gap-4 mt-4">
                      <div className="flex items-center gap-2 px-1">
                        <Layers className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Параметры марок стали</h3>
                      </div>
                      <div className="bg-white dark:bg-[#1A1C19] rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left min-w-[400px]">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <tr>
                                <th className="px-4 sm:px-6 py-4">Марка стали</th>
                                <th className="px-4 sm:px-6 py-4 text-center">Политика (Круг) <RemnantPricingTooltip /></th>
                                <th className="px-4 sm:px-6 py-4 text-center">Политика (Ш-гр) <RemnantPricingTooltip /></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {allGrades.map(grade => {
                                const pricing = remnantPricing[grade] || { round: "remnant", hex: "remnant" };
                                return (
                                  <tr key={grade} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 sm:px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{grade}</td>
                                    <td className="px-4 sm:px-6 py-4">
                                      <select
                                        value={pricing.round}
                                        onChange={(e) => handlePricingChange(grade, "round", e.target.value)}
                                        className={`bg-slate-50 dark:bg-slate-800 text-xs font-bold rounded-xl px-2 sm:px-4 py-2.5 outline-none appearance-none cursor-pointer w-[120px] sm:w-[160px] mx-auto block border-0 focus:ring-2 focus:ring-slate-400 ${
                                          pricing.round === "scrap" ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20" : "text-slate-900 dark:text-white"
                                        }`}
                                      >
                                        <option value="remnant">Деловой остаток</option>
                                        <option value="scrap">По цене лома</option>
                                      </select>
                                    </td>
                                    <td className="px-4 sm:px-6 py-4">
                                      <select
                                        value={pricing.hex}
                                        onChange={(e) => handlePricingChange(grade, "hex", e.target.value)}
                                        className={`bg-slate-50 dark:bg-slate-800 text-xs font-bold rounded-xl px-2 sm:px-4 py-2.5 outline-none appearance-none cursor-pointer w-[120px] sm:w-[160px] mx-auto block border-0 focus:ring-2 focus:ring-slate-400 ${
                                          pricing.hex === "scrap" ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20" : "text-slate-900 dark:text-white"
                                        }`}
                                      >
                                        <option value="remnant">Деловой остаток</option>
                                        <option value="scrap">По цене лома</option>
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BatchManualModal isOpen={isBatchManualOpen} onClose={() => setIsBatchManualOpen(false)} />
      <StockManualModal isOpen={isStockManualOpen} onClose={() => setIsStockManualOpen(false)} />
    </div>
  );
}
