import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldCheck, EyeOff, ArrowLeft, Globe, Network, Trash2 } from 'lucide-react';

export default function PrivacyView({ onBack }) {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen w-full bg-[#020202] text-fatale font-mono p-4 sm:p-8 relative overflow-y-auto tui-crt">
            {/* Scanlines overlay */}
            <div className="tui-scanlines pointer-events-none" />
            <div className="tui-red-crt-overlay pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-16">
                {/* Header/Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-fatale/30 pb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-[#ff003c] drop-shadow-[0_0_8px_#ff003c]">
                            Privacy Policy
                        </h1>
                        <p className="text-[9px] sm:text-xs text-fatale/60 uppercase tracking-[0.25em] mt-1">
                            UGC USER PROTECTION MATRIX // SYSTEM PROTOCOL v1.0
                        </p>
                    </div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="self-start sm:self-center px-4 py-2 border border-fatale/30 bg-fatale/5 hover:bg-fatale hover:text-black transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2"
                        >
                            <ArrowLeft size={14} /> Back to Orbit
                        </button>
                    )}
                </div>

                {/* Subheader Banner */}
                <div className="bg-red-950/20 border border-[#ff003c]/40 p-4 rounded-sm flex items-start gap-4">
                    <ShieldCheck size={20} className="text-[#ff003c] shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#ff003c]">ZERO IDENTIFICATION PROTOCOLS ACTIVE</h4>
                        <p className="text-[9px] text-white/70 uppercase leading-relaxed tracking-wide">
                            YOUR GEOLOCATION AND IP ADDRESS PRIVACY ARE PROTECTED BY MATHEMATICAL PEER-TO-PEER ISOLATION AND Reverse Proxy Shields. YOUR IDENTITY REMAINS SOVEREIGN.
                        </p>
                    </div>
                </div>

                {/* Main Legal Sections */}
                <div className="space-y-6 text-[11px] leading-relaxed uppercase tracking-wider text-white/80">
                    
                    {/* Section 1 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <EyeOff size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 1. ZERO GEOLOCATION & IP BUFFERS</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            FATALE DOES NOT LOG, STORE, OR TRANSMIT ANY GEOLOCATED IP ADDRESS INFORMATION. WE HAVE COMPLETELY DECOUPLED ALL GEOLOCALIZATION MATRIX LAYERS TO PREVENT STALKING, PHYSICAL TRACKING, AND DOCKING THREATS. USER IP PRIVACY IS SAFEGUARDED BY MULTIPLE LAYERS OF ROUTING PROXIES.
                        </p>
                        <p className="text-[9.5px] text-white/60">
                            SERVER-SIDE ACCESS LOGS ARE AUTOMATICALLY ANONYMIZED AND HASHED, REMOVING ALL TIE-INS BETWEEN A PHYSICAL NETWORK LOCATION AND AN ACTIVE ON-SCREEN USER FREQUENCY.
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <Network size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 2. STAGE & AUDIO STREAM TRANSMISSION PROTECTION</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            ALL REAL-TIME BROADCASTS (RADIO STATIONS, AUDIO STREAMS) UTILIZE END-TO-END SYSTEM RELAY CHANNELS. WE STRICTLY DISABLE NATIVE PEER-TO-PEER IP LEAKS. ALL WebRTC TRANSMISSIONS RETAIN A FORCE-RELAY CONFIGURATION SO THEY FLOW EXCLUSIVELY VIA AN INTERMEDIARY TURN SERVER.
                        </p>
                        <p className="text-[9.5px] text-white/60">
                            THERE IS ABSOLUTELY NO METHOD FOR ARBITRARY CLIENT NODES TO DISCOVER YOUR PUBLIC IP ADDRESS THROUGH TURN/STUN BACKWORK HOOKS. SNOOPING PACKETS WILL REVEAL ONLY THE SECURE IP OF THE TRANSIT BUFFER.
                        </p>
                    </div>

                    {/* Section 3 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <Globe size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 3. IMAGE/AUDIO METADATA SCRUBBING</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            ANY MEDIA UPLOADED TO THE FATALE NETWORK (INCLUDES ALBUM ART, SINGLE TRACKS, PROFILE PICTURES, AND POST GRAPHICS) IS AUTOMATICALLY SCRUBBED OF EXIF METADATA TAGS, DEVICE IDENTIFIERS, GPS LAT/LONG VALUES, AND CAMERA STAMPS BEFORE BEING STORED.
                        </p>
                    </div>

                    {/* Section 4 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <Trash2 size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 4. DECENTRALIZED CURATION (BLOCK & MUTE MATRIX)</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            YOU HAVE THE INHERENT RIGHTS OF NODE CURATION. BLOCKING A TARGET USER REMOVES THEIR BROADCAST TRANSMISSIONS, FEED POSTS, REPOSTS, AND DIRECT SIGNALS FROM YOUR HUD SCREEN IMMEDIATELY. THEY ARE SILENTLY DISCONNECTED FROM YOUR FREQUENCY.
                        </p>
                    </div>

                </div>

                {/* System footer */}
                <div className="text-center text-[8px] text-fatale/30 uppercase tracking-[0.2em] pt-8">
                    // FATALE.FM TERMINAL SYSTEM LOGOUT OR PRIVACY VERIFICATION COMPLETED
                </div>
            </div>
        </div>
    );
}
