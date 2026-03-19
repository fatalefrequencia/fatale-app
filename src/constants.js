export const API_BASE_URL = import.meta.env.VITE_SIGNALR_URL || 
  (import.meta.env.PROD 
    ? (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api/', '') : 'https://fatale-core.up.railway.app')
    : 'http://localhost:5264');

export const SECTORS = [
  { 
    id: 0, 
    name: 'CLUB / BASS', 
    x: 1400, 
    y: 1100, 
    color: '#ff006e', 
    desc: 'Underground beats & raw signal', 
    subgenres: ['House', 'Techno', 'Bass', 'UKG'] 
  },
  { 
    id: 1, 
    name: 'POP / R&B', 
    x: 3000, 
    y: 600, 
    color: '#00ffff', 
    desc: 'Synthetic highs & digital dreams', 
    subgenres: ['Hyperpop', 'R&B', 'Pop', 'Dance'] 
  },
  { 
    id: 2, 
    name: 'AMBIENT / EXPERIMENTAL', 
    x: 1400, 
    y: 2700, 
    color: '#9b5de5', 
    desc: 'Deep frequency & noise art', 
    subgenres: ['Ambient', 'Experimental', 'IDM', 'Noise'] 
  },
  { 
    id: 3, 
    name: 'RAP / DRILL', 
    x: 3000, 
    y: 3200, 
    color: '#ffcc00', 
    desc: 'Convergence point of all signals', 
    subgenres: ['Trap', 'Drill', 'Rap', 'Boom Bap'] 
  },
  { 
    id: 4, 
    name: 'ROCK / METAL', 
    x: 4600, 
    y: 1100, 
    color: '#00ff88', 
    desc: 'Fringe transmissions & outliers', 
    subgenres: ['Indie', 'Shoegaze', 'Metal', 'Punk'] 
  },
  { 
    id: 5, 
    name: 'SOUL / GOSPEL', 
    x: 4600, 
    y: 2700, 
    color: '#ff7e00', 
    desc: 'Celestial frequencies & organic soul', 
    subgenres: ['Soul', 'Gospel', 'Jazz', 'Funk'] 
  },
];
