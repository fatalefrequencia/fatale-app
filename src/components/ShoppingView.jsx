import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ExternalLink, Plus, X, Upload, Trash2, Search, Link2, Share2, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const ShoppingView = () => {
    const { language, t } = useLanguage();
    const isEs = language === 'es';

    // Simple & Clean Labels
    const labels = {
        marketplace: isEs ? 'MERCADO' : 'MARKETPLACE',
        subtitle: isEs ? 'TIENDA DE PRODUCTOS DE NUESTROS ARTISTAS' : 'INDEPENDENT ARTIST STORES & MERCH',
        searchPlaceholder: isEs ? 'Buscar productos o artistas...' : 'Search products or artists...',
        uploadTitle: isEs ? 'PUBLICAR NUEVO PRODUCTO' : 'PUBLISH NEW PRODUCT',
        productName: isEs ? 'Nombre del Producto' : 'Product Name',
        productNamePlaceholder: isEs ? 'Ej. Camiseta, Vinilo, Preset Pack' : 'e.g., Logo T-Shirt, Vinyl Record, Presets',
        productPrice: isEs ? 'Precio / Valor' : 'Price / Value',
        purchaseLink: isEs ? 'Enlace de Compra / Tienda' : 'Purchase / Store Link',
        purchaseLinkPlaceholder: isEs ? 'https://tu-tienda.com/producto' : 'https://your-store.com/product',
        visualTeaser: isEs ? 'Portada del Producto' : 'Product Cover Media',
        uploadBtn: isEs ? 'PUBLICAR PRODUCTO EN EL MERCADO' : 'PUBLISH PRODUCT TO MARKETPLACE',
        buyBtn: isEs ? 'IR A LA TIENDA' : 'VISIT STORE',
        copyLink: isEs ? 'COPIAR ENLACE' : 'COPY LINK',
        shareProduct: isEs ? 'COMPARTIR' : 'SHARE',
        deleteBtn: isEs ? 'ELIMINAR PUBLICACIÓN' : 'DELETE LISTING',
        noNodes: isEs ? 'No se encontraron productos' : 'No products found',
        priceLabel: isEs ? 'PRECIO' : 'PRICE',
        activeProducts: isEs ? 'PRODUCTOS ACTIVOS' : 'ACTIVE PRODUCTS',
        allFilter: isEs ? 'Todos' : 'All',
        myFilter: isEs ? 'Mis Productos' : 'My Products',
    };

    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, MY_NODES
    const [copiedId, setCopiedId] = useState(null);

    // Copy notification popup state
    const [showCopyToast, setShowCopyToast] = useState(false);

    // Form state
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [link, setLink] = useState('');
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState(''); 
    const [mediaType, setMediaType] = useState('PHOTO'); // Auto-detected
    const [isUploading, setIsUploading] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = user.id || user.Id;
    const isLoggedIn = !!currentUserId;

    useEffect(() => {
        fetchShops();
    }, []);

    // File preview setup
    useEffect(() => {
        if (!file) {
            setPreviewUrl('');
            return;
        }
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
                const trimmed = str.trim().toLowerCase();
                const checkStr = trimmed.includes('|') ? trimmed.split('|')[0] : trimmed;
                return checkStr.startsWith('http://') || checkStr.startsWith('https://') || checkStr.startsWith('www.');
            };

            const filteredData = response.data.filter(item => isUrl(item.description || item.Description));

            const apiShops = filteredData.map(item => {
                const url = item.url || item.Url || '';
                const desc = item.description || item.Description || '';
                const rawTitle = item.title || item.Title || '';
                const type = item.type || item.Type || 'PHOTO';
                const userId = item.userId || item.UserId || 0;
                
                // Parse Name and Price out of the Title e.g. "Limited Vinyl [$25.00]"
                let parsedName = rawTitle;
                let parsedPrice = null;
                const priceMatch = rawTitle.match(/(.*)\s*\[([^\]]+)\]$/);
                if (priceMatch) {
                    parsedName = priceMatch[1].trim();
                    parsedPrice = priceMatch[2].trim();
                }

                // Parse Link and Description out of the Description column "Link|Product Description"
                let parsedLink = desc;
                let parsedDesc = '';
                if (desc.includes('|')) {
                    const parts = desc.split('|');
                    parsedLink = parts[0].trim();
                    parsedDesc = parts.slice(1).join('|').trim();
                }

                return {
                    id: `api-${item.id || item.Id}`,
                    artistName: `USER_${userId}`,
                    shopName: parsedName,
                    price: parsedPrice,
                    rawTitle: rawTitle,
                    url: parsedLink, 
                    desc: parsedDesc, 
                    image: url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api/', '') || 'http://localhost:5264'}${url}`,
                    type: type,
                    timestamp: new Date().toLocaleDateString()
                };
            });
            
            setShops(apiShops.reverse());
        } catch (error) {
            console.error("Failed to fetch products:", error);
            setShops([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const isVideo = selectedFile.type.startsWith('video/') || 
                            selectedFile.name.endsWith('.mp4') || 
                            selectedFile.name.endsWith('.webm') || 
                            selectedFile.name.endsWith('.mov');
            setMediaType(isVideo ? 'VIDEO' : 'PHOTO');
        } else {
            setFile(null);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !link || !title) {
            alert("Please fill all fields.");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('File', file);
            
            const formattedTitle = price.trim() ? `${title.trim()} [${price.trim()}]` : title.trim();
            formData.append('Title', formattedTitle);
            
            const formattedDesc = description.trim() ? `${link.trim()}|${description.trim()}` : link.trim();
            formData.append('Description', formattedDesc); 
            
            formData.append('Type', mediaType);
            formData.append('IsPosted', 'true');

            await API.Studio.upload(formData);
            
            setFile(null);
            setLink('');
            setTitle('');
            setPrice('');
            setDescription('');
            setIsModalOpen(false);
            fetchShops();
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await API.Studio.delete(id);
            if (selectedShop && selectedShop.id === `api-${id}`) {
                setSelectedShop(null);
            }
            fetchShops();
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete item.");
        }
    };

    const getDomain = (url) => {
        try {
            const hostname = new URL(url).hostname;
            return hostname.replace('www.', '').toUpperCase();
        } catch {
            return 'STORE';
        }
    };

    const handleCopyLink = (shop) => {
        navigator.clipboard.writeText(shop.url);
        setCopiedId(shop.id);
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Clean price formatter to prevent strange raw outputs
    const formatPriceDisplay = (priceStr) => {
        if (!priceStr) return isEs ? 'PROMOCIONAL' : 'PROMOTIONAL';
        const trimmed = priceStr.trim();
        
        // If it already has a currency symbol prefix ($, €, £, etc.)
        if (/^[\$\€\£\¥\₹\w]+\s*\d/.test(trimmed)) {
            return trimmed.toUpperCase();
        }
        
        // If it is numeric (like "25" or "25.00"), automatically prepend the "$" symbol
        if (!isNaN(trimmed) || /^\d+(\.\d+)?$/.test(trimmed)) {
            return `$${trimmed}`;
        }
        
        // Otherwise return in neat uppercase (e.g. "FREE", "GRATIS")
        return trimmed.toUpperCase();
    };

    const filteredShops = shops.filter(shop => {
        const matchesSearch = 
            shop.shopName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            shop.artistName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = 
            activeFilter === 'ALL' ||
            (activeFilter === 'MY_NODES' && shop.artistName === `USER_${currentUserId}`);
        
        return matchesSearch && matchesCategory;
    });

    // Carousel Navigation Helpers
    const currentIndex = selectedShop ? filteredShops.findIndex(s => s.id === selectedShop.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < filteredShops.length - 1;

    const handlePrev = (e) => {
        e.stopPropagation();
        if (hasPrev) {
            setSelectedShop(filteredShops[currentIndex - 1]);
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (hasNext) {
            setSelectedShop(filteredShops[currentIndex + 1]);
        }
    };

    // Keyboard controls for Arrow keys (Addictive navigation flow)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedShop) return;
            if (e.key === 'ArrowLeft' && hasPrev) {
                setSelectedShop(filteredShops[currentIndex - 1]);
            } else if (e.key === 'ArrowRight' && hasNext) {
                setSelectedShop(filteredShops[currentIndex + 1]);
            } else if (e.key === 'Escape') {
                setSelectedShop(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedShop, currentIndex, hasPrev, hasNext, filteredShops]);

    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar bg-black p-6 md:p-8 lg:p-12 relative text-white">
            <div className="max-w-7xl mx-auto space-y-8 pb-32">
                
                {/* Header (Cinematic Cascade) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <ShoppingBag size={20} className="text-[#ff006e] animate-[pulse_2s_infinite]" />
                            <h1 className="text-2xl font-bold tracking-tight uppercase">
                                {labels.marketplace}
                            </h1>
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">
                            {labels.subtitle}
                        </p>
                    </div>

                    <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
                        {labels.activeProducts}: <span className="text-white font-bold">{shops.length}</span>
                    </div>
                </div>

                {/* Sub-Header HUD: Search & Filters (Cascade) */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                    {/* Search Field */}
                    <div className="relative flex-1 max-w-sm">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input 
                            type="text" 
                            placeholder={labels.searchPlaceholder} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/30 p-2 pl-9 text-xs rounded-md focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Filter Categories */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'ALL', label: labels.allFilter },
                            { id: 'MY_NODES', label: labels.myFilter, requireAuth: true }
                        ].map(filter => {
                            if (filter.requireAuth && !isLoggedIn) return null;
                            const active = activeFilter === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${
                                        active 
                                            ? 'bg-white text-black' 
                                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Grid Content */}
                {loading ? (
                    <div className="py-24 text-center text-xs text-white/40 uppercase tracking-widest animate-pulse">
                        Loading...
                    </div>
                ) : filteredShops.length === 0 ? (
                    <div className="py-24 border border-white/5 bg-white/[0.01] text-center rounded-lg space-y-3">
                        <div className="text-sm font-semibold text-white/40">{labels.noNodes}</div>
                        {isLoggedIn && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-md transition-transform hover:scale-[1.02]"
                            >
                                {isEs ? 'Publicar Producto' : 'Post Product'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        
                        {/* Interactive Submit Product Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                            whileHover={{ y: -3, transition: { duration: 0.2 } }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => isLoggedIn ? setIsModalOpen(true) : alert("Please log in first.")}
                            className="border border-dashed border-white/10 flex flex-col items-center justify-center p-8 gap-3 opacity-50 hover:opacity-100 hover:border-white/20 transition-all cursor-pointer bg-white/[0.01] aspect-[4/5] rounded-lg group"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:border-[#ff006e] transition-all duration-300">
                                <Plus size={16} className="group-hover:text-[#ff006e] transition-colors" />
                            </div>
                            <div className="text-center">
                                <div className="text-xs font-bold group-hover:text-[#ff006e] transition-colors">{labels.uploadTitle}</div>
                                <div className="text-[10px] text-white/40 mt-1">
                                    {isLoggedIn ? (isEs ? "Añadir enlace de compra" : "Add external link") : "Login required"}
                                </div>
                            </div>
                        </motion.div>

                        <AnimatePresence>
                            {filteredShops.map((shop, index) => (
                                <motion.div
                                    key={shop.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', stiffness: 100, damping: 15, delay: Math.min(index * 0.03, 0.3) }}
                                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                    className="cursor-pointer group flex flex-col space-y-2.5 inline-block w-full"
                                    onClick={() => setSelectedShop(shop)}
                                >
                                    {/* High-Gloss Sweep Shimmer Card Cover */}
                                    <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 group-hover:border-white/25 shadow-sm rounded-lg transition-colors aspect-[4/5]">
                                        
                                        {/* Sweeping Shimmer light sweep */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent translate-x-[-100%] group-hover:animate-[shimmer_0.8s_ease-out] pointer-events-none z-20" />

                                        {/* Refined Glowing Neon Price Tag - Bold & Larger */}
                                        {shop.price && (
                                            <div className="absolute top-3 right-3 text-[11px] font-mono font-black text-[#00f0ff] bg-black/85 border border-[#00f0ff]/30 px-2.5 py-0.5 rounded-md z-10 transition-colors group-hover:border-[#ff006e]/50 group-hover:text-[#ff006e]">
                                                {formatPriceDisplay(shop.price)}
                                            </div>
                                        )}

                                        {/* Shop Platform Host Domain */}
                                        <div className="absolute top-3 left-3 text-[9px] font-mono bg-black/85 px-2 py-0.5 rounded-md text-white/60 z-10">
                                            {getDomain(shop.url)}
                                        </div>

                                        {/* Media Preview Container */}
                                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                            {shop.type === "VIDEO" ? (
                                                <video 
                                                    src={shop.image} 
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
                                                    autoPlay 
                                                    muted 
                                                    loop
                                                    playsInline
                                                />
                                            ) : (
                                                <img 
                                                    src={shop.image} 
                                                    alt={shop.shopName} 
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
                                                    loading="lazy"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Product Title & Info below card */}
                                    <div className="px-1 flex justify-between items-start">
                                        <div className="space-y-0.5 max-w-[80%]">
                                            <h3 className="text-xs font-semibold text-white group-hover:text-[#ff006e] transition-colors truncate">
                                                {shop.shopName}
                                            </h3>
                                            <p className="text-[10px] text-white/40">
                                                {shop.artistName}
                                            </p>
                                        </div>
                                        <span className="text-[9px] text-white/30">
                                            {shop.timestamp}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Immersive & Premium Product Inspector Modal - Staggered Slide In */}
            <AnimatePresence>
                {selectedShop && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedShop(null)} // Close when clicking outside on backdrop
                        className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-end md:items-center justify-center z-50 md:p-4 cursor-pointer"
                    >
                        {/* Copy Link Toast Notification Popup */}
                        <AnimatePresence>
                            {showCopyToast && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: -45 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute bg-[#ff006e] text-black font-mono text-[9px] font-black tracking-widest px-4 py-2 z-[60] shadow-[0_0_15px_rgba(255,0,110,0.3)] rounded-full"
                                >
                                    [ SYNAPSE_LINK_SECURED // COPIED ]
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Interactive Carousel Pagination Controls (Left / Right Chevrons) */}
                        {hasPrev && (
                            <button 
                                onClick={handlePrev}
                                className="absolute left-3 md:left-12 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/75 border border-white/10 hover:border-[#ff006e]/50 hover:text-[#ff006e] flex items-center justify-center transition-all duration-300 z-[60] group shadow-2xl"
                            >
                                <ChevronLeft size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                        )}

                        {hasNext && (
                            <button 
                                onClick={handleNext}
                                className="absolute right-3 md:right-12 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/75 border border-white/10 hover:border-[#ff006e]/50 hover:text-[#ff006e] flex items-center justify-center transition-all duration-300 z-[60] group shadow-2xl"
                            >
                                <ChevronRight size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                        )}

                        {/* Massive Lookbook Modal Card (Supports Full-Screen mobile viewport) */}
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            transition={{ type: 'spring', stiffness: 100, damping: 16 }}
                            onClick={(e) => e.stopPropagation()} // Stop propagation to prevent accidental close
                            className="bg-[#050507] border border-white/[0.08] w-full h-[100dvh] md:h-auto md:max-w-6xl md:rounded-2xl relative overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] cursor-default no-scrollbar"
                        >
                            {/* Inner Layout Container bound to key selectedShop.id for dynamic slide dissolution */}
                            <motion.div
                                key={selectedShop.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="w-full h-full flex flex-col md:grid md:grid-cols-12 md:gap-8"
                            >
                                {/* Left Column: GIGANTIC Cover Media (Full screen on mobile, 8 cols on desktop) */}
                                <div className="md:col-span-8 flex flex-col justify-center bg-black/40 border-b md:border border-white/5 md:rounded-xl overflow-hidden relative aspect-square w-full">
                                    {/* Soft ambient blur background */}
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none"
                                        style={{ backgroundImage: `url(${selectedShop.image})` }}
                                    />
                                    
                                    {selectedShop.type === "VIDEO" ? (
                                        <video src={selectedShop.image} className="w-full h-full object-cover md:object-contain relative z-10" autoPlay muted loop playsInline />
                                    ) : (
                                        <img src={selectedShop.image} alt={selectedShop.shopName} className="w-full h-full object-cover md:object-contain relative z-10" />
                                    )}
                                </div>

                                {/* Right Column: Mobile Bottom-Sheet Overlay (4 cols on desktop) */}
                                <div className="md:col-span-4 w-full p-6 md:p-0 flex flex-col justify-between space-y-6 md:space-y-0 relative z-10 bg-[#050507] md:bg-transparent rounded-t-2xl md:rounded-none -mt-6 md:mt-0 border-t border-white/[0.08] md:border-none shadow-[0_-15px_30px_rgba(0,0,0,0.8)] md:shadow-none min-h-[380px] md:min-h-0">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <div className="text-[#ff006e] text-[9px] font-mono tracking-[0.18em] uppercase font-black flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-[ping_1.5s_infinite]" />
                                                {labels.activeProducts}
                                            </div>
                                            <h2 className="text-2xl font-black tracking-tight text-white uppercase italic truncate">
                                                {selectedShop.shopName}
                                            </h2>
                                        </div>

                                        {/* Large Luxury Price Block Under Title */}
                                        <div className="flex items-baseline gap-2 pt-1 border-b border-white/5 pb-4">
                                            <span className="text-3xl font-black text-[#00f0ff] font-mono tracking-tight drop-shadow-[0_0_12px_rgba(0,240,255,0.25)]">
                                                {formatPriceDisplay(selectedShop.price)}
                                            </span>
                                            <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest font-black">
                                                {isEs ? 'VALOR NETO' : 'NET VALUE'}
                                            </span>
                                        </div>

                                        {/* Stylized Technical Details Table */}
                                        <div className="space-y-2 font-mono text-[9px] uppercase tracking-widest text-white/50 pt-1">
                                            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                                <span className="text-white/20">{isEs ? "VENDEDOR" : "SELLER"}</span>
                                                <span className="text-white font-bold">{selectedShop.artistName}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                                <span className="text-white/20">{isEs ? "PLATAFAORMA" : "PLATFORM"}</span>
                                                <span className="text-[#00f0ff] font-bold">{getDomain(selectedShop.url)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-white/20">{isEs ? "REGISTRO" : "SYNAPSE_HASH"}</span>
                                                <span className="text-white/70 font-bold truncate max-w-[130px]">{selectedShop.id.replace('api-', '').toUpperCase()}</span>
                                            </div>
                                        </div>

                                        {/* Immersive System Metrics Diagnosis (Fills Empty space beautifully) */}
                                        <div className="border border-white/5 bg-white/[0.01] p-3 rounded-lg space-y-2">
                                            <div className="text-[8px] font-mono text-[#ff006e] uppercase tracking-widest font-black flex items-center justify-between">
                                                <span>[ GATEWAY_CONNECTION // ACTIVE ]</span>
                                                <span className="animate-pulse">● LIVE_FEED</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono uppercase text-white/40">
                                                <div>
                                                    <span className="block text-white/20">ESTABLISHED</span>
                                                    <span className="text-white block font-bold truncate">{selectedShop.timestamp}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-white/20">STATUS</span>
                                                    <span className="text-green-400 block font-bold">SECURED</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Product Description Block */}
                                        {selectedShop.desc && (
                                            <div className="space-y-1.5 pt-1">
                                                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest block">
                                                    {isEs ? "Descripción" : "Description"}
                                                </span>
                                                <p className="text-[11px] text-white/70 bg-white/[0.01] border border-white/5 p-3 rounded-lg leading-relaxed max-h-[90px] overflow-y-auto no-scrollbar">
                                                    {selectedShop.desc}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Gateway CTA Button */}
                                    <div className="space-y-3 pt-3">
                                        <button 
                                            onClick={() => window.open(selectedShop.url, '_blank')}
                                            className="w-full p-4 bg-gradient-to-r from-[#ff006e] to-[#ff409f] hover:from-[#ff0080] hover:to-[#ff50af] text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(255,0,110,0.25)] hover:shadow-[0_0_35px_rgba(255,0,110,0.45)] transition-all duration-300 transform hover:scale-[1.01] rounded-xl flex items-center justify-center gap-2"
                                        >
                                            <span>{labels.buyBtn}</span>
                                            <ExternalLink size={12} />
                                        </button>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button 
                                                onClick={() => handleCopyLink(selectedShop)}
                                                className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Link2 size={12} />
                                                <span>{copiedId === selectedShop.id ? (isEs ? "Copiado" : "Copied") : labels.copyLink}</span>
                                            </button>
                                            
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedShop.url);
                                                    alert(isEs ? `Enlace de tienda copiado:\n${selectedShop.url}` : `Store URL copied:\n${selectedShop.url}`);
                                                }}
                                                className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Share2 size={12} />
                                                <span>{labels.shareProduct}</span>
                                            </button>
                                        </div>
                                        
                                        {isLoggedIn && selectedShop.artistName === `USER_${currentUserId}` && (
                                            <button 
                                                onClick={() => handleDelete(selectedShop.id.replace('api-', ''))}
                                                className="w-full py-2 border border-[#ff006e]/10 text-[#ff006e] hover:bg-[#ff006e]/5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors mt-2"
                                            >
                                                {labels.deleteBtn}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating Close Button */}
                            <button 
                                onClick={() => setSelectedShop(null)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 transition-colors z-30"
                            >
                                <X size={18} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Simple Upload Modal - Split Creator Dashboard */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsModalOpen(false)} // Close upload modal when clicking outside on backdrop
                        className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer"
                    >
                        <motion.div 
                            initial={{ scale: 0.97, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.97, y: 15 }}
                            onClick={(e) => e.stopPropagation()} // Prevent bubbling from form actions closing modal
                            className="bg-[#050507] border border-white/[0.08] p-6 md:p-8 w-full max-w-3xl rounded-2xl relative overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] cursor-default"
                        >
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white p-1.5 bg-white/5 rounded-md transition-colors z-20"
                            >
                                <X size={16} />
                            </button>

                            {/* Left Column: Live Visual Cover Preview Dropzone */}
                            <div className="flex flex-col justify-center items-center w-full">
                                <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.15em] block mb-2 mr-auto">
                                    {labels.visualTeaser}
                                </span>
                                
                                {previewUrl ? (
                                    <div className="w-full aspect-square bg-black/40 border border-white/5 rounded-xl overflow-hidden relative flex items-center justify-center">
                                        {/* Soft ambient blur backdrop */}
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none"
                                            style={{ backgroundImage: `url(${previewUrl})` }}
                                        />
                                        
                                        {mediaType === 'VIDEO' ? (
                                            <video src={previewUrl} className="w-full h-full object-contain relative z-10" autoPlay muted loop />
                                        ) : (
                                            <img src={previewUrl} className="w-full h-full object-contain relative z-10" alt="Preview" />
                                        )}
                                        
                                        {/* Trigger overlay to let them change it */}
                                        <label 
                                            htmlFor="file-upload-change"
                                            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer z-20 rounded-xl"
                                        >
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider border border-white/20 bg-black/80 px-3 py-1.5 rounded-md">
                                                {isEs ? "CAMBIAR ARCHIVO" : "CHANGE FILE"}
                                            </span>
                                        </label>
                                        <input 
                                            type="file"
                                            id="file-upload-change"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*,video/*"
                                        />
                                    </div>
                                ) : (
                                    /* Sleek custom drag drop placeholder zone */
                                    <label 
                                        htmlFor="file-upload"
                                        className="w-full aspect-square border border-dashed border-white/15 hover:border-[#ff006e]/50 hover:bg-white/[0.01] rounded-xl flex flex-col items-center justify-center gap-3.5 transition-all cursor-pointer text-center p-6 group bg-white/[0.005]"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-105 group-hover:border-[#ff006e]/30 transition-all duration-300">
                                            <Upload size={18} className="text-white/30 group-hover:text-[#ff006e]" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
                                                {isEs ? "SELECCIONAR ARCHIVO" : "CHOOSE FILE"}
                                            </span>
                                            <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest leading-normal">
                                                {isEs ? "Imagen o Video" : "Image or Video"}<br />
                                                (MAX 50MB)
                                            </p>
                                        </div>
                                        <input 
                                            type="file"
                                            id="file-upload"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*,video/*"
                                            required
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Right Column: Premium Creator Form Panel */}
                            <form onSubmit={handleUpload} className="flex flex-col justify-between space-y-5 md:space-y-0 h-full relative z-10 pt-2">
                                <div className="space-y-3.5">
                                    <div className="space-y-0.5">
                                        <h2 className="text-base font-bold uppercase tracking-wider">{labels.uploadTitle}</h2>
                                        <p className="text-[8px] font-mono text-white/30 uppercase tracking-widest">{isEs ? "Ingresa la telemetría del producto" : "Enter product specifications"}</p>
                                    </div>

                                    {/* Name Input */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{labels.productName}</label>
                                        <input 
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e]/50 p-2.5 text-xs rounded-lg focus:outline-none transition-colors"
                                            placeholder={labels.productNamePlaceholder}
                                            required
                                        />
                                    </div>

                                    {/* Price Input */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{labels.productPrice}</label>
                                        <div className="relative">
                                            <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00f0ff]" />
                                            <input 
                                                type="text"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e]/50 p-2.5 pl-8 text-xs rounded-lg focus:outline-none transition-colors font-mono"
                                                placeholder="e.g. 15.00 / FREE"
                                            />
                                        </div>
                                    </div>

                                    {/* Link Input */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{labels.purchaseLink}</label>
                                        <input 
                                            type="url"
                                            value={link}
                                            onChange={(e) => setLink(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e]/50 p-2.5 text-xs rounded-lg focus:outline-none transition-colors font-mono"
                                            placeholder={labels.purchaseLinkPlaceholder}
                                            required
                                        />
                                    </div>

                                    {/* Description Input */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{isEs ? "Descripción del Producto" : "Description"}</label>
                                        <textarea 
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e]/50 p-2.5 text-xs rounded-lg focus:outline-none transition-colors resize-none h-16"
                                            placeholder={isEs ? "Ej. Algodón pesado, vinilo edición limitada..." : "e.g. Heavyweight cotton, limited edition wax..."}
                                        />
                                    </div>
                                </div>

                                {/* Submit Actions */}
                                <div className="pt-4">
                                    <button 
                                        type="submit"
                                        disabled={isUploading}
                                        className="w-full p-3.5 bg-gradient-to-r from-[#ff006e] to-[#ff409f] hover:from-[#ff0080] hover:to-[#ff50af] text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-[0_0_15px_rgba(255,0,110,0.2)] hover:shadow-[0_0_25px_rgba(255,0,110,0.4)] disabled:opacity-50 transition-all rounded-xl transform hover:scale-[1.01]"
                                    >
                                        {isUploading ? (isEs ? "PUBLICANDO..." : "PUBLISHING...") : labels.uploadBtn}
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
