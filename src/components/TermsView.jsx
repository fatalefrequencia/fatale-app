import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldAlert, BookOpen, ArrowLeft, Key, Coins, Trash2 } from 'lucide-react';

export default function TermsView({ onBack }) {
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
                            Terms of Service
                        </h1>
                        <p className="text-[9px] sm:text-xs text-fatale/60 uppercase tracking-[0.25em] mt-1">
                            System Node End-User License Agreement // EULA v1.0
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
                    <ShieldAlert size={20} className="text-[#ff003c] shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#ff003c]">IMPORTANT NOTICE FOR NODE USERS</h4>
                        <p className="text-[9px] text-white/70 uppercase leading-relaxed tracking-wide">
                            BY CONNECTING TO THE FATALE FREQUENCY AND CREATING A NODE ACCOUNT, YOU AGREE TO BE BOUND BY THIS EULA AND THE CORRESPONDING PRIVACY MATRIX. IF YOU DISAGREE, TERMINATE CONNECTION IMMEDIATELY.
                        </p>
                    </div>
                </div>

                {/* Main Legal Sections */}
                <div className="space-y-6 text-[11px] leading-relaxed uppercase tracking-wider text-white/80">
                    
                    {/* Section 1 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <BookOpen size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 1. MUSIC & CONTENT COPYRIGHT LICENSE</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            YOU RETAIN SOLE AND ABSOLUTE OWNERSHIP OF ALL MUSIC, AUDIO TRACKS, COVER ARTWORK, AND JOURNAL ENTRIES TRANSMITTED FROM YOUR NODE. BY UPLOADING CONTENT, YOU GRANT FATALE A WORLDWIDE, NON-EXCLUSIVE, ROYALTY-FREE LICENSE TO BROADCAST, CONVERT, AND STREAM YOUR FREQUENCY TO PEER NODES WITHIN THE APPLICABLE BOUNDS OF THE SYSTEM.
                        </p>
                        <p className="text-[9.5px] text-white/60">
                            YOU WARRANT THAT YOU OWN OR HAVE SECURED ALL NECESSARY RIGHTS AND LICENSES FOR ANY BROADCAST TRANSMISSION INDEPENDENTLY. COPYRIGHT INFRINGEMENT IS NOT TOLERATED BY SYSTEM PROTOCOLS.
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <Coins size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 2. SYSTEM CREDIT & ECONOMY CORE RULES</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            FATALE UTILIZES SYSTEM CREDITS FOR PEER-TO-PEER TIPPING, SUBSCRIPTIONS, AND TRANSMISSION BANDWIDTH ENHANCEMENT. ALL TRANSACTIONS RECORDED ON THE LEDGER ARE FINAL. CREDITS ARE NON-REFUNDABLE AND ARE BOUND EXCLUSIVELY TO YOUR UNIQUE CRYPTOGRAPHIC NODE ACCOUNT.
                        </p>
                        <p className="text-[9.5px] text-white/60">
                            SYSTEM CREDITS BEAR NO FIAT OR MONETARY INVESTMENT GUARANTEES OUTSIDE OF INTERNAL PLATFORM UTILITY FOR SUPPORTING NODE ARTISTS AND EXCHANGING FREQUENCIES.
                        </p>
                    </div>

                    {/* Section 3 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <Trash2 size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 3. RIGHT TO BE FORGOTTEN (NODE DELETION)</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            YOUR SOVEREIGN RIGHT TO BE FORGOTTEN IS CODIFIED IN THE SYSTEM FIRMWARE. USERS CAN INITIATE A COMPLETE NODE DELETION REQUEST DIRECTLY THROUGH THE SETTINGS INTERFACE. UPON EXECUTION, ALL ACCOUNT CREDENTIALS, PROFILE IMAGES, UPLOADED AUDIO FILES, AND SOCIAL DATA RECORDED IN THE COGNITIVE REPOSITORY WILL BE PERMANENTLY WIPED FROM THE NET origin.
                        </p>
                        <p className="text-[9.5px] text-white/60">
                            HOWEVER, ANY OTHER USER NODE WHO HAS PURCHASED A PERMANENT LICENSE OR OFF-LINE LISTENING RIGHTS TO YOUR TRANSMITTED MEDIA PRIOR TO DELETION RETAINS THE RIGHT TO KEEP, STREAM, AND LISTEN TO THAT DATA IN THEIR LOCAL VAULT. DELETION PREVENTS NEW DISCOVERIES AND REMOVES THE CONTENT FROM GENERAL FEEDS, BUT DOES NOT VOID PREVIOUSLY ACQUIRED PEER LICENSES.
                        </p>
                        <p className="text-[9.5px] text-white/60">
                            THIS OPERATION IS IRREVERSIBLE. DISCONNECTED FREQUENCY NODES CANNOT BE RE-STABILIZED ONCE THE WIPE SEQUENCE IS COMPLETED.
                        </p>
                    </div>

                    {/* Section 4 */}
                    <div className="border border-white/5 bg-white/[0.01] p-5 space-y-3">
                        <div className="flex items-center gap-2.5 text-fatale border-b border-white/5 pb-2">
                            <Key size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">// 4. DECENTRALIZED CURATION AND ACCOUNT SECURITY</h3>
                        </div>
                        <p className="text-[9.5px] text-white/60">
                            FATALE REJECTS CENTRALIZED CONTENT DECONSTRUCTION OR CENSORSHIP. PEERS ARE EMPOWERED WITH LOCAL CURATION UTILITIES (BLOCK & MUTE MATRIX) TO SELECTIVELY FILTER TRANSMISSIONS. YOU ARE SOLELY RESPONSIBLE FOR PROTECTING YOUR CREDENTIALS AND SESSION TOKENS. ALL ACTIONS INITIATED FROM YOUR AUTHENTICATED SYSTEM FREQUENCY WILL BE ATTRIBUTED TO YOUR USER HANDLE.
                        </p>
                    </div>

                </div>

                {/* System footer */}
                <div className="text-center text-[8px] text-fatale/30 uppercase tracking-[0.2em] pt-8">
                    // FATALE.FM TERMINAL SYSTEM LOGOUT OR TERMS VERIFICATION COMPLETED
                </div>
            </div>
        </div>
    );
}
