import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Plus, X, Upload, Search, Link2, Share2, ChevronLeft, ChevronRight, ArrowLeft, Store } from 'lucide-react';
import API from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import theMarketHeader from '../assets/the_market.png';

// ─── Terminal color palette ───────────────────────────────────────────────────
const T = {
    bg:          '#000000',
    bgDeep:      '#000000',
    bgBox:       '#080808',
    border:      '#2a0a0a',
    borderDim:   '#1a0404',
    borderFaint: '#0f0202',
    pink:        '#ff006e',
    fuchsia:     '#ff0000',
    purple:      '#8b1a1a',
    purpleDim:   '#4a0a0a',
    purpleFaint: '#3d0a0a',
    purpleMid:   '#5c1a1a',
    descText:    '#8b3a3a',
    green:       '#2aff6e',
    mono:        "'Share Tech Mono', monospace",
};

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'ALL',       flag: '--all',       label: 'ALL'       },
    { id: 'APPAREL',   flag: '--apparel',   label: 'APPAREL'   },
    { id: 'JEWELRY',   flag: '--jewelry',   label: 'JEWELRY'   },
    { id: 'DIGITAL',   flag: '--digital',   label: 'DIGITAL'   },
    { id: 'VINYL',     flag: '--vinyl',     label: 'VINYL'     },
    { id: 'PRINTS',    flag: '--prints',    label: 'PRINTS'    },
    { id: 'MISC',      flag: '--misc',      label: 'MISC'      },
];

// ─── Daily-seeded shuffle (stable within same calendar day) ──────────────────
function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

function dailyShuffle(arr) {
    if (!arr.length) return arr;
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const rng = seededRandom(seed);
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ─── Category badge helper ────────────────────────────────────────────────────
function parseCategoryFromDesc(desc) {
    if (!desc) return 'MISC';
    const match = desc.match(/\[CAT:([A-Z]+)\]/);
    return match ? match[1] : 'MISC';
}

function stripCategoryTag(desc) {
    return desc ? desc.replace(/\[CAT:[A-Z]+\]/g, '').trim() : desc;
}

const ShoppingView = () => {
    const { language } = useLanguage();
    const isEs = language === 'es';

    const labels = {
        subtitle:               isEs ? 'TIENDAS DE ARTISTAS INDEPENDIENTES (barajado a diario"' : 'INDEPENDENT ARTIST STORES & MERCH (shuffled daily)',
        searchPlaceholder:      isEs ? 'Buscar productos o artistas...'      : 'Search products or artists...',
        uploadTitle:            isEs ? 'PUBLICAR PRODUCTO'                   : 'PUBLISH NEW PRODUCT',
        productName:            isEs ? 'Nombre del Producto'                 : 'Product Name',
        productNamePlaceholder: isEs ? 'Ej. Camiseta, Vinilo, Preset Pack'   : 'e.g., Logo T-Shirt, Vinyl Record, Presets',
        productPrice:           isEs ? 'Precio / Valor'                      : 'Price / Value',
        purchaseLink:           isEs ? 'Enlace de Compra / Tienda'           : 'Purchase / Store Link',
        purchaseLinkPlaceholder:isEs ? 'https://tu-tienda.com/producto'      : 'https://your-store.com/product',
        visualTeaser:           isEs ? 'Portada del Producto'                : 'Product Cover Media',
        uploadBtn:              isEs ? 'PUBLICAR PRODUCTO'                   : 'PUBLISH TO MARKETPLACE',
        buyBtn:                 isEs ? 'VISIT_STORE'                         : 'VISIT_STORE',
        copyLink:               isEs ? 'COPY_LINK'                           : 'COPY_LINK',
        shareProduct:           isEs ? 'SHARE'                               : 'SHARE',
        deleteBtn:              isEs ? '[ ELIMINAR // OWNER_ONLY ]'          : '[ DELETE_LISTING // OWNER_ONLY ]',
        noNodes:                isEs ? 'No se encontraron productos'         : 'No products found',
        activeProducts:         isEs ? 'ACTIVE_PRODUCTS'                     : 'ACTIVE_PRODUCTS',
        allFilter:              isEs ? 'Todo'                                : 'All',
        myFilter:               isEs ? 'Mis Productos'                       : 'My Products',
        // CHANGE #4: updated enter store label — bracket style, no icon
        enterStore:             isEs ? '[ ENTER_STORE ]'                     : '[ ENTER_STORE ]',
        backToMall:             isEs ? 'BACK TO MALL'                        : 'BACK TO MALL',
        categoryLabel:          isEs ? 'CATEGORÍA'                           : 'CATEGORY',
    };

    const [shops, setShops] = useState([]);
    const [shuffledShops, setShuffledShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShop, setSelectedShop] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [activeCat, setActiveCat] = useState('ALL');
    const [copiedId, setCopiedId] = useState(null);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [allDropdownOpen, setAllDropdownOpen] = useState(false);
    const allDropdownRef = React.useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        if (!allDropdownOpen) return;
        const handler = (e) => {
            if (allDropdownRef.current && !allDropdownRef.current.contains(e.target)) {
                setAllDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [allDropdownOpen]);

    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [link, setLink] = useState('');
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('MISC');
    const [mediaType, setMediaType] = useState('PHOTO');
    const [isUploading, setIsUploading] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = user.id || user.Id;
    const isLoggedIn = !!currentUserId;

    useEffect(() => { fetchShops(); }, []);

    useEffect(() => {
        if (!file) { setPreviewUrl(''); return; }
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    // Re-shuffle whenever shops change (once per day stable)
    useEffect(() => {
        setShuffledShops(dailyShuffle(shops));
    }, [shops]);

    const fetchShops = async () => {
        setLoading(true);
        try {
            const response = await API.Studio.getAllPosted();
            const isUrl = (str) => {
                if (!str) return false;
                const t = str.trim().toLowerCase();
                const c = t.includes('|') ? t.split('|')[0] : t;
                return c.startsWith('http://') || c.startsWith('https://') || c.startsWith('www.');
            };
            const filteredData = response.data.filter(item => isUrl(item.description || item.Description));
            const apiShops = filteredData.map(item => {
                const url      = item.url || item.Url || '';
                const desc     = item.description || item.Description || '';
                const rawTitle = item.title || item.Title || '';
                const type     = item.type || item.Type || 'PHOTO';
                const userId   = item.userId || item.UserId || 0;

                let parsedName = rawTitle;
                let parsedPrice = null;
                const priceMatch = rawTitle.match(/(.*)\s*\[([^\]]+)\]$/);
                if (priceMatch) { parsedName = priceMatch[1].trim(); parsedPrice = priceMatch[2].trim(); }

                let parsedLink = desc;
                let parsedDesc = '';
                if (desc.includes('|')) {
                    const parts = desc.split('|');
                    parsedLink = parts[0].trim();
                    parsedDesc = parts.slice(1).join('|').trim();
                }

                const cat = parseCategoryFromDesc(parsedDesc);
                const cleanDesc = stripCategoryTag(parsedDesc);

                const username =
                    item.username   || item.Username   ||
                    item.userName   || item.UserName   ||
                    item.user?.username || item.user?.Username ||
                    item.user?.name     || item.user?.Name     ||
                    item.artistName || item.ArtistName ||
                    item.author     || item.Author     ||
                    item.name       || item.Name;

                const nodeLabel = username ? username.toUpperCase() : `NODE_${userId}`;

                return {
                    id:         `api-${item.id || item.Id}`,
                    artistName: nodeLabel,
                    shopName:   parsedName,
                    price:      parsedPrice,
                    url:        parsedLink,
                    desc:       cleanDesc,
                    category:   cat,
                    image:      url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api/', '') || 'http://localhost:5264'}${url}`,
                    type,
                    timestamp:  new Date().toLocaleDateString(),
                };
            });
            setShops(apiShops);
        } catch (e) { console.error(e); setShops([]); }
        finally { setLoading(false); }
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setMediaType(f.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(f.name) ? 'VIDEO' : 'PHOTO');
        } else setFile(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !link || !title) { alert('Please fill all fields.'); return; }
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('File', file);
            formData.append('Title', price.trim() ? `${title.trim()} [${price.trim()}]` : title.trim());
            const descWithCat = description.trim()
                ? `${link.trim()}|${description.trim()} [CAT:${category}]`
                : `${link.trim()}|[CAT:${category}]`;
            formData.append('Description', descWithCat);
            formData.append('Type', mediaType);
            formData.append('IsPosted', 'true');
            await API.Studio.upload(formData);
            setFile(null); setLink(''); setTitle(''); setPrice(''); setDescription(''); setCategory('MISC');
            setIsModalOpen(false);
            fetchShops();
        } catch (e) { console.error(e); alert('Upload failed.'); }
        finally { setIsUploading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await API.Studio.delete(id);
            if (selectedShop?.id === `api-${id}`) setSelectedShop(null);
            fetchShops();
        } catch (e) { alert('Failed to delete.'); }
    };

    const getDomain = (url) => {
        try { return new URL(url).hostname.replace('www.', '').toUpperCase(); }
        catch { return 'STORE'; }
    };

    const handleCopyLink = (shop) => {
        navigator.clipboard.writeText(shop.url);
        setCopiedId(shop.id);
        setShowCopyToast(true);
        setTimeout(() => { setShowCopyToast(false); setCopiedId(null); }, 2000);
    };

    const formatPrice = (p) => {
        if (!p) return isEs ? 'PROMOCIONAL' : 'PROMOTIONAL';
        const t = p.trim();
        if (/^[\$\€\£\¥\₹\w]+\s*\d/.test(t)) return t.toUpperCase();
        if (!isNaN(t) || /^\d+(\.\d+)?$/.test(t)) return `$${t}`;
        return t.toUpperCase();
    };

    const filteredShops = shuffledShops.filter(s => {
        const matchSearch = s.shopName.toLowerCase().includes(searchTerm.toLowerCase()) || s.artistName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchOwner  = activeFilter === 'ALL' || (activeFilter === 'MY_NODES' && s.artistName === `NODE_${currentUserId}`);
        const matchCat    = activeCat === 'ALL' || s.category === activeCat;
        return matchSearch && matchOwner && matchCat;
    });

    const currentIndex = selectedShop ? filteredShops.findIndex(s => s.id === selectedShop.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < filteredShops.length - 1;

    useEffect(() => {
        const onKey = (e) => {
            if (!selectedShop) return;
            if (e.key === 'ArrowLeft'  && hasPrev) setSelectedShop(filteredShops[currentIndex - 1]);
            else if (e.key === 'ArrowRight' && hasNext) setSelectedShop(filteredShops[currentIndex + 1]);
            else if (e.key === 'Escape') setSelectedShop(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedShop, currentIndex, hasPrev, hasNext, filteredShops]);

    // ─── Shared button styles ─────────────────────────────────────────────────
    const btnPrimary = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '13px 16px',
        background: T.pink, color: '#000',
        fontFamily: T.mono, fontSize: 11, fontWeight: 900,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        border: 'none', borderRadius: 0, cursor: 'pointer', // CHANGE #1: borderRadius 0
        transition: 'background 0.15s',
    };
    const btnSec = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        flex: 1, padding: '10px 8px',
        background: T.bgBox, border: `1px solid ${T.border}`,
        color: T.pink, fontFamily: T.mono, fontSize: 9,
        fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
        borderRadius: 0, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s', // CHANGE #1: borderRadius 0
    };
    const btnDel = {
        width: '100%', padding: '9px 12px',
        background: 'transparent', border: `1px solid ${T.borderDim}`,
        color: T.purpleDim, fontFamily: T.mono, fontSize: 9,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        borderRadius: 0, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s', // CHANGE #1: borderRadius 0
        marginTop: 6,
    };

    // ─── Category badge chip (grid card) ─────────────────────────────────────
    const CatBadge = ({ cat }) => (
        <span style={{
            fontFamily: T.mono, fontSize: 8, letterSpacing: '0.14em',
            color: T.purpleDim, background: 'rgba(0,0,0,0.75)',
            border: `1px solid ${T.borderDim}`,
            padding: '2px 6px', borderRadius: 0, // CHANGE #1: borderRadius 0
        }}>
            [ {cat} ]
        </span>
    );

    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar bg-[#020202] relative text-white">

            {/* ── MAIN MALL VIEW ── */}
            <AnimatePresence>
                {!selectedShop && (
                    <motion.div
                        key="mall"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.2 }}
                        className="min-h-full flex flex-col"
                    >
                        {/* Mall Header */}
                        <div className="px-4 md:px-8 pt-6 pb-4 border-b border-white/5">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex items-end justify-between gap-4 mb-4">
                                    <div>
                                        <img src={theMarketHeader} alt="The Market" className="h-9 md:h-12 w-auto object-contain" />
                                        <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">{labels.subtitle}</p>
                                    </div>
                                </div>

                                {/* Search + filter row */}
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-between">
                                    {/* Search */}
                                    <div className="relative flex-1 max-w-md">
                                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder={labels.searchPlaceholder}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/10 focus:border-[#ff006e]/40 pl-8 pr-3 py-2 text-xs rounded-none focus:outline-none transition-colors placeholder:text-white/20" // CHANGE #1: rounded-none
                                        />
                                    </div>

                                    {/* ── ALL (dropdown) + MY PRODUCTS ── */}
                                    <div className="flex gap-2 items-center relative">

                                        {/* ALL — dropdown trigger */}
                                        <div className="relative" ref={allDropdownRef}>
                                            <button
                                                onClick={() => setAllDropdownOpen(v => !v)}
                                                style={{
                                                    fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em',
                                                    padding: '8px 14px',
                                                    border: (activeFilter === 'ALL')
                                                        ? `1px solid ${activeCat !== 'ALL' ? '#00f0ff' : '#ffffff'}`
                                                        : `1px solid ${T.borderDim}`,
                                                    background: activeFilter === 'ALL'
                                                        ? activeCat !== 'ALL' ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.9)'
                                                        : 'transparent',
                                                    color: activeFilter === 'ALL'
                                                        ? activeCat !== 'ALL' ? '#00f0ff' : '#000'
                                                        : T.purpleDim,
                                                    borderRadius: 0, cursor: 'pointer', // CHANGE #1: borderRadius 0
                                                    transition: 'all 0.15s',
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    textTransform: 'uppercase', fontWeight: 900,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {activeCat !== 'ALL'
                                                    ? CATEGORIES.find(c => c.id === activeCat)?.flag ?? '--all'
                                                    : labels.allFilter}
                                                <span style={{
                                                    fontSize: 7,
                                                    opacity: 0.6,
                                                    transform: allDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s',
                                                    display: 'inline-block',
                                                }}>▼</span>
                                            </button>

                                            {/* Dropdown panel */}
                                            <AnimatePresence>
                                                {allDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                                        transition={{ duration: 0.12 }}
                                                        style={{
                                                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                                                            zIndex: 200, minWidth: 160,
                                                            background: '#050505',
                                                            border: `1px solid ${T.border}`,
                                                            borderRadius: 0, // CHANGE #1: borderRadius 0
                                                            padding: '6px',
                                                            boxShadow: '0 8px 32px rgba(0,0,0,0.9)',
                                                            fontFamily: T.mono,
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => { setActiveCat('ALL'); setActiveFilter('ALL'); setAllDropdownOpen(false); }}
                                                            style={{
                                                                display: 'block', width: '100%', textAlign: 'left',
                                                                padding: '6px 10px', fontSize: 9,
                                                                letterSpacing: '0.16em', textTransform: 'uppercase',
                                                                background: activeCat === 'ALL' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                                                color: activeCat === 'ALL' ? '#fff' : T.purpleDim,
                                                                border: 'none', borderRadius: 0, cursor: 'pointer', // CHANGE #1: borderRadius 0
                                                                transition: 'all 0.1s',
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = activeCat === 'ALL' ? 'rgba(255,255,255,0.08)' : 'transparent'}
                                                        >
                                                            --all
                                                        </button>

                                                        <div style={{ height: 1, background: T.borderDim, margin: '4px 6px' }} />

                                                        {CATEGORIES.filter(c => c.id !== 'ALL').map(cat => {
                                                            const isActive = activeCat === cat.id;
                                                            return (
                                                                <button
                                                                    key={cat.id}
                                                                    onClick={() => { setActiveCat(cat.id); setActiveFilter('ALL'); setAllDropdownOpen(false); }}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                        width: '100%', textAlign: 'left',
                                                                        padding: '6px 10px', fontSize: 9,
                                                                        letterSpacing: '0.16em', textTransform: 'uppercase',
                                                                        background: isActive ? 'rgba(0,240,255,0.08)' : 'transparent',
                                                                        color: isActive ? '#00f0ff' : T.purpleDim,
                                                                        border: 'none', borderRadius: 0, cursor: 'pointer', // CHANGE #1: borderRadius 0
                                                                        transition: 'all 0.1s',
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.05)'; e.currentTarget.style.color = '#00f0ff'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(0,240,255,0.08)' : 'transparent'; e.currentTarget.style.color = isActive ? '#00f0ff' : T.purpleDim; }}
                                                                >
                                                                    <span>{cat.flag}</span>
                                                                    {isActive && <span style={{ fontSize: 7, color: '#00f0ff' }}>◆</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* MY PRODUCTS */}
                                        {isLoggedIn && (
                                            <button
                                                onClick={() => { setActiveFilter(f => f === 'MY_NODES' ? 'ALL' : 'MY_NODES'); setAllDropdownOpen(false); }}
                                                style={{
                                                    fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em',
                                                    padding: '8px 14px',
                                                    border: activeFilter === 'MY_NODES' ? `1px solid ${T.pink}` : `1px solid ${T.borderDim}`,
                                                    background: activeFilter === 'MY_NODES' ? 'rgba(255,0,110,0.1)' : 'transparent',
                                                    color: activeFilter === 'MY_NODES' ? T.pink : T.purpleDim,
                                                    borderRadius: 0, cursor: 'pointer', // CHANGE #1: borderRadius 0
                                                    transition: 'all 0.15s',
                                                    textTransform: 'uppercase', fontWeight: 900,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {labels.myFilter}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mall Floor */}
                        <div className="flex-1 px-4 md:px-8 py-6 pb-32">
                            <div className="max-w-7xl mx-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center py-32">
                                        <div className="text-[10px] text-white/30 uppercase tracking-widest animate-pulse">[ LOADING STORES... ]</div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">

                                        {/* Upload card — CHANGE #1: rounded-none, square icon */}
                                        <motion.div
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                            onClick={() => isLoggedIn ? setIsModalOpen(true) : alert('Please log in first.')}
                                            className="group cursor-pointer relative flex flex-col rounded-none overflow-hidden border border-dashed border-white/10 hover:border-[#ff006e]/40 bg-white/[0.015] transition-all duration-300 aspect-[3/4]"
                                        >
                                            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
                                                {/* CHANGE #1: square instead of rounded-full */}
                                                <div className="w-12 h-12 border border-white/10 group-hover:border-[#ff006e]/50 flex items-center justify-center transition-all">
                                                    <Plus size={20} className="text-white/30 group-hover:text-[#ff006e] transition-colors" />
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 group-hover:text-[#ff006e] transition-colors">{labels.uploadTitle}</div>
                                                    <div className="text-[9px] text-white/20 mt-1">{isLoggedIn ? (isEs ? 'Añadir enlace externo' : 'Add external link') : 'Login required'}</div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <AnimatePresence>
                                            {filteredShops.length === 0 && !loading ? (
                                                <div className="col-span-full py-20 text-center text-white/20 text-xs uppercase tracking-widest">{labels.noNodes}</div>
                                            ) : filteredShops.map((shop, i) => (
                                                <motion.div
                                                    key={shop.id}
                                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: Math.min(i * 0.04, 0.3), type: 'spring', stiffness: 120, damping: 18 }}
                                                    whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}
                                                    onClick={() => setSelectedShop(shop)}
                                                    // CHANGE #1: rounded-none; CHANGE #2: bracket corners via pseudo + glow on hover
                                                    className="group cursor-pointer relative flex flex-col rounded-none overflow-visible border border-[#1a0404] hover:border-[#ff006e] bg-[#060606] transition-all duration-300 aspect-[3/4]"
                                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 14px rgba(255,0,110,0.18), inset 0 0 20px rgba(255,0,110,0.03)'}
                                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                                >
                                                    {/* CHANGE #2: bracket corner accents */}
                                                    <div className="absolute -top-px -left-px w-2.5 h-2.5 border-t-2 border-l-2 border-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none" />
                                                    <div className="absolute -top-px -right-px w-2.5 h-2.5 border-t-2 border-r-2 border-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none" />
                                                    <div className="absolute -bottom-px -left-px w-2.5 h-2.5 border-b-2 border-l-2 border-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none" />
                                                    <div className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b-2 border-r-2 border-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none" />

                                                    <div className="relative flex-1 overflow-hidden bg-black/40">
                                                        {shop.type === 'VIDEO' ? (
                                                            <video src={shop.image} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" autoPlay muted loop playsInline />
                                                        ) : (
                                                            <img src={shop.image} alt={shop.shopName} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" loading="lazy" />
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent" />

                                                        {/* Category badge — top right, cyan */}
                                                        <div className="absolute top-2 right-2 text-[8px] font-black text-[#00f0ff] bg-black/80 border border-[#00f0ff]/30 px-2 py-0.5 rounded-none" // CHANGE #1: rounded-none
                                                            style={{ fontFamily: T.mono, letterSpacing: '0.14em' }}>
                                                            [ {shop.category} ]
                                                        </div>

                                                        {/* Domain badge */}
                                                        <div className="absolute top-2 left-2 text-[8px] bg-black/70 text-white/50 px-1.5 py-0.5 rounded-none"> {/* CHANGE #1: rounded-none */}
                                                            {getDomain(shop.url)}
                                                        </div>

                                                        {/* CHANGE #4: updated hover CTA — no icon, bracket style */}
                                                        <div className="absolute inset-0 bg-[#ff006e]/0 group-hover:bg-[#ff006e]/5 transition-colors duration-300 flex items-center justify-center">
                                                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-[#ff006e] text-black text-[9px] font-black tracking-[0.2em] px-3 py-1.5 flex items-center gap-1.5" style={{ borderRadius: 0 }}>
                                                                {labels.enterStore}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="px-3 py-2.5 bg-[#060606] border-t border-[#0f0202]">
                                                        <div className="text-[11px] font-bold text-white truncate group-hover:text-[#ff006e] transition-colors leading-tight" style={{ fontFamily: T.mono, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{shop.shopName}</div>
                                                        {/* CHANGE #3: comment syntax for artist name */}
                                                        <div className="text-[9px] mt-0.5 truncate" style={{ color: T.purpleDim, fontFamily: T.mono, letterSpacing: '0.1em' }}>// {shop.artistName}</div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── STORE DETAIL MODAL ── */}
            <AnimatePresence>
                {selectedShop && (
                    <motion.div
                        key="store-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-40 flex items-center justify-center p-2 md:p-8"
                        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
                        onClick={() => setSelectedShop(null)}
                    >
                        <motion.div
                            key={selectedShop.id}
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                width: '100%',
                                maxWidth: 900,
                                maxHeight: '92dvh',
                                background: T.bg,
                                border: `1px solid ${T.border}`,
                                borderRadius: 0, // CHANGE #1: borderRadius 0
                                overflow: 'hidden',
                                boxShadow: `0 0 80px rgba(255,0,110,0.12), 0 32px 64px rgba(0,0,0,0.8)`,
                                fontFamily: T.mono,
                            }}
                            className="flex-col md:flex-row"
                        >
                            {/* ── LEFT: Hero image ── */}
                            <div
                                className="relative flex-shrink-0 w-full md:w-[48%]"
                                style={{ minHeight: 300, maxHeight: '88vh', background: '#000' }}
                            >
                                <div className="absolute inset-0 bg-cover bg-center scale-110"
                                    style={{ backgroundImage: `url(${selectedShop.image})`, filter: 'blur(22px)', opacity: 0.15 }} />

                                {selectedShop.type === 'VIDEO' ? (
                                    <video src={selectedShop.image} className="relative z-10 w-full h-full object-cover md:object-contain" autoPlay muted loop playsInline style={{ maxHeight: '88vh' }} />
                                ) : (
                                    <img src={selectedShop.image} alt={selectedShop.shopName} className="relative z-10 w-full h-full object-cover md:object-contain" style={{ maxHeight: '88vh' }} />
                                )}

                                {/* Close / back */}
                                <button
                                    onClick={() => setSelectedShop(null)}
                                    style={{
                                        position: 'absolute', top: 12, left: 12, zIndex: 30,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                                        border: `1px solid ${T.border}`,
                                        color: '#e0e0e0', padding: '7px 12px', borderRadius: 0, // CHANGE #1: borderRadius 0
                                        fontFamily: T.mono, fontSize: 9, fontWeight: 700,
                                        letterSpacing: '0.14em', textTransform: 'uppercase',
                                        cursor: 'pointer', transition: 'border-color 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = T.pink}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                                >
                                    <ArrowLeft size={12} />
                                    <span>{labels.backToMall}</span>
                                </button>

                                {/* Prev arrow */}
                                {hasPrev && (
                                    <button onClick={() => setSelectedShop(filteredShops[currentIndex - 1])}
                                        style={{
                                            position: 'absolute', left: 12, bottom: 12, zIndex: 30,
                                            width: 34, height: 34, borderRadius: 0, // CHANGE #1: borderRadius 0
                                            background: 'rgba(0,0,0,0.75)', border: `1px solid ${T.border}`,
                                            color: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.pink; e.currentTarget.style.color = T.pink; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = '#e0e0e0'; }}
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                )}
                                {/* Next arrow */}
                                {hasNext && (
                                    <button onClick={() => setSelectedShop(filteredShops[currentIndex + 1])}
                                        style={{
                                            position: 'absolute', right: 12, bottom: 12, zIndex: 30,
                                            width: 34, height: 34, borderRadius: 0, // CHANGE #1: borderRadius 0
                                            background: 'rgba(0,0,0,0.75)', border: `1px solid ${T.border}`,
                                            color: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.pink; e.currentTarget.style.color = T.pink; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = '#e0e0e0'; }}
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                )}

                                {/* Counter */}
                                <div style={{
                                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
                                    fontFamily: T.mono, fontSize: 8, color: 'rgba(255,255,255,0.3)',
                                    background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: 0, // CHANGE #1: borderRadius 0
                                    letterSpacing: '0.1em', whiteSpace: 'nowrap',
                                }}>
                                    {currentIndex + 1} / {filteredShops.length}
                                </div>
                            </div>

                            {/* ── RIGHT: Terminal Info Panel ── */}
                            <div style={{
                                display: 'flex', flexDirection: 'column',
                                flex: 1, minWidth: 0,
                                background: T.bg,
                                borderLeft: `1px solid ${T.border}`,
                                overflowY: 'auto',
                            }}
                                className="no-scrollbar"
                            >
                                {/* Scrollable info */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }} className="no-scrollbar">

                                    <div style={{ marginBottom: 14 }}>
                                        <h1 style={{
                                            color: T.pink, fontSize: 20, fontWeight: 900,
                                            letterSpacing: '0.06em', lineHeight: 1.1,
                                            textTransform: 'uppercase', margin: '0 0 4px',
                                            wordBreak: 'break-word',
                                            animation: 'crtFlicker 6s ease-in-out infinite',
                                        }}>
                                            {selectedShop.shopName}
                                        </h1>
                                        <div style={{ color: T.purple, fontSize: 9, letterSpacing: '0.18em', marginTop: 2 }}>
                                            // INDEPENDENT ARTIST STORE — ID: {selectedShop.id.replace('api-', '0x').slice(0, 10).toUpperCase()}
                                        </div>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: `1px solid ${T.borderDim}`, margin: '12px 0' }} />

                                    {/* Price */}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                        <span style={{ color: T.fuchsia, fontSize: 26, fontWeight: 900, letterSpacing: '0.04em' }}>
                                            {formatPrice(selectedShop.price)}
                                        </span>
                                        <span style={{ color: T.purpleFaint, fontSize: 9, letterSpacing: '0.2em', fontWeight: 900 }}>NET_VALUE</span>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: `1px solid ${T.borderDim}`, margin: '12px 0' }} />

                                    {/* Metadata */}
                                    <div style={{ color: T.purple, fontSize: 9, letterSpacing: '0.18em', borderBottom: `1px solid ${T.borderDim}`, paddingBottom: 4, marginBottom: 6 }}>
                                        $ fetch node_metadata --verbose
                                    </div>
                                    {[
                                        { label: isEs ? 'VENDEDOR' : 'SELLER', value: selectedShop.artistName, color: T.pink },
                                        { label: 'PLATFORM',                   value: getDomain(selectedShop.url), color: T.fuchsia },
                                        { label: 'CATEGORY',                   value: `[ ${selectedShop.category} ]`, color: T.purpleMid },
                                        { label: 'SYNAPSE_HASH',               value: `0x${selectedShop.id.replace('api-', '')}`, color: T.purpleMid },
                                        { label: 'TIMESTAMP',                  value: selectedShop.timestamp, color: T.purpleMid },
                                    ].map(row => (
                                        <div key={row.label} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '6px 0', borderBottom: `1px solid ${T.borderFaint}`, fontSize: 10,
                                        }}>
                                            <span style={{ color: T.purpleDim, letterSpacing: '0.12em' }}>{row.label}</span>
                                            <span style={{ color: row.color, fontWeight: 700, letterSpacing: '0.06em', maxWidth: '58%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {row.value}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Gateway block */}
                                    <div style={{ color: T.purple, fontSize: 9, letterSpacing: '0.18em', borderBottom: `1px solid ${T.borderDim}`, paddingBottom: 4, margin: '14px 0 8px' }}>
                                        $ ping gateway --status
                                    </div>
                                    <div style={{ background: T.bgBox, border: `1px solid ${T.border}`, borderRadius: 0, padding: '11px 14px' }}> {/* CHANGE #1: borderRadius 0 */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <span style={{ color: T.fuchsia, fontSize: 9, letterSpacing: '0.14em' }}>[ GATEWAY_CONNECTION // ACTIVE ]</span>
                                            <span style={{ color: T.purple, fontSize: 9, animation: 'termPing 1.2s ease-in-out infinite' }}>● LIVE_FEED</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 9 }}>
                                            {[
                                                { k: 'ESTABLISHED', v: selectedShop.timestamp, c: T.pink },
                                                { k: 'STATUS',      v: 'SECURED',              c: T.green },
                                                { k: 'LATENCY',     v: '12ms',                 c: T.pink },
                                                { k: 'PROTOCOL',    v: 'HTTPS/2',              c: T.pink },
                                            ].map(r => (
                                                <div key={r.k}>
                                                    <div style={{ color: T.purpleDim, letterSpacing: '0.1em', marginBottom: 2 }}>{r.k}</div>
                                                    <div style={{ color: r.c, fontWeight: 700, letterSpacing: '0.06em' }}>{r.v}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {selectedShop.desc && (
                                        <div style={{ marginTop: 14 }}>
                                            <div style={{ color: T.purple, fontSize: 9, letterSpacing: '0.18em', borderBottom: `1px solid ${T.borderDim}`, paddingBottom: 4, marginBottom: 8 }}>
                                                $ cat description.txt
                                            </div>
                                            <div style={{ color: T.purpleDim, fontSize: 9, letterSpacing: '0.12em', marginBottom: 4 }}>PRODUCT_DESCRIPTION</div>
                                            <p style={{ color: T.descText, fontSize: 11, lineHeight: 1.65, margin: 0 }}>{selectedShop.desc}</p>
                                        </div>
                                    )}
                                </div>

                                {/* ── Sticky CTA footer ── */}
                                <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.borderDim}`, background: T.bgDeep }}>
                                    <div style={{ color: T.purple, fontSize: 9, letterSpacing: '0.12em', marginBottom: 10 }}>
                                        $ exec open_store --external
                                    </div>
                                    <button
                                        style={btnPrimary}
                                        onClick={() => window.open(selectedShop.url, '_blank')}
                                        onMouseEnter={e => e.currentTarget.style.background = '#ff409f'}
                                        onMouseLeave={e => e.currentTarget.style.background = T.pink}
                                    >
                                        {labels.buyBtn} <ExternalLink size={13} />
                                    </button>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                                        <button
                                            style={btnSec}
                                            onClick={() => handleCopyLink(selectedShop)}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = T.fuchsia; e.currentTarget.style.color = T.fuchsia; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.pink; }}
                                        >
                                            <Link2 size={11} />
                                            {copiedId === selectedShop.id ? 'COPIED!' : labels.copyLink}
                                        </button>
                                        <button
                                            style={btnSec}
                                            onClick={() => navigator.clipboard.writeText(selectedShop.url)}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = T.fuchsia; e.currentTarget.style.color = T.fuchsia; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.pink; }}
                                        >
                                            <Share2 size={11} /> {labels.shareProduct}
                                        </button>
                                    </div>
                                    {isLoggedIn && selectedShop.artistName === `NODE_${currentUserId}` && (
                                        <button
                                            style={btnDel}
                                            onClick={() => handleDelete(selectedShop.id.replace('api-', ''))}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,0,110,0.25)'; e.currentTarget.style.color = 'rgba(255,0,110,0.45)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderDim; e.currentTarget.style.color = T.purpleDim; }}
                                        >
                                            {labels.deleteBtn}
                                        </button>
                                    )}
                                    <div style={{ textAlign: 'center', color: T.purpleFaint, fontSize: 9, letterSpacing: '0.1em', marginTop: 8 }}>
                                        // NODE {currentIndex + 1} / {filteredShops.length} — USE ARROWS TO NAVIGATE
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── UPLOAD MODAL ── */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsModalOpen(false)}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#060608] border border-white/8 rounded-none w-full max-w-2xl relative shadow-2xl max-h-[90dvh] overflow-y-auto no-scrollbar" // CHANGE #1: rounded-none
                        >
                            <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 z-10 bg-[#060608]">
                                <div className="text-sm font-black uppercase tracking-widest text-[#ff006e]">[ {labels.uploadTitle} ]</div>
                                <button onClick={() => setIsModalOpen(false)} className="text-white/30 hover:text-white p-1.5 rounded-none hover:bg-white/5 transition-colors"> {/* CHANGE #1: rounded-none */}
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* File upload */}
                                <div>
                                    <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">{labels.visualTeaser}</div>
                                    {previewUrl ? (
                                        <div className="aspect-square rounded-none overflow-hidden bg-black/40 border border-white/5 relative"> {/* CHANGE #1: rounded-none */}
                                            <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-20" style={{ backgroundImage: `url(${previewUrl})` }} />
                                            {mediaType === 'VIDEO'
                                                ? <video src={previewUrl} className="w-full h-full object-contain relative z-10" autoPlay muted loop />
                                                : <img src={previewUrl} className="w-full h-full object-contain relative z-10" alt="Preview" />}
                                            <label htmlFor="file-change" className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer z-20 rounded-none transition-opacity"> {/* CHANGE #1: rounded-none */}
                                                <span className="text-[10px] font-bold uppercase border border-white/20 bg-black/80 px-3 py-1.5 rounded-none">{isEs ? 'CAMBIAR' : 'CHANGE FILE'}</span> {/* CHANGE #1: rounded-none */}
                                            </label>
                                            <input type="file" id="file-change" onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                                        </div>
                                    ) : (
                                        <label htmlFor="file-upload" className="aspect-square rounded-none border border-dashed border-white/10 hover:border-[#ff006e]/40 bg-white/[0.01] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"> {/* CHANGE #1: rounded-none */}
                                            {/* CHANGE #1: square instead of rounded-full */}
                                            <div className="w-10 h-10 border border-white/10 group-hover:border-[#ff006e]/30 flex items-center justify-center transition-all">
                                                <Upload size={16} className="text-white/30 group-hover:text-[#ff006e]" />
                                            </div>
                                            <span className="text-[10px] text-white/40 uppercase tracking-wider group-hover:text-white">{isEs ? 'SELECCIONAR ARCHIVO' : 'CHOOSE FILE'}</span>
                                            <input type="file" id="file-upload" onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                                        </label>
                                    )}
                                </div>

                                {/* Form fields */}
                                <div className="flex flex-col gap-4">
                                    {[
                                        { label: labels.productName,  value: title, set: setTitle, placeholder: labels.productNamePlaceholder, required: true },
                                        { label: labels.productPrice, value: price, set: setPrice, placeholder: isEs ? 'Ej. $25.00 o GRATIS' : 'e.g. $25.00 or FREE' },
                                        { label: labels.purchaseLink, value: link,  set: setLink,  placeholder: labels.purchaseLinkPlaceholder, required: true },
                                    ].map(f => (
                                        <div key={f.label}>
                                            <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1.5">{f.label}</label>
                                            <input
                                                value={f.value} onChange={e => f.set(e.target.value)}
                                                placeholder={f.placeholder} required={f.required}
                                                className="w-full bg-white/[0.04] border border-white/8 focus:border-[#ff006e]/40 px-3 py-2.5 text-xs rounded-none focus:outline-none transition-colors placeholder:text-white/15" // CHANGE #1: rounded-none
                                            />
                                        </div>
                                    ))}

                                    {/* Category selector */}
                                    <div>
                                        <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-2">{labels.categoryLabel}</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {CATEGORIES.filter(c => c.id !== 'ALL').map(cat => {
                                                const active = category === cat.id;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={cat.id}
                                                        onClick={() => setCategory(cat.id)}
                                                        style={{
                                                            fontFamily: T.mono,
                                                            fontSize: 9,
                                                            letterSpacing: '0.14em',
                                                            padding: '4px 9px',
                                                            borderRadius: 0, // CHANGE #1: borderRadius 0
                                                            border: active ? `1px solid ${T.pink}` : `1px solid ${T.borderDim}`,
                                                            background: active ? 'rgba(255,0,110,0.1)' : 'transparent',
                                                            color: active ? T.pink : T.purpleDim,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.12s',
                                                        }}
                                                    >
                                                        {active ? '[x]' : '[ ]'} {cat.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1.5">{isEs ? 'Descripción' : 'Description'}</label>
                                        <textarea
                                            value={description} onChange={e => setDescription(e.target.value)}
                                            rows={3} placeholder={isEs ? 'Descripción del producto...' : 'Product description...'}
                                            className="w-full bg-white/[0.04] border border-white/8 focus:border-[#ff006e]/40 px-3 py-2.5 text-xs rounded-none focus:outline-none transition-colors resize-none placeholder:text-white/15" // CHANGE #1: rounded-none
                                        />
                                    </div>

                                    <button
                                        type="submit" disabled={isUploading}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#ff006e] to-[#ff409f] hover:from-[#ff0080] hover:to-[#ff50af] text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-none disabled:opacity-50 transition-all mt-auto" // CHANGE #1: rounded-none
                                    >
                                        {isUploading ? '[ PUBLISHING... ]' : labels.uploadBtn}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Copy toast ── */}
            <AnimatePresence>
                {showCopyToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 999, background: T.pink, color: '#000',
                            fontFamily: T.mono, fontSize: 9, fontWeight: 900,
                            letterSpacing: '0.18em', padding: '8px 20px', borderRadius: 0, // CHANGE #1: borderRadius 0
                        }}
                    >
                        [ LINK_COPIED // SECURED ]
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Global keyframes ── */}
            <style>{`
                @keyframes termPing    { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
                @keyframes crtFlicker  {
                    0%,100% { opacity: 1; }
                    92%     { opacity: 1; }
                    93%     { opacity: 0.6; }
                    94%     { opacity: 1; }
                    96%     { opacity: 0.8; }
                    97%     { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ShoppingView;