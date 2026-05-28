import React, { useRef, useMemo, useEffect, useState, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SECTORS } from '../../constants';

// --- UTILS ---
const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

// Uniform distribution on sphere with Sin-based PRNG to break sequential patterns
const getSphericalPos = (id, radius = 2.5, offset = 0) => {
    const h = hashStr(id);
    
    const rand1 = (Math.abs(Math.sin(h * 127.1)) * 10000) % 1;
    const rand2 = (Math.abs(Math.sin(h * 311.7)) * 10000) % 1;
    
    // Full sphere distribution using spherical coordinates
    const lon = rand1 * Math.PI * 2;           // 0 to 2π — full 360°
    const lat = Math.asin(rand2 * 2 - 1);      // -π/2 to π/2 — uniform latitude

    const r = radius + offset;
    const x = r * Math.cos(lat) * Math.cos(lon);
    const y = r * Math.sin(lat);
    const z = r * Math.cos(lat) * Math.sin(lon);

    return { pos: [x, y, z], lat, lon };
};

// Helper to create a radial gradient texture for the glow
const createGlowTexture = (color) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
};

// --- COMPONENTS ---

// Generic Light Point Component (Sphere of Light)
const LightPointNode = ({ id, name, subtitle, color, size = 0.02, isSelected, onClick, cameraDist }) => {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);
    const { pos } = useMemo(() => getSphericalPos(id, 2.48), [id]); // Closer to surface (2.48 instead of 2.5)
    const opacityFactor = THREE.MathUtils.clamp((14 - cameraDist) / 4, 0.5, 1);
    const scaleFactor = THREE.MathUtils.clamp(cameraDist / 6, 0.8, 2);
    
    const glowTexture = useMemo(() => createGlowTexture(color), [color]);

    useEffect(() => {
        if (hovered) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'auto';
        }
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    return (
        <group position={pos}>
            {/* Core Sphere */}
            <mesh 
                scale={[scaleFactor, scaleFactor, scaleFactor]}
                onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={(e) => { setHovered(false); }}
            >
                <sphereGeometry args={[size, 32, 32]} />
                <meshStandardMaterial 
                    color={color} 
                    emissive={color}
                    emissiveIntensity={2}
                    toneMapped={false}
                    transparent 
                    opacity={opacityFactor}
                    roughness={0.1}
                    metalness={0.8}
                />
            </mesh>
            
            {/* Mesh Glow Effect (Flat plane that rotates with the planet) */}
            {glowTexture && (
                <mesh 
                    scale={[size * 12 * scaleFactor, size * 12 * scaleFactor, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)} // Face the center of the globe
                >
                    <planeGeometry />
                    <meshBasicMaterial 
                        map={glowTexture} 
                        transparent={true} 
                        blending={THREE.AdditiveBlending} 
                        opacity={opacityFactor * 0.8}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            )}
            
            {(isSelected || hovered) && (
                <>
                    <pointLight distance={1.2} intensity={6} color={color} />
                    <Html position={[0, size + 0.08, 0]} center zIndexRange={[0, 10]}>
                        <div 
                            className="pointer-events-none select-none px-3 py-1.5 bg-black/95 border border-white/15 rounded backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 shadow-2xl font-mono flex flex-col items-center justify-center relative min-w-[90px]"
                            style={{ 
                                borderColor: `${color}40`,
                                boxShadow: `0 0 20px ${color}35, inset 0 0 10px ${color}20`
                            }}
                        >
                            {/* Holographic Magnifying Scanner Reticle Brackets */}
                            <div 
                                className="absolute -inset-1.5 border border-dashed rounded pointer-events-none opacity-40 animate-[pulse_2s_infinite]" 
                                style={{ borderColor: color }} 
                            />
                            
                            {/* Scanning Scope Corner Brackets */}
                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l" style={{ borderColor: color }} />
                            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r" style={{ borderColor: color }} />
                            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l" style={{ borderColor: color }} />
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r" style={{ borderColor: color }} />

                            {/* Node Metadata */}
                            <div 
                                className="text-[8px] font-black uppercase tracking-widest text-center" 
                                style={{ 
                                    color: color, 
                                    textShadow: `0 0 5px ${color}` 
                                }}
                            >
                                {name}
                            </div>
                            {subtitle && (
                                <div className="text-[5.5px] text-white/50 uppercase tracking-widest mt-1 text-center font-bold">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
};

// ── FATALE_CORE System Node: Always pinned to north pole ──────────────────────
const FataleCoreNode = ({ isSelected, onClick, cameraDist, hideLabel }) => {
    const meshRef = useRef();
    const ringRef = useRef();
    const [hovered, setHovered] = useState(false);
    const COLOR = '#ff0033';
    const GLOW_COLOR = '#ff003380';
    const POS = [0, 2.48, 0]; // North pole surface
    const scaleFactor = THREE.MathUtils.clamp(cameraDist / 6, 0.8, 2);
    const glowTex = useMemo(() => createGlowTexture(COLOR), []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (meshRef.current) {
            // Subtle pulse
            const pulse = 1 + Math.sin(t * 3) * 0.15;
            meshRef.current.scale.setScalar(scaleFactor * pulse);
        }
        if (ringRef.current) {
            ringRef.current.rotation.z += 0.01;
        }
    });

    useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    return (
        <group position={POS}>
            {/* Core sphere */}
            <mesh
                ref={meshRef}
                onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.12, 32, 32]} />
                <meshStandardMaterial
                    color={COLOR}
                    emissive={COLOR}
                    emissiveIntensity={3}
                    toneMapped={false}
                    roughness={0.05}
                    metalness={0.9}
                />
            </mesh>

            {/* Orbit ring */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.22, 0.008, 8, 64]} />
                <meshBasicMaterial color={COLOR} toneMapped={false} transparent opacity={0.6} />
            </mesh>

            {/* Additive glow halo */}
            {glowTex && (
                <mesh
                    scale={[0.12 * 14 * scaleFactor, 0.12 * 14 * scaleFactor, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                >
                    <planeGeometry />
                    <meshBasicMaterial
                        map={glowTex}
                        transparent
                        blending={THREE.AdditiveBlending}
                        opacity={0.9}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            )}

            {/* Always-visible label (not just when selected) */}
            {!hideLabel && (
                <Html position={[0, 0.28, 0]} center zIndexRange={[0, 5]}>
                    <div
                        className="pointer-events-none select-none px-2 py-0.5 backdrop-blur-xl font-mono border-l"
                        style={{
                            background: 'rgba(0,0,0,0.85)',
                            borderColor: COLOR,
                            boxShadow: `0 0 12px ${GLOW_COLOR}`,
                        }}
                    >
                        <div className="text-[7px] font-black uppercase tracking-widest" style={{ color: COLOR, textShadow: `0 0 8px ${COLOR}` }}>
                            FATALE_CORE
                        </div>
                        <div className="text-[5px] text-white/40 uppercase tracking-widest mt-0.5">SYS_NODE // FEEDBACK</div>
                    </div>
                </Html>
            )}

            {isSelected && <pointLight distance={1.5} intensity={8} color={COLOR} />}
        </group>
    );
};


// ── Add this sub-component above ConnectionLines ──────────────────────────────
const CurvedLine = memo(({ from, to, color, opacity }) => {
    const geo = useMemo(() => {
        const f = new THREE.Vector3(...from);
        const t = new THREE.Vector3(...to);
        const mid = new THREE.Vector3().addVectors(f, t).multiplyScalar(0.5);
        const outwardPush = mid.length() < 0.01 ? 1.4 : 2.8 / mid.length();
        mid.multiplyScalar(outwardPush);
        const curve = new THREE.QuadraticBezierCurve3(f, mid, t);
        const points = curve.getPoints(40);
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

    useEffect(() => () => geo.dispose(), [geo]);

    return (
        <line geometry={geo}>
            <lineBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                linewidth={1}
                toneMapped={false}
                depthWrite={false}
            />
        </line>
    );
});

// ── Replace ConnectionLines entirely ─────────────────────────────────────────
const ConnectionLines = ({ artists, tracks, playlists, selectedId, activeView }) => {
    const lines = useMemo(() => {
        const result = [];

        artists.forEach(artist => {
            const artistId      = artist.id     || artist.Id;
            const artistUserId  = artist.userId || artist.UserId || artistId;
            const artistPos     = getSphericalPos(`artist-${artistId}`, 2.48).pos;

            // Artist → Tracks
            if (activeView === 'TRACKS' || !activeView) {
                tracks.forEach(track => {
                    // BUG FIX: also check track.artistId which is set by tracksWithColor
                    const trackRef = track.artistUserId || track.ArtistUserId ||
                                     track.artistId    || track.ArtistId     ||
                                     track.userId      || track.UserId;
                    if (!trackRef) return;

                    const matches =
                        String(trackRef) === String(artistUserId) ||
                        String(trackRef) === String(artistId);

                    if (matches) {
                        const trackPos = getSphericalPos(`track-${track.id || track.Id}`, 2.48).pos;
                        result.push({
                            from: artistPos,
                            to: trackPos,
                            color: '#00ffaa',
                            ownerId: `artist-${artistId}`,
                            targetId: `track-${track.id || track.Id}`,
                        });
                    }
                });
            }

            // Artist → Playlists
            if (activeView === 'PLAYLISTS' || !activeView) {
                playlists.forEach(playlist => {
                    const plRef = playlist.userId    || playlist.UserId   ||
                                  playlist.ownerId   || playlist.OwnerId  ||
                                  playlist.artistUserId || playlist.ArtistUserId;
                    if (!plRef) return;

                    const matches =
                        String(plRef) === String(artistUserId) ||
                        String(plRef) === String(artistId);

                    if (matches) {
                        const plPos = getSphericalPos(`playlist-${playlist.id || playlist.Id}`, 2.48).pos;
                        result.push({
                            from: artistPos,
                            to: plPos,
                            color: '#ff006e',
                            ownerId: `artist-${artistId}`,
                            targetId: `playlist-${playlist.id || playlist.Id}`,
                        });
                    }
                });
            }
        });

        return result;
    }, [artists, tracks, playlists, activeView]);

    return (
        <>
            {lines.map((line, i) => {
                const isConnectedToSelected =
                    selectedId &&
                    (line.ownerId === selectedId || line.targetId === selectedId);
                const dimmed  = selectedId && !isConnectedToSelected;
                const opacity = dimmed ? 0.04 : isConnectedToSelected ? 0.85 : 0.22;

                return (
                    <CurvedLine
                        key={`${line.ownerId}__${line.targetId}`}
                        from={line.from}
                        to={line.to}
                        color={line.color}
                        opacity={opacity}
                    />
                );
            })}
        </>
    );
};


const GlobeCore = memo(({ activeSector, searchQuery, communities = [], artists = [], playlists = [], tracks = [], selectedId, activeView, onArtistClick, onCommunityClick, onTrackClick, onPlaylistClick, isGlobeSpinning }) => {
    const { camera } = useThree();
    const [cameraDist, setCameraDist] = useState(10);
    const [seed] = useState(() => Math.random().toString());
    const atmosphereRef = useRef();
    const innerLightRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        setCameraDist(camera.position.length());
        if (atmosphereRef.current) {
            atmosphereRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.005);
        }
        if (innerLightRef.current) {
            innerLightRef.current.intensity = 1.0 + Math.sin(t * 2) * 0.5;
        }
    });

    const activeSectorColor = useMemo(() => {
        return SECTORS.find(s => s.id === activeSector)?.color;
    }, [activeSector]);

    const filteredCommunities = useMemo(() => {
        let base = activeSector !== null 
            ? communities.filter(c => (c.sectorId || c.SectorId) === activeSector)
            : communities;
        
        // Filter out system node (FATALE_CORE)
        base = base.filter(c => 
            !c.isSystem && 
            !c.IsSystem && 
            c.id !== 4 && 
            c.Id !== 4 && 
            c.name?.toUpperCase() !== 'FATALE_CORE' && 
            c.Name?.toUpperCase() !== 'FATALE_CORE'
        );

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(c => (c.name || c.Name || '').toLowerCase().includes(q));
        }

        return base
            .map(item => ({ item, sortKey: hashStr((item.id || item.Id || '') + seed) }))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(x => x.item)
            .slice(0, 25);
    }, [communities, activeSector, seed, searchQuery]);

    const filteredArtists = useMemo(() => {
        let base = activeSector !== null 
            ? artists.filter(a => (a.sectorId || a.SectorId) === activeSector)
            : artists;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(a => (a.name || a.Name || '').toLowerCase().includes(q));
        }

        return base
            .map(item => ({ item, sortKey: hashStr((item.id || item.Id || '') + seed) }))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(x => x.item)
            .slice(0, 25);
    }, [artists, activeSector, seed, searchQuery]);

    const filteredPlaylists = useMemo(() => {
        let base = playlists;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(p => (p.name || p.Name || '').toLowerCase().includes(q));
        }
        return base
            .map(item => ({ item, sortKey: hashStr((item.id || item.Id || '') + seed) }))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(x => x.item)
            .slice(0, 25);
    }, [playlists, seed, searchQuery]);

    const filteredTracks = useMemo(() => {
        let base = tracks;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(t => 
                (t.title || t.Title || '').toLowerCase().includes(q) || 
                (t.artist || t.Artist || '').toLowerCase().includes(q) ||
                (t.artistName || t.ArtistName || '').toLowerCase().includes(q)
            );
        }
        return base
            .map(item => ({ item, sortKey: hashStr((item.id || item.Id || '') + seed) }))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(x => x.item)
            .slice(0, 25);
    }, [tracks, seed, searchQuery]);

    const totalVisibleNodes = useMemo(() => {
        let count = 0;
        if (activeView === 'COMMUNITIES' || !activeView) count += filteredCommunities.length;
        if (activeView === 'ARTISTS' || !activeView) count += filteredArtists.length;
        if (activeView === 'PLAYLISTS' || !activeView) count += filteredPlaylists.length;
        if (activeView === 'TRACKS' || !activeView) count += filteredTracks.length;
        return count;
    }, [filteredCommunities, filteredArtists, filteredPlaylists, filteredTracks, activeView]);

    const densityMultiplier = useMemo(() => {
        return Math.max(0.4, 1 / (1 + 0.015 * totalVisibleNodes));
    }, [totalVisibleNodes]);

    return (
        <group>
            <pointLight ref={innerLightRef} color={activeSectorColor || "#ff006e"} intensity={1} distance={5} />
            <Sphere args={[2.45, 64, 64]}>
                <meshStandardMaterial color="#0a0a0a" roughness={0.15} metalness={0.9} envMapIntensity={1.5} />
            </Sphere>
            <Sphere args={[2.46, 32, 32]}>
                <meshStandardMaterial color={activeSectorColor || "#ff006e"} transparent opacity={0.05} emissive={activeSectorColor || "#ff006e"} emissiveIntensity={0.5} />
            </Sphere>
            <Sphere args={[2.52, 48, 48]}>
                <meshStandardMaterial color={activeSectorColor || "#ff006e"} wireframe transparent opacity={0.05} emissive={activeSectorColor || "#ff006e"} emissiveIntensity={0.3} />
            </Sphere>
            <Sphere ref={atmosphereRef} args={[2.58, 64, 64]}>
                <meshBasicMaterial color={activeSectorColor || "#ff006e"} transparent opacity={0.1} side={THREE.BackSide} />
            </Sphere>

            {/* Render Communities as Orange Spheres (Size increased to 0.1) */}
            {(activeView === 'COMMUNITIES' || !activeView) && filteredCommunities.map(c => (
                <LightPointNode 
                    key={`comm-${c.id || c.Id}`} 
                    id={`comm-${c.id || c.Id}`}
                    name={c.name || c.Name}
                    color="#ffaa00"
                    size={0.1 * densityMultiplier}
                    isSelected={selectedId === `community-${c.id || c.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onCommunityClick?.(c)}
                />
            ))}

            {/* Render Artists as Green Spheres (Size increased to 0.08) */}
            {(activeView === 'ARTISTS' || !activeView) && filteredArtists.map(a => (
                <LightPointNode 
                    key={`artist-${a.id || a.Id}`} 
                    id={`artist-${a.id || a.Id}`}
                    name={a.name || a.Name}
                    color="#00ffaa"
                    size={0.08 * densityMultiplier}
                    isSelected={selectedId === `artist-${a.id || a.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onArtistClick?.(a)}
                />
            ))}

            {/* Render Tracks as Blue Spheres (Size increased to 0.06) */}
            {(activeView === 'TRACKS' || !activeView) && filteredTracks.map(t => (
                <LightPointNode 
                    key={`track-${t.id || t.Id}`} 
                    id={`track-${t.id || t.Id}`}
                    name={t.title || t.Title}
                    subtitle={t.artist || t.Artist}
                    color="#00aaff"
                    size={0.06 * densityMultiplier}
                    isSelected={selectedId === `track-${t.id || t.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onTrackClick?.(t)}
                />
            ))}

            {/* Render Playlists as Pink Spheres (Size increased to 0.08) */}
            {(activeView === 'PLAYLISTS' || !activeView) && filteredPlaylists.map(p => (
                <LightPointNode 
                    key={`playlist-${p.id || p.Id}`} 
                    id={`playlist-${p.id || p.Id}`}
                    name={p.name || p.Name}
                    color="#ff006e"
                    size={0.08 * densityMultiplier}
                    isSelected={selectedId === `playlist-${p.id || p.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onPlaylistClick?.(p)}
                />
            ))}

            {/* ── FATALE_CORE: Permanent System Node at North Pole ── */}
            <FataleCoreNode
                isSelected={selectedId === 'system-fatale_core'}
                cameraDist={cameraDist}
                hideLabel={!!selectedId}
                onClick={() => onCommunityClick?.({ id: 'fatale_core', name: 'FATALE_CORE', isSystem: true, description: 'The official Fatale system node. Share feedback, bug reports and reviews.' })}
            />

            <ConnectionLines
                artists={filteredArtists}
                tracks={filteredTracks}
                playlists={filteredPlaylists}
                selectedId={selectedId}
                activeView={activeView}
            />
        </group>
    );
});

const InteractiveGlobe = memo(({ 
    activeSector, 
    onSectorClick,
    searchQuery,
    communities = [], 
    artists = [], 
    selectedId, 
    activeView, 
    tracks = [],
    playlists = [],
    isGlobeSpinning = false,
    onArtistClick, 
    onCommunityClick, 
    onTrackClick,
    onPlaylistClick,
    onSelectItem
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    const [initialRotation] = useState(() => [
        0.1, // Subtle aesthetic X-tilt down
        -0.2, // Subtle aesthetic Y-tilt left
        0
    ]);
    
    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas 
                dpr={[1, 2]} 
                gl={{ logarithmicDepthBuffer: true, antialias: true }}
            >
                <PerspectiveCamera makeDefault position={[0, 0, isMobile ? 12.5 : 15.5]} fov={isMobile ? 30 : 40} />
                <fog attach="fog" args={['#000000', 8, 30]} />
                <OrbitControls 
                    enablePan={false} 
                    enableZoom={true} 
                    minDistance={2.8} 
                    maxDistance={25}
                    autoRotate={isGlobeSpinning && !selectedId}
                    autoRotateSpeed={isGlobeSpinning ? 0.5 : 0}
                    dampingFactor={0.1}
                    enableDamping={true}
                    rotateSpeed={0.5}
                />
                
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={3.5} color={SECTORS.find(s => s.id === activeSector)?.color || "#ff006e"} />
                <pointLight position={[-10, -10, -10]} intensity={2.5} color="#00ffff" />
                <spotLight position={[0, 20, 0]} intensity={2} angle={0.5} penumbra={1} color="#ffffff" />

                <Float 
                    speed={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.2 : 1.0) : 0} 
                    rotationIntensity={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.02 : 0.3) : 0} 
                    floatIntensity={isGlobeSpinning && !selectedId ? 0.2 : 0}
                >
                    <group rotation={initialRotation}>
                        <GlobeCore 
                            activeSector={activeSector}
                            searchQuery={searchQuery}
                            communities={communities}
                            artists={artists}
                            playlists={playlists}
                            tracks={tracks}
                            selectedId={selectedId}
                            activeView={activeView}
                            onArtistClick={onArtistClick}
                            onCommunityClick={onCommunityClick}
                            onTrackClick={onTrackClick}
                            onPlaylistClick={onPlaylistClick}
                            isGlobeSpinning={isGlobeSpinning}
                        />
                    </group>
                </Float>

                <Stars radius={150} depth={60} count={1200} factor={6} saturation={0.5} fade speed={isGlobeSpinning ? 0.8 : 0} />
            </Canvas>
        </div>
    );
});

export default InteractiveGlobe;
