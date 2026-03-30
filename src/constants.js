export const API_BASE_URL = (import.meta.env.VITE_SIGNALR_URL || 
  (import.meta.env.PROD 
    ? (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api/', '') : 'https://fatalecore-production.up.railway.app')
    : 'http://localhost:5264')).replace(/\/+$/, '') + '/'; // Ensure exactly ONE trailing slash

export const getMediaUrl = (path) => {
  if (!path || path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}${cleanPath}`; // API_BASE_URL now has the slash
};

export const getUserId = (u) => {
  if (!u) return null;
  const raw = u.id || u.Id || u.userId || u.UserId;
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? null : parsed;
};

export const SECTORS = [
  { 
    id: 0, 
    name: 'CLUB / BASS', 
    x: 1000, 
    y: 1000, 
    color: '#ff006e', 
    desc: 'Underground beats & raw signal', 
    subgenres: ['House', 'Techno', 'Bass', 'UKG'] 
  },
  { 
    id: 1, 
    name: 'POP / R&B', 
    x: 4000, 
    y: 500, 
    color: '#00ffff', 
    desc: 'Synthetic highs & digital dreams', 
    subgenres: ['Hyperpop', 'R&B', 'Pop', 'Dance'] 
  },
  { 
    id: 2, 
    name: 'AMBIENT / EXPERIMENTAL', 
    x: 1000, 
    y: 4000, 
    color: '#9b5de5', 
    desc: 'Deep frequency & noise art', 
    subgenres: ['Ambient', 'Experimental', 'IDM', 'Noise'] 
  },
  { 
    id: 3, 
    name: 'RAP / DRILL', 
    x: 4000, 
    y: 5500, 
    color: '#ffcc00', 
    desc: 'Convergence point of all signals', 
    subgenres: ['Trap', 'Drill', 'Rap', 'Boom Bap'] 
  },
  { 
    id: 4, 
    name: 'ROCK / METAL', 
    x: 7000, 
    y: 1000, 
    color: '#00ff88', 
    desc: 'Fringe transmissions & outliers', 
    subgenres: ['Indie', 'Shoegaze', 'Metal', 'Punk'] 
  },
  { 
    id: 5, 
    name: 'SOUL / GOSPEL', 
    x: 7000, 
    y: 4000, 
    color: '#ff7e00', 
    desc: 'Celestial frequencies & organic soul', 
    subgenres: ['Soul', 'Gospel', 'Jazz', 'Funk'] 
  },
];
