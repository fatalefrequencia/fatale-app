import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars, Sphere } from '@react-three/drei';
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

const getSphericalPos = (id, radius = 2.5, offset = 0, parentLatLon = null) => {
    const h = hashStr(id);
    let lat, lon;

    if (parentLatLon) {
        // Cluster around parent: applies a deterministic orbital offset
        const orbitRadius = 0.08 + (h % 5) * 0.02; // Small variation in distance from center
        const orbitAngle = (h % 360) * (Math.PI / 180);
        
        lat = parentLatLon.lat + Math.cos(orbitAngle) * orbitRadius;
        lon = parentLatLon.lon + Math.sin(orbitAngle) * orbitRadius;
    } else {
        // Standard global distribution
        lat = ((h % 120) - 60) * (Math.PI / 180);
        lon = (h % 360) * (Math.PI / 180);
    }

    const r = radius + offset;
    const x = r * Math.cos(lat) * Math.cos(lon);
    const y = r * Math.sin(lat);
    const z = r * Math.cos(lat) * Math.sin(lon);

    return { pos: [x, y, z], lat, lon };
};

// --- COMPONENTS ---

// 1. COMMUNITY BUILDINGS (High-Density Monoliths)
const CommunityBuilding = ({ id, color, memberCount = 0, isActive }) => {
    const meshRef = useRef();
    const { pos, lat, lon } = useMemo(() => getSphericalPos(id, 2.5), [id]);
    
    // Scale height by population density (memberCount)
    // Adjust scaling factor to make them distinct but not intrusive
    const h = Math.min(0.15 + (memberCount * 0.1), 2.0);

    return (
        <mesh 
            position={pos} 
            ref={meshRef}
            rotation={[0, -lon, lat]} 
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
    );
};

// 2. ARTIST NODES (Sleek Shards)
const ArtistNode = ({ id, color, parentLatLon, isLive, cameraDist }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const { pos } = useMemo(() => getSphericalPos(id, 2.5, 0.18, parentLatLon), [id, parentLatLon]);
    
    // Apple-style LOD Threshholds
    const importance = isLive ? 1.0 : 0.6;
    const isVisible = cameraDist < (12 + importance * 3);
    const opacityFactor = THREE.MathUtils.clamp((14 - cameraDist) / 4, 0, 1) * (isLive ? 1 : 0.9);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.y += 0.012;
        meshRef.current.rotation.z += 0.005;

        // Subtle drift animation
        meshRef.current.position.y += Math.sin(t * 1.5 + hashStr(id)) * 0.0002;

        if (isLive) {
            const pulse = (Math.sin(t * 4) + 1) / 2; // 0 to 1 pulse
            meshRef.current.scale.setScalar(1 + pulse * 0.4);
            if (materialRef.current) {
                materialRef.current.emissiveIntensity = 4.5 + pulse * 8;
            }
        } else {
            meshRef.current.scale.setScalar(isVisible ? 1 : 0);
            if (materialRef.current) {
                materialRef.current.emissiveIntensity = 4.5;
            }
        }
    });

    return (
        <group position={pos}>
            <mesh ref={meshRef}>
                <octahedronGeometry args={[0.04, 0]} />
                <meshStandardMaterial 
                    ref={materialRef}
                    color="#fff" 
                    emissive={isLive ? "#00ffff" : color} 
                    emissiveIntensity={4.5} 
                    transparent
                    opacity={opacityFactor}
                />
            </mesh>
            {/* Apple-style "Pin" Glow (Anchor) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <circleGeometry args={[0.02, 16]} />
                <meshBasicMaterial color={color} transparent opacity={opacityFactor * 0.3} />
            </mesh>
        </group>
    );
};

// 3. TRACK NODES (Neural Signal Sparks)
const TrackNode = ({ id, color, cameraDist }) => {
    const meshRef = useRef();
    const { pos } = useMemo(() => getSphericalPos(id, 2.5, 0.12), [id]);
    
    // Tracks only emerge when very close (Apple Maps detail logic)
    const opacityFactor = THREE.MathUtils.clamp((9 - cameraDist) / 3, 0, 1);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        // High frequency jitter for tracks
        meshRef.current.position.x += Math.sin(t * 3 + hashStr(id)) * 0.0001;
        meshRef.current.position.z += Math.cos(t * 3 + hashStr(id)) * 0.0001;
    });

    return (
        <mesh position={pos} ref={meshRef} visible={opacityFactor > 0}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial 
                color={color} 
                emissive={color} 
                emissiveIntensity={6} 
                transparent 
                opacity={opacityFactor * 0.8} 
            />
        </mesh>
    );
};

// StationNode removed - visualization now integrated into ArtistNode

const GlobeCore = ({ 
    activeSector, 
    communities = [], 
    artists = [], 
    stations = [],
    tracks = []
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

    // Diagnostic Group remains for telemetry
    useEffect(() => {
        const buildId = 'GLOBE_CORE_v2.1_APPLE_LOD';
        console.group(`[${buildId}]`);
        console.log('COMMUNITIES:', communities.length);
        console.log('ARTISTS:', artists.length);
        console.log('TRACKS:', tracks.length);
        console.groupEnd();
    }, [communities.length, artists.length, tracks.length]);

    return (
        <group ref={groupRef}>
            {/* Core Surface (Hidden/Dark) */}
            <Sphere args={[2.45, 32, 32]}>
                <meshBasicMaterial color="#000" />
            </Sphere>

            {/* Atmosphere/Grid Overlay */}
            <Sphere args={[2.5, 36, 36]}>
                <meshBasicMaterial 
                    color={activeSectorColor || "#ff006e"} 
                    wireframe 
                    transparent 
                    opacity={activeSector !== null ? 0.08 : 0.02} 
                />
            </Sphere>

            {/* DATA-DRIVEN RENDERERS (Strict Validation) */}
            {communities.filter(c => c && (c.id || c.Id)).map(c => (
                <CommunityBuilding 
                    key={`comm-${c.id || c.Id}`} 
                    id={c.id || c.Id}
                    memberCount={c.memberCount || c.MemberCount || 0}
                    color={SECTORS.find(s => s.id === (c.sectorId || c.SectorId || 0))?.color || "#ff006e"}
                    isActive={activeSector === (c.sectorId || c.SectorId)}
                />
            ))}

            {artists.filter(a => a && (a.id || a.Id)).map(a => {
                const commId = a.communityId || a.CommunityId;
                let parentLatLon = null;
                
                if (commId) {
                    const parent = communities.find(c => String(c.id || c.Id) === String(commId));
                    if (parent) {
                        const parentSpherical = getSphericalPos(parent.id || parent.Id, 2.5);
                        parentLatLon = { lat: parentSpherical.lat, lon: parentSpherical.lon };
                    }
                }

                const isLive = (a.isLive || a.IsLive) || stations.some(s => 
                    (s.artistId || s.ArtistId) === (a.id || a.Id) && (s.isLive || s.IsLive)
                );

                return (
                    <ArtistNode 
                        key={`artist-${a.id || a.Id}`} 
                        id={a.id || a.Id}
                        color={SECTORS.find(s => s.id === (a.sectorId || a.SectorId || 0))?.color || "#ff006e"}
                        parentLatLon={parentLatLon}
                        isLive={isLive}
                        cameraDist={cameraDist}
                    />
                );
            })}

            {tracks.filter(t => t && (t.id || t.Id)).map(t => (
                <TrackNode 
                    key={`track-${t.id || t.Id}`} 
                    id={t.id || t.Id}
                    color={SECTORS.find(s => s.id === (t.sectorId || t.SectorId || 0))?.color || "#00ffff"}
                    cameraDist={cameraDist}
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
    tracks = []
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0, isMobile ? 12 : 10.5], fov: isMobile ? 30 : 40 }}>
                <OrbitControls 
                    enablePan={false} 
                    enableZoom={true} 
                    minDistance={5} 
                    maxDistance={15}
                    autoRotate={false}
                />
                
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={2.0} color="#ff006e" />
                <pointLight position={[-10, -10, -10]} intensity={1.5} color="#00ffff" />

                <Float 
                    speed={activeSector !== null ? 0.2 : 1.0} 
                    rotationIntensity={activeSector !== null ? 0.02 : 0.3} 
                    floatIntensity={0.2}
                >
                    <GlobeCore 
                        activeSector={activeSector}
                        communities={communities}
                        artists={artists}
                        stations={stations}
                        tracks={tracks}
                    />
                </Float>

                <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
};

export default InteractiveGlobe;
