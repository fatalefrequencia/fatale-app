import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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

const getSphericalPos = (id, radius = 2.5, offset = 0, name = "") => {
    // Salt the hash with the name to ensure unique placement for shared IDs
    const h = hashStr(id.toString() + name);
    let lat, lon;

    // Deterministic spread using Fibonacci Sphere algorithm
    const samples = 200; 
    const i = h % samples;
    const phi = Math.acos(1 - 2 * (i + 0.5) / samples);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    
    lat = phi - Math.PI / 2;
    lon = theta % (Math.PI * 2);

    const r = radius + offset;
    const x = r * Math.cos(lat) * Math.cos(lon);
    const y = r * Math.sin(lat);
    const z = r * Math.cos(lat) * Math.sin(lon);

    return { pos: [x, y, z], lat, lon };
};

// --- COMPONENTS ---

// 1. COMMUNITY BUILDINGS (High-Density Monoliths)
const CommunityBuilding = ({ id, name, color, memberCount = 0, isActive, isSelected, onClick, cameraDist }) => {
    const meshRef = useRef();
    const { pos, lat, lon } = useMemo(() => getSphericalPos(id, 2.5, 0, name), [id, name]);
    
    // Scale height by population density (memberCount)
    const h = Math.min(0.15 + (memberCount * 0.1), 2.0);

    // Label visibility logic
    const showLabel = cameraDist < 10;
    const labelOpacity = THREE.MathUtils.clamp((10 - cameraDist) / 3, 0, 1);

    return (
        <group position={pos}>
            <mesh 
                ref={meshRef}
                rotation={[0, -lon, lat]} 
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
            >
                <boxGeometry args={[0.06, 0.06, h]} />
                <meshStandardMaterial 
                    color={color} 
                    emissive={color} 
                    emissiveIntensity={isActive ? 3.0 : 0.8} 
                    transparent 
                    opacity={0.85} 
                />
            </mesh>

            {/* Single Selection Pin - Premium Style */}
            {isSelected && (
                <Html position={[0, h/2 + 0.1, 0]} center>
                    <div className="pointer-events-none select-none flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="px-2 py-0.5 bg-black/80 backdrop-blur-md border border-white/20 text-[7px] font-black tracking-[0.2em] text-white uppercase shadow-2xl">
                            {name}
                        </div>
                        <div className="w-[1px] h-4 bg-gradient-to-b from-white to-transparent" />
                    </div>
                </Html>
            )}
        </group>
    );
};

// 2. ARTIST NODES (Discrete Shards)
const ArtistNode = ({ id, name, color, isLive, isSelected, cameraDist, onClick }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const { pos } = useMemo(() => getSphericalPos(id, 2.48, 0.05, name), [id, name]);
    
    // Apple-style LOD Threshholds
    const importance = isLive ? 1.0 : 0.6;
    const isVisible = cameraDist < (12 + importance * 3);
    const opacityFactor = THREE.MathUtils.clamp((14 - cameraDist) / 4, 0, 1) * (isLive ? 1 : 0.9);

    useFrame((state) => {
        if (isSelected) return; // Full stabilization halt

        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.y += 0.012;
        meshRef.current.rotation.z += 0.005;

        // Subtle drift animation
        meshRef.current.position.y += Math.sin(t * 1.5 + hashStr(id)) * 0.0002;

        if (isLive) {
            const pulse = (Math.sin(t * 4) + 1) / 2;
            meshRef.current.scale.setScalar(0.7 + pulse * 0.2);
            if (materialRef.current) {
                materialRef.current.emissiveIntensity = 4.5 + pulse * 8;
            }
        } else {
            meshRef.current.scale.setScalar(isVisible ? 0.6 : 0);
            if (materialRef.current) {
                materialRef.current.emissiveIntensity = 3.0;
            }
        }
    });

    return (
        <group 
            position={pos}
            onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
        >
            <mesh ref={meshRef}>
                <octahedronGeometry args={[0.02, 0]} />
                <meshStandardMaterial 
                    ref={materialRef}
                    color="#fff" 
                    emissive={isLive ? "#00ffff" : (isSelected ? "#fff" : color)} 
                    emissiveIntensity={isSelected ? 10 : 3.5} 
                    transparent
                    opacity={opacityFactor}
                />
            </mesh>

            {/* Selection Visuals */}
            {isSelected && (
                <group>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.04, 0.045, 32]} />
                        <meshBasicMaterial color="#fff" transparent opacity={0.8} />
                    </mesh>
                    <Html position={[0, 0.1, 0]} center>
                        <div className="pointer-events-none select-none flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-1.5 py-0.5 bg-white text-black text-[7px] font-black tracking-widest uppercase shadow-2xl">
                                {name}
                            </div>
                        </div>
                    </Html>
                </group>
            )}
        </group>
    );
};

// 4. SIGNAL BEACONS (For LIVE_SIGNAL_HUB)
const SignalBeacon = ({ pos, color }) => {
    const meshRef = useRef();
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.scale.y = 1 + Math.sin(t * 2) * 0.2;
    });

    return (
        <group position={pos}>
            <mesh ref={meshRef} position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.01, 0.04, 1.0, 8]} />
                <meshStandardMaterial 
                    color={color} 
                    emissive={color} 
                    emissiveIntensity={10} 
                    transparent 
                    opacity={0.3} 
                />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[0.05, 0.1, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} />
            </mesh>
        </group>
    );
};

// 3. TRACK NODES (Neural Signal Sparks)
const TrackNode = ({ id, title, artist, color, isSelected, cameraDist, onClick }) => {
    const meshRef = useRef();
    const { pos } = useMemo(() => getSphericalPos(id, 2.48, 0.12, title), [id, title]);
    
    const opacityFactor = THREE.MathUtils.clamp((9 - cameraDist) / 3, 0, 1);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.position.x += Math.sin(t * 3 + hashStr(id)) * 0.0001;
        meshRef.current.position.z += Math.cos(t * 3 + hashStr(id)) * 0.0001;
    });

    return (
        <group position={pos} onPointerDown={(e) => { e.stopPropagation(); onClick(); }}>
            <mesh ref={meshRef} visible={opacityFactor > 0}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={6} transparent opacity={opacityFactor * 0.8} />
            </mesh>
            {isSelected && (
                <Html position={[0, 0.08, 0]} center>
                    <div className="pointer-events-none select-none px-2 py-0.5 bg-black/90 border-l border-[#00ffff] backdrop-blur-xl animate-in fade-in zoom-in duration-300 shadow-2xl font-mono">
                        <div className="text-[7px] text-[#00ffff] font-black uppercase tracking-widest">{title}</div>
                        <div className="text-[5px] text-white/40 uppercase tracking-widest mt-0.5">{artist}</div>
                    </div>
                </Html>
            )}
        </group>
    );
};

const GlobeCore = ({ 
    activeSector, 
    communities = [], 
    artists = [], 
    stations = [],
    tracks = [],
    selectedId,
    activeView = 'CORE_PULSE',
    onArtistClick,
    onCommunityClick,
    onTrackClick
}) => {
    const groupRef = useRef();
    const [cameraDist, setCameraDist] = React.useState(10);

    useFrame((state) => {
        const dist = state.camera.position.length();
        setCameraDist(dist);

        if (activeSector === null) {
            groupRef.current.rotation.y += 0.0012;
        } else {
            const targetPhi = (activeSector / SECTORS.length) * Math.PI * 2;
            const targetY = -targetPhi + Math.PI / 2;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.04);
        }
    });

    const activeSectorColor = useMemo(() => {
        if (activeSector === null) return null;
        const s = SECTORS.find(sec => sec.id === activeSector);
        if (!s) return null;
        return s.id === 0 ? "#ff33aa" : s.color;
    }, [activeSector]);

    const filteredCommunities = useMemo(() => {
        if (activeView === 'LIVE_SIGNAL_HUB') return [];
        if (activeView === 'FREQ_PEAKS') return communities.filter(c => (c.memberCount || 0) > 1);
        return communities;
    }, [communities, activeView]);

    const filteredArtists = useMemo(() => {
        if (activeView === 'LIVE_SIGNAL_HUB') {
            return artists.filter(a => {
                const live = (a.isLive || a.IsLive) || stations.some(s => 
                    (String(s.artistId || s.ArtistId) === String(a.id || a.Id)) && (s.isLive || s.IsLive)
                );
                return live;
            });
        }
        return artists;
    }, [artists, activeView, stations]);

    const filteredTracks = useMemo(() => {
        if (activeView === 'LIVE_SIGNAL_HUB') return tracks.slice(0, 5);
        if (activeView === 'CLIQUE_VALENCE') return [];
        return tracks;
    }, [tracks, activeView]);

    return (
        <group ref={groupRef}>
            <Sphere args={[2.45, 32, 32]}>
                <meshBasicMaterial color="#000" />
            </Sphere>

            <Sphere args={[2.52, 40, 40]}>
                <meshStandardMaterial 
                    color={activeView === 'CLIQUE_VALENCE' ? "#00ffff" : (activeSectorColor || "#ff006e")} 
                    wireframe 
                    transparent 
                    opacity={activeView === 'CLIQUE_VALENCE' ? 0.2 : (activeSector !== null ? 0.08 : 0.02)} 
                    emissive={activeView === 'CLIQUE_VALENCE' ? "#00ffff" : (activeSectorColor || "#ff006e")}
                    emissiveIntensity={activeView === 'CORE_PULSE' ? 0.5 : 0.1}
                />
            </Sphere>
            <Sphere args={[2.45, 32, 32]}>
                <meshBasicMaterial color="#000" />
            </Sphere>

            <Sphere args={[2.52, 40, 40]}>
                <meshStandardMaterial 
                    color={activeView === 'CLIQUE_VALENCE' ? "#00ffff" : (activeSectorColor || "#ff006e")} 
                    wireframe 
                    transparent 
                    opacity={activeView === 'CLIQUE_VALENCE' ? 0.2 : (activeSector !== null ? 0.08 : 0.02)} 
                    emissive={activeView === 'CLIQUE_VALENCE' ? "#00ffff" : (activeSectorColor || "#ff006e")}
                    emissiveIntensity={activeView === 'CORE_PULSE' ? 0.5 : 0.1}
                />
            </Sphere>

            {/* LIVE_SIGNAL_HUB Beacons */}
            {activeView === 'LIVE_SIGNAL_HUB' && filteredArtists.map(a => (
                <SignalBeacon key={`beacon-${a.id}`} pos={getSphericalPos(a.id, 2.5).pos} color="#00ffff" />
            ))}

            {filteredCommunities.map(c => (
                <CommunityBuilding 
                    key={`comm-${c.id || c.Id}`} 
                    id={c.id || c.Id}
                    name={c.name || c.Name}
                    memberCount={activeView === 'FREQ_PEAKS' ? (c.memberCount || 0) * 3 : (c.memberCount || 0)}
                    color={SECTORS.find(s => s.id === (c.sectorId || c.SectorId || 0))?.color || "#ff006e"}
                    isActive={activeSector === (c.sectorId || c.SectorId)}
                    isSelected={selectedId === `community-${c.id || c.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onCommunityClick?.(c)}
                />
            ))}

            {filteredArtists.map(a => {
                const isLive = (a.isLive || a.IsLive) || stations.some(s => 
                    (s.artistId || s.ArtistId) === (a.id || a.Id) && (s.isLive || s.IsLive)
                );

                return (
                    <ArtistNode 
                        key={`artist-${a.id || a.Id}`} 
                        id={a.id || a.Id}
                        name={a.name || a.Name}
                        color={activeView === 'CLIQUE_VALENCE' ? (a.communityId || a.CommunityId ? "#00ffff" : "#333") : (SECTORS.find(s => s.id === (a.sectorId || a.SectorId || 0))?.color || "#ff006e")}
                        isLive={isLive}
                        isSelected={selectedId === `artist-${a.id || a.Id}`}
                        cameraDist={cameraDist}
                        onClick={() => onArtistClick?.(a)}
                    />
                );
            })}

            {filteredTracks.map(t => (
                <TrackNode 
                    key={`track-${t.id || t.Id}`} 
                    id={t.id || t.Id}
                    title={t.title || t.Title}
                    artist={t.artist || t.Artist}
                    color={activeView === 'LIVE_SIGNAL_HUB' ? "#00ffff" : (SECTORS.find(s => s.id === (t.sectorId || t.SectorId || 0))?.color || "#00ffff")}
                    isSelected={selectedId === `track-${t.id || t.Id}`}
                    cameraDist={cameraDist}
                    onClick={() => onTrackClick?.(t)}
                />
            ))}
        </group>
    );
};

const InteractiveGlobe = ({ 
    activeSector, 
    onSectorClick,
    communities = [], 
    artists = [], 
    stations = [], 
    selectedId, 
    activeView, 
    tracks = [],
    isGlobeSpinning = false,
    onArtistClick, 
    onCommunityClick, 
    onTrackClick,
    onSelectItem
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas 
                dpr={[1, 2]} 
                gl={{ logarithmicDepthBuffer: true, antialias: true }}
                camera={{ position: [0, 0, isMobile ? 12 : 10.5], fov: isMobile ? 30 : 40 }}
            >
                <OrbitControls 
                    enablePan={false} 
                    enableZoom={true} 
                    minDistance={2.8} 
                    maxDistance={25}
                    autoRotate={isGlobeSpinning && !selectedId}
                    autoRotateSpeed={0.5}
                    dampingFactor={0.5} // High damping for immediate stop
                    enableDamping={true}
                    rotateSpeed={selectedId ? 0 : 0.5}
                />
                
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={2.0} color="#ff006e" />
                <pointLight position={[-10, -10, -10]} intensity={1.5} color="#00ffff" />

                <Float 
                    speed={selectedId ? 0 : (activeSector !== null ? 0.2 : 1.0)} 
                    rotationIntensity={selectedId ? 0 : (activeSector !== null ? 0.02 : 0.3)} 
                    floatIntensity={selectedId ? 0 : 0.2}
                >
                    <GlobeCore 
                        activeSector={activeSector}
                        communities={communities}
                        artists={artists}
                        stations={stations}
                        tracks={tracks}
                        selectedId={selectedId}
                        activeView={activeView}
                        onArtistClick={onArtistClick}
                        onCommunityClick={onCommunityClick}
                        onTrackClick={onTrackClick}
                    />
                </Float>

                <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
};

export default InteractiveGlobe;
