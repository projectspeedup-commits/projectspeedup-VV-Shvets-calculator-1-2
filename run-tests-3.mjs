import { renderToString } from 'react-dom/server';
import React from 'react';
import { AdminPanel } from './src/components/AdminPanel.tsx';
import { DEFAULT_RAW_PRICES, DEFAULT_ECONOMY_ITEMS } from "./src/lib/constants.ts";

try {
  console.log("Rendering AdminPanel with items...");
  
  const element = React.createElement(AdminPanel, {
    initialTab: "calc",
    initialRawPrices: DEFAULT_RAW_PRICES,
    initialScrap: "20000",
    initialRemnant: "30000",
    initialCustomGrades: [],
    initialDeletedGrades: [],
    initialRemnantPricing: {},
    initialEconomyItems: DEFAULT_ECONOMY_ITEMS,
    onSave: () => {},
    onLogout: () => {},
    isCloudActive: false,
    isDarkMode: false,
    toggleTheme: () => {}
  });

  const html = renderToString(element);
  console.log("Render successful! Length:", html.length);
} catch (e) {
  console.error("RENDER ERROR:", e);
}
