import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Plus, X, Upload, Search, Link2, Share2, ChevronLeft, ChevronRight, ArrowLeft, Store } from 'lucide-react';
import API from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import theMarketHeader from '../assets/the_market.png';

// ─── Terminal color palette (inline styles — never rely on Tailwind JIT for these) ───
const T = {
    bg:         '#000000',
    bgDeep:     '#000000',
    bgBox:      '#080808',
border:     '#2a0a0a',
borderDim:  '#1a0404',
borderFaint:'#0f0202',
    pink:       '#ff006e',
    fuchsia:    '#cc00aa',
        purple:     '#8b1a1a',
    purpleDim:  '#4a0a0a',
    purpleFaint:'#3d0a0a',
    purpleMid:  '#5c1a1a',
    descText:   '#8b3a3a',
    green:      '#2aff6e',
    mono:       "'Share Tech Mono', monospace",
};

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
        buyBtn: isEs ? 'VISIT_STORE' : 'VISIT_STORE',
        copyLink: isEs ? 'COPY_LINK' : 'COPY_LINK',
        shareProduct: isEs ? 'SHARE' : 'SHARE',
        deleteBtn: isEs ? '[ ELIMINAR // OWNER_ONLY ]' : '[ DELETE_LISTING // OWNER_ONLY ]',
        noNodes: isEs ? 'No se encontraron productos' : 'No products found',
        activeProducts: isEs ? 'ACTIVE_PRODUCTS' : 'ACTIVE_PRODUCTS',
        allFilter: isEs ? 'Todo' : 'All',
        myFilter: isEs ? 'Mis Productos' : 'My Products',
        enterStore: isEs ? 'ENTRAR' : 'ENTER',
        backToMall: isEs ? 'BACK TO MALL' : 'BACK TO MALL',
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
                    timestamp: new Date().toLocaleDateString(),
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

    // ─── Shared terminal button styles ───────────────────────────────────────────
    const btnPrimary = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '14px 16px',
        background: T.pink, color: '#000',
        fontFamily: T.mono, fontSize: 11, fontWeight: 900,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        border: 'none', borderRadius: 4, cursor: 'pointer',
        transition: 'background 0.15s',
    };
    const btnSec = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        flex: 1, padding: '11px 8px',
        background: T.bgBox, border: `1px solid ${T.border}`,
        color: T.pink, fontFamily: T.mono, fontSize: 9,
        fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
        borderRadius: 4, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
    };
    const btnDel = {
        width: '100%', padding: '9px 12px',
        background: 'transparent', border: `1px solid ${T.borderDim}`,
        color: T.purpleDim, fontFamily: T.mono, fontSize: 9,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        borderRadius: 4, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
        marginTop: 6,
    };

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

                        {/* Mall Floor */}
                        <div className="flex-1 px-4 md:px-8 py-6 pb-32">
                            <div className="max-w-7xl mx-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center py-32">
                                        <div className="text-[10px] text-white/30 uppercase tracking-widest animate-pulse">[ LOADING STORES... ]</div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                                        <motion.div
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
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
                                                    className="group cursor-pointer relative flex flex-col rounded-xl overflow-hidden border border-white/5 hover:border-[#ff006e]/30 bg-[#0a0a0a] transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(255,0,110,0.12)] aspect-[3/4]"
                                                >
                                                    <div className="relative flex-1 overflow-hidden bg-black/40">
                                                        {shop.type === 'VIDEO' ? (
                                                            <video src={shop.image} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" autoPlay muted loop playsInline />
                                                        ) : (
                                                            <img src={shop.image} alt={shop.shopName} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" loading="lazy" />
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                                                        {shop.price && (
                                                            <div className="absolute top-2 right-2 text-[10px] font-black text-[#00f0ff] bg-black/80 border border-[#00f0ff]/30 px-2 py-0.5 rounded-md group-hover:border-[#ff006e]/50 group-hover:text-[#ff006e] transition-colors">
                                                                {formatPrice(shop.price)}
                                                            </div>
                                                        )}
                                                        <div className="absolute top-2 left-2 text-[8px] bg-black/70 text-white/50 px-1.5 py-0.5 rounded">
                                                            {getDomain(shop.url)}
                                                        </div>
                                                        <div className="absolute inset-0 bg-[#ff006e]/0 group-hover:bg-[#ff006e]/5 transition-colors duration-300 flex items-center justify-center">
                                                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-[#ff006e] text-black text-[9px] font-black tracking-[0.2em] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                                <Store size={10} />{labels.enterStore}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="px-3 py-2.5 bg-[#0a0a0a] border-t border-white/5">
                                                        <div className="text-[11px] font-bold text-white truncate group-hover:text-[#ff006e] transition-colors leading-tight">{shop.shopName}</div>
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

            {/* ── STORE DETAIL VIEW ── */}
            <AnimatePresence>
                {selectedShop && (
                    <motion.div
                        key="store-detail"
                        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        className="absolute inset-0 flex flex-col overflow-y-auto no-scrollbar z-20"
                        style={{ background: '#000000' }}
                    >
                        <motion.div
                            key={selectedShop.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                            className="flex flex-col md:flex-row min-h-full"
                        >
                            {/* ── LEFT / TOP: Hero image ── */}
                            <div
                                className="relative w-full md:w-[55%] lg:w-[60%] flex-shrink-0"
                                style={{ minHeight: '55vw', maxHeight: '100vh' }}
                            >
                                <div className="absolute inset-0 bg-cover bg-center scale-110"
                                    style={{ backgroundImage: `url(${selectedShop.image})`, filter: 'blur(28px)', opacity: 0.18 }} />

                                {selectedShop.type === 'VIDEO' ? (
                                    <video src={selectedShop.image} className="relative z-10 w-full h-full object-cover md:object-contain" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={selectedShop.image} alt={selectedShop.shopName} className="relative z-10 w-full h-full object-cover md:object-contain" />
                                )}

                                {/* Back button */}
                                <button
                                    onClick={() => setSelectedShop(null)}
                                    style={{
                                        position: 'absolute', top: 16, left: 16, zIndex: 30,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                                        border: `1px solid ${T.border}`,
                                        color: '#e0e0e0', padding: '8px 14px', borderRadius: 6,
                                        fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                                        letterSpacing: '0.14em', textTransform: 'uppercase',
                                        cursor: 'pointer', transition: 'border-color 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = T.pink}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                                >
                                    <ArrowLeft size={13} />
                                    <span className="hidden sm:inline">{labels.backToMall}</span>
                                </button>

                                {/* Prev arrow */}
                                {hasPrev && (
                                    <button onClick={() => setSelectedShop(filteredShops[currentIndex - 1])}
                                        style={{
                                            position: 'absolute', left: 16, bottom: 16, zIndex: 30,
                                            width: 36, height: 36, borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.75)', border: `1px solid ${T.border}`,
                                            color: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.pink; e.currentTarget.style.color = T.pink; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = '#e0e0e0'; }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                )}
                                {/* Next arrow */}
                                {hasNext && (
                                    <button onClick={() => setSelectedShop(filteredShops[currentIndex + 1])}
                                        style={{
                                            position: 'absolute', right: 16, bottom: 16, zIndex: 30,
                                            width: 36, height: 36, borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.75)', border: `1px solid ${T.border}`,
                                            color: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.pink; e.currentTarget.style.color = T.pink; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = '#e0e0e0'; }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                )}

                                {/* Counter */}
                                <div style={{
                                    position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
                                    fontFamily: T.mono, fontSize: 9, color: 'rgba(255,255,255,0.35)',
                                    background: 'rgba(0,0,0,0.65)', padding: '4px 12px', borderRadius: 99,
                                    letterSpacing: '0.1em',
                                }}>
                                    {currentIndex + 1} / {filteredShops.length}
                                </div>
                            </div>

                            {/* ── RIGHT / BOTTOM: Terminal Info Panel ── */}
                            <div style={{
                                display: 'flex', flexDirection: 'column',
                                flex: 1, minWidth: 0,
                                background: T.bg,
                                borderLeft: `1px solid ${T.border}`,
                                fontFamily: T.mono,
                                /* on mobile it flows below the image naturally */
                            }}>

                                {/* Scrollable content area */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }} className="no-scrollbar">

                                    <div style={{ marginBottom: 14 }}>
    <h1 style={{
        color: T.pink, fontSize: 22, fontWeight: 900,
        letterSpacing: '0.06em', lineHeight: 1.1,
        textTransform: 'uppercase', margin: '0 0 4px',
        wordBreak: 'break-word',
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
                                        <span style={{ color: T.fuchsia, fontSize: 28, fontWeight: 900, letterSpacing: '0.04em' }}>
                                            {formatPrice(selectedShop.price)}
                                        </span>
                                        <span style={{ color: T.purpleFaint, fontSize: 9, letterSpacing: '0.2em', fontWeight: 900 }}>
                                            NET_VALUE
                                        </span>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: `1px solid ${T.borderDim}`, margin: '12px 0' }} />

                                    {/* Metadata section */}
                                    <div style={{ color: T.purple, fontSize: 9, letterSpacing: '0.18em', borderBottom: `1px solid ${T.borderDim}`, paddingBottom: 4, marginBottom: 6 }}>
                                        $ fetch node_metadata --verbose
                                    </div>
                                    {[
                                        { label: isEs ? 'VENDEDOR' : 'SELLER',   value: selectedShop.artistName,                          color: T.pink },
                                        { label: 'PLATFORM',                      value: getDomain(selectedShop.url),                      color: T.fuchsia },
                                        { label: 'SYNAPSE_HASH',                  value: `0x${selectedShop.id.replace('api-', '')}`,        color: T.purpleMid },
                                        { label: 'TIMESTAMP',                     value: selectedShop.timestamp,                           color: T.purpleMid },
                                    ].map(row => (
                                        <div key={row.label} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '7px 0', borderBottom: `1px solid ${T.borderFaint}`, fontSize: 10,
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
                                    <div style={{
                                        background: T.bgBox, border: `1px solid ${T.border}`,
                                        borderRadius: 5, padding: '12px 14px',
                                    }}>
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
                                <div style={{
                                    padding: '16px 22px',
                                    borderTop: `1px solid ${T.borderDim}`,
                                    background: T.bgDeep,
                                }}>
                                    <div style={{ color: T.purple, fontSize: 9, letterSpacing: '0.12em', marginBottom: 10 }}>
                                        $ exec open_store --external
                                    </div>

                                    {/* Primary CTA */}
                                    <button
                                        style={btnPrimary}
                                        onClick={() => window.open(selectedShop.url, '_blank')}
                                        onMouseEnter={e => e.currentTarget.style.background = '#ff409f'}
                                        onMouseLeave={e => e.currentTarget.style.background = T.pink}
                                    >
                                        {labels.buyBtn}
                                        <ExternalLink size={13} />
                                    </button>

                                    {/* Secondary row */}
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
                                            <Share2 size={11} />
                                            {labels.shareProduct}
                                        </button>
                                    </div>

                                    {/* Delete (owner only) */}
                                    {isLoggedIn && selectedShop.artistName === `USER_${currentUserId}` && (
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

                        {/* Copy toast */}
                        <AnimatePresence>
                            {showCopyToast && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                                    style={{
                                        position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
                                        zIndex: 50, background: T.pink, color: '#000',
                                        fontFamily: T.mono, fontSize: 9, fontWeight: 900,
                                        letterSpacing: '0.18em', padding: '8px 20px', borderRadius: 99,
                                    }}
                                >
                                    [ LINK_COPIED // SECURED ]
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Keyframe injection */}
                        <style>{`
                            @keyframes termBlink { 50% { opacity: 0; } }
                            @keyframes termPing { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
                        `}</style>
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
                            className="bg-[#060608] border border-white/8 rounded-2xl w-full max-w-2xl relative overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-white/5">
                                <div className="text-sm font-black uppercase tracking-widest text-[#ff006e]">[ {labels.uploadTitle} ]</div>
                                <button onClick={() => setIsModalOpen(false)} className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                <div className="flex flex-col gap-4">
                                    {[
                                        { label: labels.productName, value: title, set: setTitle, placeholder: labels.productNamePlaceholder, required: true },
                                        { label: labels.productPrice, value: price, set: setPrice, placeholder: isEs ? 'Ej. $25.00 o GRATIS' : 'e.g. $25.00 or FREE' },
                                        { label: labels.purchaseLink, value: link, set: setLink, placeholder: labels.purchaseLinkPlaceholder, required: true },
                                    ].map(f => (
                                        <div key={f.label}>
                                            <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1.5">{f.label}</label>
                                            <input
                                                value={f.value} onChange={e => f.set(e.target.value)}
                                                placeholder={f.placeholder} required={f.required}
                                                className="w-full bg-white/[0.04] border border-white/8 focus:border-[#ff006e]/40 px-3 py-2.5 text-xs rounded-xl focus:outline-none transition-colors placeholder:text-white/15"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1.5">{isEs ? 'Descripción' : 'Description'}</label>
                                        <textarea
                                            value={description} onChange={e => setDescription(e.target.value)}
                                            rows={3} placeholder={isEs ? 'Descripción del producto...' : 'Product description...'}
                                            className="w-full bg-white/[0.04] border border-white/8 focus:border-[#ff006e]/40 px-3 py-2.5 text-xs rounded-xl focus:outline-none transition-colors resize-none placeholder:text-white/15"
                                        />
                                    </div>
                                    <button
                                        type="submit" disabled={isUploading}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#ff006e] to-[#ff409f] hover:from-[#ff0080] hover:to-[#ff50af] text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl disabled:opacity-50 transition-all mt-auto"
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