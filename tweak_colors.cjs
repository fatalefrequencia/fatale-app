const fs = require('fs');

let c = fs.readFileSync('src/components/DiscoveryHUD.jsx', 'utf8');

// The reference image uses specific colors for specific types of data.
// We want to apply colorDataSecondary to secondary meta info like stats, author names, numbers.
// We want colorDataPrimary for main titles.
// We want colorLabel for small labels and headers.

// 1. Authors and Genres should be colorDataSecondary (green in the reference)
c = c.replace(/text-colorDataPrimary/g, 'text-colorDataPrimary'); // No op, just to remind me

// Let's find specific blocks and colorize them
// For Playlists "BY Author"
c = c.replace(/<div className="text-\[8px\] opacity-40 uppercase mt-0\.5">BY/g, '<div className="text-[8px] text-colorDataSecondary uppercase mt-0.5">BY');
// For Artists Genre
c = c.replace(/<div className="text-\[8px\] opacity-40 uppercase mt-0\.5">\{a.genre/g, '<div className="text-[8px] text-colorDataSecondary uppercase mt-0.5">{a.genre');
// For Track Artist
c = c.replace(/<div className="text-\[8px\] opacity-40 uppercase mt-0\.5">BY \{trk.artist\}/g, '<div className="text-[8px] text-colorDataSecondary uppercase mt-0.5">BY {trk.artist}');

// NATIVE_ARTISTS numbers/stats
c = c.replace(/<div className="text-\[10px\] font-black text-white\/80">\{a.followers/g, '<div className="text-[10px] font-black text-colorDataSecondary">{a.followers');

// In HUDWidget.jsx, if there are white text occurrences, fix them too!
fs.writeFileSync('src/components/DiscoveryHUD.jsx', c);

let h = fs.readFileSync('src/components/discovery/HUDWidget.jsx', 'utf8');
h = h.replace(/text-white\/60/g, 'text-colorLabel');
h = h.replace(/text-white\/40/g, 'text-colorLabel');
h = h.replace(/text-white(?!\/)/g, 'text-colorDataPrimary');
fs.writeFileSync('src/components/discovery/HUDWidget.jsx', h);

console.log('Colors tweaked successfully!');
