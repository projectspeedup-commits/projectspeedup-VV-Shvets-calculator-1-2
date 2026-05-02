import React from 'react';

export const TECH_COEFS_ROUND: Record<string, [number, number]> = {
  "10_12": [1.024, 1.002], "10.5_12": [1.026, 1.003], "11_12": [1.029, 1.003],
  "11.5_14": [1.023, 1.002], "12_14": [1.025, 1.003], "12.5_14": [1.027, 1.003], "13_14": [1.030, 1.003],
  "12.5_15": [1.024, 1.002], "13_15": [1.026, 1.003], "13.5_15": [1.028, 1.003], "14_15": [1.030, 1.003],
  "13.5_16": [1.024, 1.002], "14_16": [1.026, 1.003], "14.5_16": [1.028, 1.003], "15_16": [1.030, 1.003],
  "15.5_18": [1.025, 1.003], "16_18": [1.027, 1.003], "16.5_18": [1.029, 1.003], "17_18": [1.031, 1.003],
  "16.5_19": [1.026, 1.003], "17_19": [1.027, 1.003], "17.5_19": [1.029, 1.003], "18_19": [1.031, 1.003],
  "17.5_20": [1.026, 1.003], "18_20": [1.028, 1.003], "18.5_20": [1.029, 1.003], "19_20": [1.031, 1.003],
  "19.5_22": [1.027, 1.003], "20_22": [1.028, 1.003], "20.5_22": [1.030, 1.003], "21_22": [1.031, 1.003],
  "21.5_24": [1.027, 1.003], "22_24": [1.029, 1.003], "22.5_24": [1.030, 1.003], "23_24": [1.032, 1.003],
  "22.5_25": [1.028, 1.003], "23_25": [1.029, 1.003], "23.5_25": [1.030, 1.003], "24_25": [1.032, 1.003],
  "23.5_26": [1.028, 1.003], "24_26": [1.029, 1.003], "24.5_26": [1.031, 1.003], "25_26": [1.032, 1.003],
  "25.5_28": [1.028, 1.003], "26_28": [1.030, 1.003], "26.5_28": [1.031, 1.003], "27_28": [1.032, 1.003],
  "27.5_30": [1.029, 1.003], "28_30": [1.030, 1.003], "28.5_30": [1.031, 1.003], "29_30": [1.032, 1.003],
  "29.5_32": [1.029, 1.003], "30_32": [1.030, 1.003], "30.5_32": [1.031, 1.003], "31_32": [1.032, 1.003],
  "31.5_34": [1.029, 1.003], "32_34": [1.030, 1.003], "32.5_34": [1.031, 1.003], "33_34": [1.032, 1.003],
  "33.5_36": [1.030, 1.003], "34_36": [1.031, 1.003], "34.5_36": [1.032, 1.003], "35_36": [1.033, 1.003],
  "35.5_38": [1.030, 1.003], "36_38": [1.031, 1.003], "36.5_38": [1.032, 1.003], "37_38": [1.033, 1.003],
  "37.5_40": [1.030, 1.003], "38_40": [1.031, 1.003], "38.5_40": [1.032, 1.003], "39_40": [1.033, 1.003],
  "39.5_42": [1.030, 1.003], "40_42": [1.031, 1.003], "40.5_42": [1.032, 1.003], "41_42": [1.033, 1.003],
  "41.5_44": [1.031, 1.003], "42_44": [1.031, 1.003], "42.5_44": [1.032, 1.003], "43_44": [1.033, 1.003],
  "42.5_45": [1.031, 1.003], "43_45": [1.031, 1.003], "43.5_45": [1.032, 1.003], "44_45": [1.033, 1.003],
  "43.5_46": [1.031, 1.003], "44_46": [1.031, 1.003], "44.5_46": [1.032, 1.003], "45_46": [1.033, 1.003],
  "45.5_48": [1.031, 1.003], "46_48": [1.032, 1.003], "46.5_48": [1.032, 1.003], "47_48": [1.033, 1.003],
  "47.5_50": [1.031, 1.003], "48_50": [1.032, 1.003], "48.5_50": [1.032, 1.003], "49_50": [1.033, 1.003],
  "49.5_52": [1.031, 1.003], "50_52": [1.032, 1.003]
};

export const DEFAULT_STEEL_GRADES = [
  "ст.09Г2С", "ст.10", "ст.20", "ст.35", "ст.40", "ст.45",
  "ст.20Х", "ст.30Х", "ст.40Х", "ст.А12", "ст.18ХГТ", "ст.25ХГТ", "ст.30ХГСА",
  "ст.20ХН3А", "ст.12ХН3А", "ст. 10-45 МД", "ст. 20х-40х МД"
];

export const DEFAULT_RAW_PRICES: Record<string, { md: string; nd: string }> = {
  "ст.09Г2С": { md: '49000', nd: '49000' },
  "ст.10": { md: '40900', nd: '40900' },
  "ст.20": { md: '40900', nd: '40900' },
  "ст.35": { md: '40900', nd: '40900' },
  "ст.40": { md: '40900', nd: '40900' },
  "ст.45": { md: '40900', nd: '40900' },
  "ст.20Х": { md: '43950', nd: '43950' },
  "ст.30Х": { md: '43950', nd: '43950' },
  "ст.40Х": { md: '43950', nd: '43950' },
  "ст.А12": { md: '50000', nd: '50000' },
  "ст.18ХГТ": { md: '51000', nd: '51000' },
  "ст.25ХГТ": { md: '51000', nd: '51000' },
  "ст.30ХГСА": { md: '51000', nd: '51000' },
  "ст.20ХН3А": { md: '58000', nd: '58000' },
  "ст.12ХН3А": { md: '58000', nd: '58000' },
  "ст. 10-45 МД": { md: '43354', nd: '43354' },
  "ст. 20х-40х МД": { md: '46500', nd: '46500' }
};

export const sanitizeKey = (key: string) => key.replace(/\./g, '_');

export interface EconomyItem {
  id: string;
  name: string;
  category: 'direct' | 'overhead';
  type: 'variable' | 'fixed';
  norm?: string; // Норма расхода (например, кг/тн)
  price?: string; // Цена (руб/ед)
  quantity?: string; // Количество (для постоянных или разовых)
}

export const DEFAULT_ECONOMY_ITEMS: EconomyItem[] = [
  { id: 'dies', name: 'Фильеры', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'shot', name: 'Дробь', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'lubricants', name: 'Смазочные материалы', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'cutting_discs', name: 'Отрезные диски', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'packaging', name: 'Тара и упаковка', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'other_tech', name: 'Прочие тех. материалы', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'salary_prod', name: 'З/П (Производство)', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'electricity', name: 'Электроэнергия', category: 'direct', type: 'variable', norm: '0', price: '0' },
  { id: 'tools', name: 'Произв. инструмент', category: 'overhead', type: 'variable', norm: '0', price: '0' },
  { id: 'fuel', name: 'ГСМ для оборудования', category: 'overhead', type: 'variable', norm: '0', price: '0' },
  { id: 'repair_equip', name: 'Ремонт оборудования', category: 'overhead', type: 'fixed', quantity: '1', price: '0' },
  { id: 'salary_admin', name: 'З/П (Администрация/ИТ)', category: 'overhead', type: 'fixed', quantity: '1', price: '0' },
  { id: 'rent', name: 'Аренда', category: 'overhead', type: 'fixed', quantity: '1', price: '0' },
  { id: 'ppe', name: 'СИЗ и Спецодежда', category: 'overhead', type: 'fixed', quantity: '1', price: '0' },
  { id: 'office', name: 'IT, Канцелярия, Хозтовары', category: 'overhead', type: 'fixed', quantity: '1', price: '0' },
  { id: 'repair_buildings', name: 'Ремонт зданий', category: 'overhead', type: 'fixed', quantity: '1', price: '0' },
];

export const getGostForGrade = (grade: string) => {
  if (!grade) return "";
  const g = grade.toUpperCase().trim();
  if (g.includes("09Г2С")) return "ГОСТ 19281-2014";
  if (g === "20" || g === "СТ20" || g === "СТ.20") return "ГОСТ 1050-2013";
  if (g === "35" || g === "СТ35" || g === "СТ.35") return "ГОСТ 1050-2013";
  if (g === "45" || g === "СТ45" || g === "СТ.45") return "ГОСТ 1050-2013";
  
  if (g.includes("10") || g.includes("20") || g.includes("35") || g.includes("40") || g.includes("45")) {
    if (g.includes("Х") || g.includes("Г") || g.includes("Н")) return "ГОСТ 4543-2016";
    return "ГОСТ 1050-2013";
  }
  if (g.includes("20Х") || g.includes("30Х") || g.includes("40Х") || g.includes("18ХГТ") || g.includes("25ХГТ") || g.includes("30ХГСА") || g.includes("20ХН3А") || g.includes("12ХН3А")) return "ГОСТ 4543-2016";
  if (g.includes("А12")) return "ГОСТ 1414-75";
  return "ГОСТ 1050-2013"; 
};

export const getProfileGost = (type: "round" | "hex") => {
  return type === "round" ? "ГОСТ 7417-75" : "ГОСТ 8560-78";
};

export const getLengthLabel = (length: string) => {
  const L = Number(length);
  if (isNaN(L) || !L) return "НД";
  // Only auto-convert to ND if it's very likely to be a range or unset
  if (length.toLowerCase().includes("нд") || length === "0") return "НД";
  return `МД ${L}`;
};

function generateRoundData(start: number, end: number, step: number, rawSizes: number[]) {
  const result: any[] = [];
  for (let target = start; target <= end; target += step) {
    const roundedTarget = Math.round(target * 10) / 10;
    rawSizes.forEach(raw => {
      if (raw >= roundedTarget + 1) {
        const coef = Math.pow(raw / roundedTarget, 2);
        result.push({ target: roundedTarget, raw: raw, coef: parseFloat(coef.toFixed(3)) });
      }
    });
  }
  return result;
}

export const ROUND_DATA = [
  { target: 10, raw: 12, coef: 1.440 }, { target: 10.5, raw: 12, coef: 1.306 }, { target: 10.8, raw: 12, coef: 1.235 }, { target: 11, raw: 12, coef: 1.190 }, { target: 11.2, raw: 12, coef: 1.148 }, { target: 11.2, raw: 13, coef: 1.347 }, { target: 11.5, raw: 14, coef: 1.482 },
  { target: 12, raw: 14, coef: 1.361 }, { target: 12.5, raw: 14, coef: 1.254 }, { target: 12.5, raw: 15, coef: 1.440 }, { target: 12.6, raw: 14, coef: 1.235 }, { target: 12.6, raw: 15, coef: 1.417 }, { target: 13, raw: 14, coef: 1.160 },
  { target: 13, raw: 15, coef: 1.331 }, { target: 13.5, raw: 15, coef: 1.235 }, { target: 13.5, raw: 16, coef: 1.405 }, { target: 14, raw: 15, coef: 1.148 },
  { target: 14, raw: 16, coef: 1.306 }, { target: 14.5, raw: 16, coef: 1.218 }, { target: 14.6, raw: 16, coef: 1.201 }, { target: 15, raw: 16, coef: 1.138 }, { target: 15.5, raw: 18, coef: 1.349 },
  { target: 16, raw: 18, coef: 1.266 }, { target: 16.5, raw: 18, coef: 1.190 }, { target: 16.5, raw: 19, coef: 1.326 }, { target: 17, raw: 18, coef: 1.121 },
  { target: 17, raw: 19, coef: 1.249 }, { target: 17.5, raw: 19, coef: 1.179 }, { target: 17.5, raw: 20, coef: 1.306 }, { target: 18, raw: 20, coef: 1.235 },
  { target: 18.3, raw: 20, coef: 1.194 }, { target: 18.34, raw: 20, coef: 1.189 }, { target: 18.5, raw: 20, coef: 1.169 }, { target: 19, raw: 22, coef: 1.273 }, { target: 19.5, raw: 22, coef: 1.273 },
  { target: 20, raw: 22, coef: 1.210 }, { target: 20.5, raw: 22, coef: 1.152 }, { target: 21, raw: 22, coef: 1.098 },
  { target: 21.5, raw: 24, coef: 1.246 }, { target: 22, raw: 24, coef: 1.190 }, { target: 22.5, raw: 24, coef: 1.138 }, { target: 22.5, raw: 25, coef: 1.235 },
  { target: 22.62, raw: 24, coef: 1.126 }, { target: 22.62, raw: 25, coef: 1.222 },
  { target: 23, raw: 24, coef: 1.089 }, { target: 23.5, raw: 25, coef: 1.132 }, { target: 23.5, raw: 26, coef: 1.224 }, { target: 24, raw: 25, coef: 1.085 },
  { target: 24, raw: 26, coef: 1.174 }, { target: 24.5, raw: 26, coef: 1.126 }, { target: 25, raw: 26, coef: 1.082 },
  { target: 25.5, raw: 28, coef: 1.206 }, { target: 25.9, raw: 28, coef: 1.169 }, { target: 26, raw: 28, coef: 1.160 }, { target: 26.5, raw: 28, coef: 1.116 }, { target: 27, raw: 28, coef: 1.075 },
  { target: 27.5, raw: 30, coef: 1.190 }, { target: 27.6, raw: 30, coef: 1.182 }, { target: 27.65, raw: 30, coef: 1.177 }, { target: 27.68, raw: 30, coef: 1.175 }, { target: 28, raw: 30, coef: 1.148 }, { target: 28.5, raw: 30, coef: 1.108 }, { target: 29, raw: 30, coef: 1.070 },
  { target: 29.5, raw: 32, coef: 1.177 }, { target: 30, raw: 32, coef: 1.138 },
  { target: 30.5, raw: 32, coef: 1.101 }, { target: 31, raw: 32, coef: 1.066 }, { target: 31.5, raw: 34, coef: 1.165 }, { target: 31.75, raw: 34, coef: 1.146 }, { target: 32, raw: 34, coef: 1.129 },
  { target: 32.5, raw: 34, coef: 1.095 }, { target: 33, raw: 34, coef: 1.062 }, { target: 33.5, raw: 36, coef: 1.155 }, { target: 34, raw: 36, coef: 1.121 },
  { target: 34.5, raw: 36, coef: 1.089 }, { target: 35, raw: 36, coef: 1.058 }, { target: 35.5, raw: 38, coef: 1.146 }, { target: 36, raw: 38, coef: 1.114 },
  { target: 36.5, raw: 38, coef: 1.084 }, { target: 37, raw: 38, coef: 1.055 }, { target: 37.5, raw: 40, coef: 1.138 }, { target: 38, raw: 40, coef: 1.108 },
  { target: 38.5, raw: 40, coef: 1.080 }, { target: 39, raw: 40, coef: 1.052 }, { target: 39.5, raw: 42, coef: 1.130 }, { target: 40, raw: 42, coef: 1.103 },
  { target: 40.5, raw: 42, coef: 1.076 }, { target: 41, raw: 42, coef: 1.050 }, { target: 41.5, raw: 44, coef: 1.124 }, { target: 42, raw: 44, coef: 1.098 },
  { target: 42.5, raw: 44, coef: 1.072 },
  { target: 43, raw: 45, coef: 1.095 }, { target: 43.5, raw: 45, coef: 1.070 },
  { target: 44, raw: 45, coef: 1.046 }, { target: 44.45, raw: 46, coef: 1.071 }, { target: 43.5, raw: 46, coef: 1.118 }, { target: 44, raw: 46, coef: 1.093 }, { target: 44.5, raw: 46, coef: 1.069 },
  { target: 45, raw: 46, coef: 1.045 }, { target: 45.5, raw: 48, coef: 1.113 }, { target: 46, raw: 48, coef: 1.089 }, { target: 46.5, raw: 48, coef: 1.066 },
  { target: 47, raw: 48, coef: 1.043 }, { target: 47.5, raw: 50, coef: 1.108 }, { target: 48, raw: 50, coef: 1.085 }, { target: 48.5, raw: 50, coef: 1.063 },
  { target: 49, raw: 50, coef: 1.041 }, { target: 49.5, raw: 52, coef: 1.104 }, { target: 50, raw: 52, coef: 1.082 }, { target: 50.8, raw: 52, coef: 1.048 },
  ...generateRoundData(50.5, 62.0, 0.5, [52, 54, 55, 56, 58, 60, 62, 63, 64])
];

export const HEX_DATA = [
  { target: 10, raw: 12, coef: 1.23 },
  { target: 11, raw: 13, coef: 1.23 },
  { target: 12, raw: 14, coef: 1.23 },
  { target: 13, raw: 15, coef: 1.23 },
  { target: 14, raw: 16, coef: 1.23 },
  { target: 15, raw: 17, coef: 1.23 },
  { target: 16, raw: 19, coef: 1.23 },
  { target: 17, raw: 20, coef: 1.23 },
  { target: 18, raw: 21, coef: 1.23 },
  { target: 19, raw: 22, coef: 1.23 },
  { target: 20, raw: 23, coef: 1.23 },
  { target: 21, raw: 24, coef: 1.23 },
  { target: 22, raw: 26, coef: 1.23 },
  { target: 24, raw: 28, coef: 1.23 },
  { target: 25, raw: 29, coef: 1.23 },
  { target: 26, raw: 30, coef: 1.23 },
  { target: 27, raw: 31, coef: 1.23 },
  { target: 28, raw: 33, coef: 1.23 },
  { target: 30, raw: 35, coef: 1.23 },
  { target: 32, raw: 37, coef: 1.23 },
  { target: 34, raw: 40, coef: 1.23 },
  { target: 36, raw: 42, coef: 1.23 },
  { target: 38, raw: 44, coef: 1.23 },
  { target: 40, raw: 47, coef: 1.23 },
  { target: 41, raw: 48, coef: 1.23 },
  { target: 42, raw: 49, coef: 1.23 },
  { target: 45, raw: 52, coef: 1.23 },
  { target: 46, raw: 53, coef: 1.23 },
  { target: 48, raw: 56, coef: 1.22 },
  { target: 50, raw: 58, coef: 1.23 },
  { target: 53, raw: 62, coef: 1.23 },
  { target: 55, raw: 64, coef: 1.23 },
  { target: 56, raw: 65, coef: 1.23 },
  { target: 60, raw: 70, coef: 1.23 },
  { target: 63, raw: 73, coef: 1.23 },
];

export const formatCurrency = (value: any) => {
  if (value === null || value === undefined || isNaN(Number(value))) return '0,00';
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
};

export const formatInputValue = (value: any) => {
  if (!value) return '';
  const parts = value.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
};

export const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
  const val = e.target.value.replace(/\s/g, '').replace(/,/g, '.');
  if (val === '' || /^\d*\.?\d*$/.test(val)) {
    setter(val);
  }
};
