const https = require('https');
https.get('https://projectspeedup-commits.github.io/projectspeedup-commits-calculator-1.1/assets/index-Dh5Oa1H4.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data.length);
    require('fs').writeFileSync('old_calc1.js', data);
  });
});
https.get('https://projectspeedup-commits.github.io/projectspeedup-VV-Shvets-calculator-1-2/index.html', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      console.log('1.2 js path:', match[1]);
      https.get('https://projectspeedup-commits.github.io/projectspeedup-VV-Shvets-calculator-1-2' + match[1], (res2) => {
        let data2 = '';
        res2.on('data', (c) => { data2 += c; });
        res2.on('end', () => { require('fs').writeFileSync('old_calc2.js', data2); });
      });
    }
  });
});
