const fs = require('fs');

let c = fs.readFileSync('src/components/DiscoveryHUD.jsx', 'utf8');

// Replace border-white/... with border-colorBorder/30
c = c.replace(/border-white\/(5|10|12|15|20|30|40|50|60)/g, 'border-colorBorder/30');

// Replace border-white with border-colorBorder
c = c.replace(/border-white/g, 'border-colorBorder');

// Replace text-white/... with text-colorLabel
c = c.replace(/text-white\/(30|40|50|60)/g, 'text-colorLabel');

// Replace text-white with text-colorDataPrimary
// Negative lookahead so we don't match text-white/20 if we didn't cover it
c = c.replace(/text-white(?!\/[\d]+)(?![\w\-])/g, 'text-colorDataPrimary');

fs.writeFileSync('src/components/DiscoveryHUD.jsx', c);
console.log('DiscoveryHUD replaced successfully!');
