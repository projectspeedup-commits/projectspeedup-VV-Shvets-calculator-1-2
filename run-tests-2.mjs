import { renderToString } from 'react-dom/server';
import React from 'react';
import { AdminPanel } from './src/components/AdminPanel.tsx';
import { DEFAULT_RAW_PRICES, DEFAULT_ECONOMY_ITEMS } from "./src/lib/constants.ts";

// Try all tabs
const tabs = ["calc-stock", "free-stock", "calc", "files"];
for (const tab of tabs) {
  try {
    console.log(`Rendering AdminPanel with supplySection = ${tab}...`);
    // hack: replace the initial value in the transpiled component? Actually we can't easily.
    // Instead we will just render with `initialTab="supply"` and maybe mock the button click if necessary?
    // Actually, `AdminPanel` accepts `initialTab` but not `supplySection`.
  } catch (e) {
    console.error("RENDER ERROR:", e);
  }
}
