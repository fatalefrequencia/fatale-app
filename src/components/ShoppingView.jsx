import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Plus, X, Upload, Search, Link2, Share2, ChevronLeft, ChevronRight, ArrowLeft, Store } from 'lucide-react';
import API from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import theMarketHeader from '../assets/the_market.png';

const ShoppingView = () => {
    const { language } = useLanguage();
    const isEs = language === 'es';

    const labels = {
        subtitle: isEs ? 'TIENDAS DE ARTISTAS INDEPENDIENTES' : 'INDEPENDENT ARTIST STORES & MERCH',
        searchPlaceholder: isEs ? 'Buscar productos o artistas...' : 'Search products or artists...',
        uploadTitle: isEs ? 'PUBLICAR PRODUCTO' : 'PUBLISH NEW PRODUCT',
        productName: isEs ? 'Nombre del Producto' : 'Product Name',
        productNamePlaceholder: isEs ? 'Ej. Camiseta, Vinilo, Preset Pack' : 'e.g., Logo T-Shirt, Vinyl Record, Presets',
        productPrice: isEs ? 'Precio / Valor' : 'Price / Value',
        purchaseLink: isEs ? 'Enlace de Compra / Tienda' : 'Purchase / Store Link',
        purchaseLinkPlaceholder: isEs ? 'https://tu-tienda.com/producto' : 'https://your-store.com/product',
        visualTeaser: isEs ? 'Portada del Producto' : 'Product Cover Media',
        uploadBtn: isEs ? 'PUBLICAR PRODUCTO' : 'PUBLISH TO MARKETPLACE',
        buyBtn: isEs ? 'VISITAR TIENDA' : 'VISIT STORE',
        copyLink: isEs ? 'COPIAR' : 'COPY LINK',
        shareProduct: isEs ? 'COMPARTIR' : 'SHARE',
        deleteBtn: isEs ? 'ELIMINAR' : 'DELETE LISTING',
        noNodes: isEs ? 'No se encontraron productos' : 'No products found',
        activeProducts: isEs ? 'PRODUCTOS ACTIVOS' : 'ACTIVE PRODUCTS',
        allFilter: isEs ? 'Todo' : 'All',
        myFilter: isEs ? 'Mis Productos' : 'My Products',
        enterStore: isEs ? 'ENTRAR' : 'ENTER',
        backToMall: isEs ? 'VOLVER AL MERCADO' : 'BACK TO MALL',
    };

    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [copiedId, setCopiedId] = useState(null);
    const [showCopyToast, setShowCopyToast] = useState(false);

    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [link, setLink] = useState('');
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
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
                const url = item.url || item.Url || '';
                const desc = item.description || item.Description || '';
                const rawTitle = item.title || item.Title || '';
                const type = item.type || item.Type || 'PHOTO';
                const userId = item.userId || item.UserId || 0;
                let parsedName = rawTitle;
                let parsedPrice = null;
                const priceMatch = rawTitle.match(/(.*)\s*\[([^\]]+)\]$/);
                if (priceMatch) { parsedName = priceMatch[1].trim(); parsedPrice = priceMatch[2].trim(); }
                let parsedLink = desc;
                let parsedDesc = '';
                if (desc.includes('|')) { const parts = desc.split('|'); parsedLink = parts[0].trim(); parsedDesc = parts.slice(1).join('|').trim(); }
                return {
                    id: `api-${item.id || item.Id}`,
                    artistName: `USER_${userId}`,
                    shopName: parsedName,
                    price: parsedPrice,
                    url: parsedLink,
                    desc: parsedDesc,
                    image: url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api/', '') || 'http://localhost:5264'}${url}`,
                    type,
                    timestamp: new Date().toLocaleDateString()
                };
            });
            setShops(apiShops.reverse());
        } catch (e) { console.error(e); setShops([]); }
        finally { setLoading(false); }
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            const isVideo = f.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(f.name);
            setMediaType(isVideo ? 'VIDEO' : 'PHOTO');
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
            formData.append('Description', description.trim() ? `${link.trim()}|${description.trim()}` : link.trim());
            formData.append('Type', mediaType);
            formData.append('IsPosted', 'true');
            await API.Studio.upload(formData);
            setFile(null); setLink(''); setTitle(''); setPrice(''); setDescription('');
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

    const filteredShops = shops.filter(s => {
        const matchSearch = s.shopName.toLowerCase().includes(searchTerm.toLowerCase()) || s.artistName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter = activeFilter === 'ALL' || (activeFilter === 'MY_NODES' && s.artistName === `USER_${currentUserId}`);
        return matchSearch && matchFilter;
    });

    const currentIndex = selectedShop ? filteredShops.findIndex(s => s.id === selectedShop.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < filteredShops.length - 1;

    useEffect(() => {
        const onKey = (e) => {
            if (!selectedShop) return;
            if (e.key === 'ArrowLeft' && hasPrev) setSelectedShop(filteredShops[currentIndex - 1]);
            else if (e.key === 'ArrowRight' && hasNext) setSelectedShop(filteredShops[currentIndex + 1]);
            else if (e.key === 'Escape') setSelectedShop(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedShop, currentIndex, hasPrev, hasNext, filteredShops]);

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
                                    <div className="text-right">
                                        <div className="text-[9px] text-white/20 uppercase tracking-widest">{labels.activeProducts}</div>
                                        <div className="text-xl font-black text-[#ff006e]">{shops.length}</div>
                                    </div>
                                </div>

                                {/* Search + Filters row */}
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                    <div className="relative flex-1 max-w-md">
                                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder={labels.searchPlaceholder}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/10 focus:border-[#ff006e]/40 pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-colors placeholder:text-white/20"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {[{ id: 'ALL', label: labels.allFilter }, { id: 'MY_NODES', label: labels.myFilter, auth: true }].map(f => {
                                            if (f.auth && !isLoggedIn) return null;
                                            const active = activeFilter === f.id;
                                            return (
                                                <button key={f.id} onClick={() => setActiveFilter(f.id)}
                                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${active ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                                                    {f.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mall Floor — Store Cards Grid */}
                        <div className="flex-1 px-4 md:px-8 py-6 pb-32">
                            <div className="max-w-7xl mx-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center py-32">
                                        <div className="text-[10px] text-white/30 uppercase tracking-widest animate-pulse">[ LOADING STORES... ]</div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">

                                        {/* Publish Card */}
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => isLoggedIn ? setIsModalOpen(true) : alert('Please log in first.')}
                                            className="group cursor-pointer relative flex flex-col rounded-xl overflow-hidden border border-dashed border-white/10 hover:border-[#ff006e]/40 bg-white/[0.015] transition-all duration-300 aspect-[3/4]"
                                        >
                                            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
                                                <div className="w-12 h-12 rounded-full border border-white/10 group-hover:border-[#ff006e]/50 flex items-center justify-center transition-all">
                                                    <Plus size={20} className="text-white/30 group-hover:text-[#ff006e] transition-colors" />
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 group-hover:text-[#ff006e] transition-colors">{labels.uploadTitle}</div>
                                                    <div className="text-[9px] text-white/20 mt-1">{isLoggedIn ? (isEs ? 'Añadir enlace externo' : 'Add external link') : 'Login required'}</div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Store Cards */}
                                        <AnimatePresence>
                                            {filteredShops.length === 0 && !loading ? (
                                                <div className="col-span-full py-20 text-center text-white/20 text-xs uppercase tracking-widest">{labels.noNodes}</div>
                                            ) : filteredShops.map((shop, i) => (
                                                <motion.div
                                                    key={shop.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: Math.min(i * 0.04, 0.3), type: 'spring', stiffness: 120, damping: 18 }}
                                                    whileHover={{ y: -4 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setSelectedShop(shop)}
                                                    className="group cursor-pointer relative flex flex-col rounded-xl overflow-hidden border border-white/5 hover:border-[#ff006e]/30 bg-[#0a0a0a] transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(255,0,110,0.12)] aspect-[3/4]"
                                                >
                                                    {/* Hero Image — 75% of card */}
                                                    <div className="relative flex-1 overflow-hidden bg-black/40">
                                                        {shop.type === 'VIDEO' ? (
                                                            <video src={shop.image} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" autoPlay muted loop playsInline />
                                                        ) : (
                                                            <img src={shop.image} alt={shop.shopName} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" loading="lazy" />
                                                        )}

                                                        {/* Gradient overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

                                                        {/* Price badge */}
                                                        {shop.price && (
                                                            <div className="absolute top-2 right-2 text-[10px] font-black text-[#00f0ff] bg-black/80 border border-[#00f0ff]/30 px-2 py-0.5 rounded-md group-hover:border-[#ff006e]/50 group-hover:text-[#ff006e] transition-colors">
                                                                {formatPrice(shop.price)}
                                                            </div>
                                                        )}

                                                        {/* Domain badge */}
                                                        <div className="absolute top-2 left-2 text-[8px] bg-black/70 text-white/50 px-1.5 py-0.5 rounded">
                                                            {getDomain(shop.url)}
                                                        </div>

                                                        {/* Enter overlay on hover */}
                                                        <div className="absolute inset-0 bg-[#ff006e]/0 group-hover:bg-[#ff006e]/5 transition-colors duration-300 flex items-center justify-center">
                                                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-[#ff006e] text-black text-[9px] font-black tracking-[0.2em] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                                <Store size={10} />
                                                                {labels.enterStore}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Footer — Store Info */}
                                                    <div className="px-3 py-2.5 bg-[#0a0a0a] border-t border-white/5">
                                                        <div className="text-[11px] font-bold text-white truncate group-hover:text-[#ff006e] transition-colors leading-tight">
                                                            {shop.shopName}
                                                        </div>
                                                        <div className="text-[9px] text-white/30 mt-0.5 truncate">{shop.artistName}</div>
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

            {/* ── STORE DETAIL VIEW (full-screen "inside store") ── */}
            <AnimatePresence>
                {selectedShop && (
                    <motion.div
                        key="store-detail"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        className="absolute inset-0 bg-[#020202] flex flex-col overflow-y-auto no-scrollbar z-20"
                    >
                        {/* Animated key for store transitions */}
                        <motion.div
                            key={selectedShop.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col min-h-full"
                        >
                            {/* Hero Image — top 45% on mobile, side panel on desktop */}
                            <div className="flex flex-col md:flex-row flex-1">

                                {/* Left / Top: Hero */}
                                <div className="relative w-full md:w-[55%] lg:w-[60%] md:h-full" style={{ minHeight: '45vw', maxHeight: '70vh' }}>
                                    {/* Blurred BG */}
                                    <div className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110"
                                        style={{ backgroundImage: `url(${selectedShop.image})` }} />

                                    {selectedShop.type === 'VIDEO' ? (
                                        <video src={selectedShop.image} className="relative z-10 w-full h-full object-cover md:object-contain" autoPlay muted loop playsInline />
                                    ) : (
                                        <img src={selectedShop.image} alt={selectedShop.shopName} className="relative z-10 w-full h-full object-cover md:object-contain" />
                                    )}

                                    {/* Back button (top-left) */}
                                    <button
                                        onClick={() => setSelectedShop(null)}
                                        className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-white/10 hover:border-[#ff006e]/50 text-white/80 hover:text-white px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                                    >
                                        <ArrowLeft size={13} />
                                        <span className="hidden sm:inline">{labels.backToMall}</span>
                                    </button>

                                    {/* Nav arrows */}
                                    {hasPrev && (
                                        <button onClick={() => setSelectedShop(filteredShops[currentIndex - 1])}
                                            className="absolute left-4 bottom-4 z-30 w-9 h-9 rounded-full bg-black/70 border border-white/10 hover:border-[#ff006e]/50 hover:text-[#ff006e] flex items-center justify-center transition-all">
                                            <ChevronLeft size={16} />
                                        </button>
                                    )}
                                    {hasNext && (
                                        <button onClick={() => setSelectedShop(filteredShops[currentIndex + 1])}
                                            className="absolute right-4 bottom-4 z-30 w-9 h-9 rounded-full bg-black/70 border border-white/10 hover:border-[#ff006e]/50 hover:text-[#ff006e] flex items-center justify-center transition-all">
                                            <ChevronRight size={16} />
                                        </button>
                                    )}

                                    {/* Store counter */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-[9px] text-white/40 bg-black/60 px-3 py-1 rounded-full">
                                        {currentIndex + 1} / {filteredShops.length}
                                    </div>
                                </div>

                                {/* Right / Bottom: Info Panel — TERMINAL STYLE */}
<div className="w-full md:w-[45%] lg:w-[40%] flex flex-col bg-[#07060a] md:border-l border-[#2a0a2e] relative" style={{ fontFamily: "'Courier New', monospace" }}>
  <div className="flex-1 overflow-y-auto no-scrollbar p-5 md:p-6 space-y-4">

    {/* Boot prompt */}
    <div>
      <div className="text-[10px] text-[#8b1a8b] tracking-[.12em] mb-0.5">$ cat store_info.json</div>
      <div className="text-[10px] text-[#cc00aa] tracking-[.08em] mb-3">// fetching product node... OK <span className="inline-block w-2 h-3 bg-[#cc00aa] align-middle animate-pulse" /></div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-ping" />
        <span className="text-[9px] font-black tracking-[.2em] text-[#cc00aa]">ACTIVE_PRODUCTS // NODE_LIVE</span>
      </div>
      <h1 className="text-2xl font-black tracking-[.06em] text-[#ff006e] leading-tight uppercase">
        {selectedShop.shopName}
      </h1>
      <div className="text-[9px] text-[#8b1a8b] tracking-[.18em] mt-1">
        // INDEPENDENT ARTIST STORE — MARKETPLACE_ID: {selectedShop.id.replace('api-', '0x').slice(0,8).toUpperCase()}
      </div>
    </div>

    <hr className="border-[#1a041a]" />

    {/* Price */}
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-black tracking-[.04em] text-[#cc00aa]">
        {formatPrice(selectedShop.price)}
      </span>
      <span className="text-[9px] text-[#3d0a3d] tracking-[.2em] font-black">NET_VALUE</span>
    </div>

    <hr className="border-[#1a041a]" />

    {/* Metadata rows */}
    <div>
      <div className="text-[9px] text-[#8b1a8b] tracking-[.18em] border-b border-[#1a041a] pb-1 mb-1">
        $ fetch node_metadata --verbose
      </div>
      {[
        { label: isEs ? 'VENDEDOR' : 'SELLER', value: selectedShop.artistName, cls: 'text-[#ff006e]' },
        { label: 'PLATFORM', value: getDomain(selectedShop.url), cls: 'text-[#cc00aa]' },
        { label: 'SYNAPSE_HASH', value: `0x${selectedShop.id.replace('api-', '')}`, cls: 'text-[#5c1a5c]' },
        { label: 'TIMESTAMP', value: selectedShop.timestamp, cls: 'text-[#5c1a5c]' },
      ].map(row => (
        <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-[#0f020f] text-[10px]">
          <span className="text-[#4a0a4a] tracking-[.12em]">{row.label}</span>
          <span className={`font-bold truncate max-w-[55%] text-right tracking-[.06em] ${row.cls}`}>{row.value}</span>
        </div>
      ))}
    </div>

    {/* Gateway block */}
    <div>
      <div className="text-[9px] text-[#8b1a8b] tracking-[.18em] border-b border-[#1a041a] pb-1 mb-2">
        $ ping gateway --status
      </div>
      <div className="bg-[#0b020e] border border-[#2a0a2e] rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between text-[9px] tracking-[.15em] text-[#cc00aa]">
          <span>[ GATEWAY_CONNECTION // ACTIVE ]</span>
          <span className="text-[#8b1a8b] animate-pulse">● LIVE_FEED</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[9px]">
          {[
            { k: 'ESTABLISHED', v: selectedShop.timestamp, c: 'text-[#ff006e]' },
            { k: 'STATUS', v: 'SECURED', c: 'text-green-400' },
            { k: 'LATENCY', v: '12ms', c: 'text-[#ff006e]' },
            { k: 'PROTOCOL', v: 'HTTPS/2', c: 'text-[#ff006e]' },
          ].map(r => (
            <div key={r.k}>
              <div className="text-[#4a0a4a] tracking-[.1em] mb-0.5">{r.k}</div>
              <div className={`font-bold tracking-[.06em] ${r.c}`}>{r.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Description */}
    {selectedShop.desc && (
      <div>
        <div className="text-[9px] text-[#8b1a8b] tracking-[.18em] border-b border-[#1a041a] pb-1 mb-2">
          $ cat description.txt
        </div>
        <div className="text-[9px] text-[#4a0a4a] tracking-[.1em] mb-1.5">PRODUCT_DESCRIPTION</div>
        <p className="text-[11px] text-[#8b3a7a] leading-relaxed">{selectedShop.desc}</p>
      </div>
    )}
  </div>

  {/* Sticky CTA footer */}
  <div className="p-4 md:p-5 border-t border-[#1a041a] bg-[#060408] space-y-2">
    <div className="text-[9px] text-[#8b1a8b] tracking-[.12em] mb-2">$ exec open_store --external</div>

    {/* Primary */}
    <button
      onClick={() => window.open(selectedShop.url, '_blank')}
      className="w-full py-3.5 bg-[#ff006e] hover:bg-[#ff409f] text-black font-black uppercase text-[11px] tracking-[.22em] rounded flex items-center justify-center gap-2 transition-colors"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      VISIT_STORE
      <ExternalLink size={13} />
    </button>

    {/* Secondary row */}
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => handleCopyLink(selectedShop)}
        className="py-2.5 bg-[#0b020e] border border-[#2a0a2e] hover:border-[#cc00aa] text-[#ff006e] hover:text-[#cc00aa] text-[9px] font-bold tracking-[.15em] rounded transition-colors flex items-center justify-center gap-1.5"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        <Link2 size={11} />
        {copiedId === selectedShop.id ? 'COPIED!' : 'COPY_LINK'}
      </button>
      <button
        onClick={() => { navigator.clipboard.writeText(selectedShop.url); }}
        className="py-2.5 bg-[#0b020e] border border-[#2a0a2e] hover:border-[#cc00aa] text-[#ff006e] hover:text-[#cc00aa] text-[9px] font-bold tracking-[.15em] rounded transition-colors flex items-center justify-center gap-1.5"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        <Share2 size={11} />
        SHARE
      </button>
    </div>

    {/* Delete */}
    {isLoggedIn && selectedShop.artistName === `USER_${currentUserId}` && (
      <button
        onClick={() => handleDelete(selectedShop.id.replace('api-', ''))}
        className="w-full py-2 border border-[#1a0418] hover:border-[#ff006e33] text-[#4a0a4a] hover:text-[#ff006e55] text-[9px] tracking-[.18em] rounded transition-colors"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        [ DELETE_LISTING // OWNER_ONLY ]
      </button>
    )}

    <div className="text-center text-[9px] text-[#3d0a3d] tracking-[.1em]">
      // NODE {currentIndex + 1} / {filteredShops.length} — USE ARROWS TO NAVIGATE
    </div>
  </div>
</div>
                        </motion.div>

                        {/* Copy toast */}
                        <AnimatePresence>
                            {showCopyToast && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#ff006e] text-black text-[9px] font-black tracking-widest px-5 py-2 rounded-full shadow-[0_0_20px_rgba(255,0,110,0.4)]"
                                >
                                    [ LINK_COPIED // SECURED ]
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── UPLOAD MODAL ── */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsModalOpen(false)}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#060608] border border-white/8 rounded-2xl w-full max-w-2xl relative overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-white/5">
                                <div className="text-sm font-black uppercase tracking-widest text-[#ff006e]">[ {labels.uploadTitle} ]</div>
                                <button onClick={() => setIsModalOpen(false)} className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Preview */}
                                <div>
                                    <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">{labels.visualTeaser}</div>
                                    {previewUrl ? (
                                        <div className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 relative">
                                            <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-20" style={{ backgroundImage: `url(${previewUrl})` }} />
                                            {mediaType === 'VIDEO'
                                                ? <video src={previewUrl} className="w-full h-full object-contain relative z-10" autoPlay muted loop />
                                                : <img src={previewUrl} className="w-full h-full object-contain relative z-10" alt="Preview" />}
                                            <label htmlFor="file-change" className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer z-20 rounded-xl transition-opacity">
                                                <span className="text-[10px] font-bold uppercase border border-white/20 bg-black/80 px-3 py-1.5 rounded-lg">{isEs ? 'CAMBIAR' : 'CHANGE FILE'}</span>
                                            </label>
                                            <input type="file" id="file-change" onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                                        </div>
                                    ) : (
                                        <label htmlFor="file-upload" className="aspect-square rounded-xl border border-dashed border-white/10 hover:border-[#ff006e]/40 bg-white/[0.01] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group">
                                            <div className="w-10 h-10 rounded-full border border-white/10 group-hover:border-[#ff006e]/30 flex items-center justify-center transition-all">
                                                <Upload size={16} className="text-white/30 group-hover:text-[#ff006e]" />
                                            </div>
                                            <span className="text-[10px] text-white/40 uppercase tracking-wider group-hover:text-white">{isEs ? 'SELECCIONAR ARCHIVO' : 'CHOOSE FILE'}</span>
                                            <input type="file" id="file-upload" onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                                        </label>
                                    )}
                                </div>

                                {/* Fields */}
                                <div className="flex flex-col gap-4">
                                    {[
                                        { label: labels.productName, value: title, set: setTitle, placeholder: labels.productNamePlaceholder, required: true },
                                        { label: labels.productPrice, value: price, set: setPrice, placeholder: isEs ? 'Ej. $25.00 o GRATIS' : 'e.g. $25.00 or FREE' },
                                        { label: labels.purchaseLink, value: link, set: setLink, placeholder: labels.purchaseLinkPlaceholder, required: true },
                                    ].map(f => (
                                        <div key={f.label}>
                                            <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1.5">{f.label}</label>
                                            <input
                                                value={f.value}
                                                onChange={e => f.set(e.target.value)}
                                                placeholder={f.placeholder}
                                                required={f.required}
                                                className="w-full bg-white/[0.04] border border-white/8 focus:border-[#ff006e]/40 px-3 py-2.5 text-xs rounded-xl focus:outline-none transition-colors placeholder:text-white/15"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1.5">{isEs ? 'Descripción' : 'Description'}</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            rows={3}
                                            placeholder={isEs ? 'Descripción del producto...' : 'Product description...'}
                                            className="w-full bg-white/[0.04] border border-white/8 focus:border-[#ff006e]/40 px-3 py-2.5 text-xs rounded-xl focus:outline-none transition-colors resize-none placeholder:text-white/15"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#ff006e] to-[#ff409f] hover:from-[#ff0080] hover:to-[#ff50af] text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(255,0,110,0.2)] hover:shadow-[0_0_30px_rgba(255,0,110,0.35)] disabled:opacity-50 transition-all mt-auto"
                                    >
                                        {isUploading ? '[ PUBLISHING... ]' : labels.uploadBtn}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ShoppingView;
