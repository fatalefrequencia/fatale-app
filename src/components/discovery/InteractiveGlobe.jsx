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
    
    // Use Math.sin for deterministic but wildly different values for sequential inputs
    const rand1 = (Math.abs(Math.sin(h)) * 10000) % 1;
    const rand2 = (Math.abs(Math.sin(h + 100)) * 10000) % 1;
    
    // theta between 0 and 2*PI
    const theta = rand1 * Math.PI * 2;
    // u between -1 and 1
    const u = rand2 * 2 - 1;
    const phi = Math.acos(u);
    
    const lat = phi - Math.PI / 2;
    const lon = theta;

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
            
            {isSelected && (
                <>
                    <pointLight distance={1.0} intensity={5} color={color} />
                    <Html position={[0, size + 0.05, 0]} center>
                        <div className="pointer-events-none select-none px-2 py-0.5 bg-black/90 border-l backdrop-blur-xl animate-in fade-in zoom-in duration-300 shadow-2xl font-mono" style={{ borderColor: color }}>
                            <div className="text-[7px] font-black uppercase tracking-widest" style={{ color: color }}>{name}</div>
                            {subtitle && (
                                <div className="text-[5px] text-white/40 uppercase tracking-widest mt-0.5">{subtitle}</div>
                            )}
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
};

// ── FATALE_CORE System Node: Always pinned to north pole ──────────────────────
const FataleCoreNode = ({ isSelected, onClick, cameraDist }) => {
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
            <Html position={[0, 0.28, 0]} center>
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

            {isSelected && <pointLight distance={1.5} intensity={8} color={COLOR} />}
        </group>
    );
};

const GlobeCore = memo(({ activeSector, searchQuery, communities = [], artists = [], playlists = [], tracks = [], selectedId, activeView, onArtistClick, onCommunityClick, onTrackClick, isGlobeSpinning }) => {
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
                (t.artist || t.Artist || '').toLowerCase().includes(q)
            );
        }
        return base
            .map(item => ({ item, sortKey: hashStr((item.id || item.Id || '') + seed) }))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(x => x.item)
            .slice(0, 25);
    }, [tracks, seed, searchQuery]);

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
                    id={c.id || c.Id}
                    name={c.name || c.Name}
                    color="#ffaa00"
                    size={0.1}
                    isSelected={selectedId === `community-${c.id || c.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onCommunityClick?.(c)}
                />
            ))}

            {/* Render Artists as Green Spheres (Size increased to 0.08) */}
            {(activeView === 'ARTISTS' || !activeView) && filteredArtists.map(a => (
                <LightPointNode 
                    key={`artist-${a.id || a.Id}`} 
                    id={a.id || a.Id}
                    name={a.name || a.Name}
                    color="#00ffaa"
                    size={0.08}
                    isSelected={selectedId === `artist-${a.id || a.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onArtistClick?.(a)}
                />
            ))}

            {/* Render Tracks as Blue Spheres (Size increased to 0.06) */}
            {(activeView === 'TRACKS' || !activeView) && filteredTracks.map(t => (
                <LightPointNode 
                    key={`track-${t.id || t.Id}`} 
                    id={t.id || t.Id}
                    name={t.title || t.Title}
                    subtitle={t.artist || t.Artist}
                    color="#00aaff"
                    size={0.06}
                    isSelected={selectedId === `track-${t.id || t.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onTrackClick?.(t)}
                />
            ))}

            {/* Render Playlists as Pink Spheres (Size increased to 0.08) */}
            {(activeView === 'PLAYLISTS' || !activeView) && filteredPlaylists.map(p => (
                <LightPointNode 
                    key={`playlist-${p.id || p.Id}`} 
                    id={p.id || p.Id}
                    name={p.name || p.Name}
                    color="#ff006e"
                    size={0.08}
                    isSelected={selectedId === `playlist-${p.id || p.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => {}}
                />
            ))}

            {/* ── FATALE_CORE: Permanent System Node at North Pole ── */}
            <FataleCoreNode
                isSelected={selectedId === 'system-fatale_core'}
                cameraDist={cameraDist}
                onClick={() => onCommunityClick?.({ id: 'fatale_core', name: 'FATALE_CORE', isSystem: true, description: 'The official Fatale system node. Share feedback, bug reports and reviews.' })}
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
    onSelectItem
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    const [initialRotation] = useState(() => [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        0
    ]);
    
    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas 
                dpr={[1, 2]} 
                gl={{ logarithmicDepthBuffer: true, antialias: true }}
            >
                <PerspectiveCamera makeDefault position={[0, 0, isMobile ? 12 : 8.0]} fov={isMobile ? 30 : 40} />
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
