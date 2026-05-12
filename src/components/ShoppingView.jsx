import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ExternalLink, ArrowRight, ShoppingCart, Tag, Star, Plus, X, Upload, Trash2 } from 'lucide-react';
import { getMediaUrl } from '../constants';
import API from '../services/api';



const ShoppingView = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [file, setFile] = useState(null);
    const [link, setLink] = useState('');
    const [title, setTitle] = useState('');
    const [mediaType, setMediaType] = useState('PHOTO');
    const [isUploading, setIsUploading] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = user.id || user.Id;
    const isLoggedIn = !!currentUserId;

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        setLoading(true);
        try {
            const response = await API.Studio.getAllPosted();
            console.log("MARKETPLACE_RESPONSE:", response.data);
            const apiShops = response.data.map(item => {
                const url = item.url || item.Url || '';
                const desc = item.description || item.Description || '';
                const title = item.title || item.Title || '';
                const type = item.type || item.Type || 'PHOTO';
                const userId = item.userId || item.UserId || 0;
                
                return {
                    id: `api-${item.id || item.Id}`,
                    artistName: `USER_${userId}`,
                    shopName: title,
                    url: desc, // We use description to store the link
                    image: url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api/', '') || 'http://localhost:5264'}${url}`,
                    desc: "User submitted shop node.",
                    type: type
                };
            });
            
            setShops(apiShops);
        } catch (error) {
            console.error("Failed to fetch shops:", error);
            setShops([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !link || !title) {
            alert("Please fill all fields and select a file.");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('File', file);
            formData.append('Title', title);
            formData.append('Description', link); // Store link in description
            formData.append('Type', mediaType);
            formData.append('IsPosted', 'true');

            await API.Studio.upload(formData);
            
            // Reset form and close modal
            setFile(null);
            setLink('');
            setTitle('');
            setIsModalOpen(false);
            
            // Refresh shops
            fetchShops();
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            await API.Studio.delete(id);
            fetchShops();
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete item.");
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar bg-black p-6 lg:p-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto space-y-12 pb-32"
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#ff006e]/20 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[#ff006e]">
                            <ShoppingBag size={24} className="animate-pulse" />
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic">MARKET_SIGNAL</h1>
                        </div>
                        <p className="text-xs mono text-white/40 tracking-[0.3em] uppercase">Authorized_Merchant_Network // v1.0.4</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] mono text-white/20 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-sm border border-white/5">
                        <Tag size={12} className="text-[#ff006e]" />
                        <span>Active_Vending_Nodes: {shops.length}</span>
                    </div>
                </div>

                {/* Shop Grid - Pinterest Style */}
                <div className="columns-2 md:columns-3 lg:columns-4 gap-6">
                    {/* Upload Card (Only visible or active if logged in) */}
                    <div 
                        onClick={() => isLoggedIn ? setIsModalOpen(true) : alert("Please log in to upload.")}
                        className="border border-dashed border-[#ff006e]/20 flex flex-col items-center justify-center p-6 gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-pointer group break-inside-avoid mb-6 bg-[#0a0a0a]/50 aspect-[3/4]"
                    >
                        <div className="w-10 h-10 rounded-full border border-[#ff006e]/40 flex items-center justify-center group-hover:bg-[#ff006e]/10 transition-all">
                            <Plus size={16} className="text-[#ff006e]" />
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#ff006e]">SUBMIT_STORE</div>
                            <div className="text-[8px] mono mt-1 text-white/40">{isLoggedIn ? "OPEN_FOR_ARTISTS [+]" : "LOGIN_REQUIRED"}</div>
                        </div>
                    </div>

                    {shops.map((shop, idx) => (
                        <motion.div
                            key={shop.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="break-inside-avoid mb-6 cursor-pointer group inline-block w-full"
                            onClick={() => {
                                if (shop.url && shop.url !== "#") {
                                    window.open(shop.url, '_blank');
                                }
                            }}
                        >
                            {/* Image/Video Container */}
                            <div className="relative overflow-hidden bg-[#0a0a0a] border border-white/5 group-hover:border-[#ff006e]/40 transition-all duration-300">
                                {/* Delete Button (Only for owner) */}
                                {isLoggedIn && shop.artistName === `USER_${currentUserId}` && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(shop.id.replace('api-', ''));
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-[#ff006e] hover:bg-[#ff006e] hover:text-white z-10 transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                                {shop.type === "VIDEO" ? (
                                    <video 
                                        src={shop.image} 
                                        className="w-full h-auto object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                        autoPlay 
                                        muted 
                                        loop
                                    />
                                ) : (
                                    <img 
                                        src={shop.image} 
                                        alt={shop.shopName} 
                                        className="w-full h-auto object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                    />
                                )}
                                
                                {/* Hover Overlay for Link Icon */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ExternalLink size={20} className="text-[#ff006e] scale-75 group-hover:scale-100 transition-transform" />
                                </div>
                            </div>

                            {/* Text Info Below (Pinterest Style) */}
                            <div className="mt-2 px-1">
                                <div className="text-[10px] font-black text-white group-hover:text-[#ff006e] transition-colors uppercase truncate tracking-tight">{shop.shopName}</div>
                                <div className="text-[8px] mono text-white/40 uppercase mt-0.5">{shop.artistName}</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Upload Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0a0a0a] border border-[#ff006e]/20 p-6 w-full max-w-md space-y-6 relative">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="flex items-center gap-2 text-[#ff006e]">
                            <Upload size={18} />
                            <h2 className="text-lg font-black uppercase tracking-tighter">SUBMIT_SHOP_NODE</h2>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] mono text-white/40 uppercase">Shop Name</label>
                                <input 
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-3 text-white text-xs mono focus:border-[#ff006e] focus:outline-none"
                                    placeholder="e.g., MY_PERSONAL_SHOP"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] mono text-white/40 uppercase">Redirect Link</label>
                                <input 
                                    type="url"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-3 text-white text-xs mono focus:border-[#ff006e] focus:outline-none"
                                    placeholder="https://..."
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] mono text-white/40 uppercase">Media Type</label>
                                <select 
                                    value={mediaType}
                                    onChange={(e) => setMediaType(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-3 text-white text-xs mono focus:border-[#ff006e] focus:outline-none"
                                >
                                    <option value="PHOTO">IMAGE</option>
                                    <option value="VIDEO">VIDEO</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] mono text-white/40 uppercase">Media File</label>
                                <input 
                                    type="file"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="w-full bg-white/5 border border-white/10 p-3 text-white text-xs mono focus:border-[#ff006e] focus:outline-none"
                                    accept={mediaType === "VIDEO" ? "video/*" : "image/*"}
                                    required
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={isUploading}
                                className="w-full flex items-center justify-center p-4 bg-[#ff006e] text-black font-black uppercase tracking-widest hover:bg-[#ff006e]/80 transition-colors disabled:opacity-50"
                            >
                                {isUploading ? "UPLOADING..." : "ESTABLISH_NODE"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShoppingView;
