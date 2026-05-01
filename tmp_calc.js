const rawSizes = [52, 54, 55, 56, 58, 60, 62, 63, 64];
const result = [];
for (let target = 50.5; target <= 62.0; target += 0.5) {
  const roundedTarget = Math.round(target * 10) / 10;
  rawSizes.forEach(raw => {
    if (raw >= roundedTarget + 1) {
      const coef = Math.pow(raw / roundedTarget, 2);
      result.push({ target: roundedTarget, raw: raw, coef: parseFloat(coef.toFixed(3)) });
    }
  });
}
console.log(result.find(r => r.target === 57.5));
console.log(result.find(r => r.target === 59.5));
