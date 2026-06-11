const fs = require('fs');

const files = [
  'src/index.css',
  'src/components/discovery/YoutubeNode.jsx',
  'src/components/discovery/SectorLabel.jsx',
  'src/components/discovery/SectorHubPanel.jsx',
  'src/components/discovery/SectorHubNode.jsx',
  'src/components/discovery/PlaylistNode.jsx',
  'src/components/discovery/CommunityNode.jsx',
  'src/components/discovery/ArtistNode.jsx',
  'src/components/ShoppingView.jsx',
  'src/components/SpatialProfile.css'
];

files.forEach(f => {
  const p = 'c:/Users/USER/Desktop/fatale-app/' + f;
  if (!fs.existsSync(p)) return;
  
  let c = fs.readFileSync(p, 'utf8');
  
  // Handle CSS cases
  c = c.replace(/'Share Tech Mono'/g, "'Fira Code', 'Consolas', 'Courier New'");
  
  // Handle JSX cases where it's double-quoted like "'Share Tech Mono', monospace"
  c = c.replace(/"'Share Tech Mono', monospace"/g, "\"'Fira Code', 'Consolas', 'Courier New', monospace\"");
  
  fs.writeFileSync(p, c);
  console.log('Replaced in', p);
});
