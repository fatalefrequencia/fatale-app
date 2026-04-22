import React, { useRef, useMemo } from 'react';
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

// Unified Spherical Projection
const getSphericalPos = (id, radius = 2.5, offset = 0) => {
    const h = hashStr(id);
    const lat = ((h % 120) - 60) * (Math.PI / 180);
    const lon = (h % 360) * (Math.PI / 180);
    const r = radius + offset;

    const x = r * Math.cos(lat) * Math.cos(lon);
    const y = r * Math.sin(lat);
    const z = r * Math.cos(lat) * Math.sin(lon);

    return { pos: [x, y, z], lat, lon };
};

// --- COMPONENTS ---

// 1. COMMUNITY BUILDINGS (Monoliths)
const CommunityBuilding = ({ id, color, memberCount = 0, isActive }) => {
    const meshRef = useRef();
    const { pos, lat, lon } = useMemo(() => getSphericalPos(id, 2.5), [id]);
    
    // Scale height by population density (memberCount)
    // 0 members = 0.1 height base, max ~1.5 height
    const h = Math.min(0.1 + (memberCount * 0.08), 1.5);

    return (
        <mesh 
            position={pos} 
            ref={meshRef}
            rotation={[0, -lon, lat]} // Rotate to face outward
        >
            <boxGeometry args={[0.08, 0.08, h]} />
            <meshStandardMaterial 
                color={color} 
                emissive={color} 
                emissiveIntensity={isActive ? 2 : 0.5} 
                transparent 
                opacity={0.9} 
            />
        </mesh>
    );
};

// 2. ARTIST NODES (Floating Diamonds)
const ArtistNode = ({ id, color }) => {
    const meshRef = useRef();
    const { pos } = useMemo(() => getSphericalPos(id, 2.5, 0.12), [id]); // Slightly closer to surface

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.y += 0.015;
        meshRef.current.position.y += Math.sin(t * 2 + hashStr(id)) * 0.0005;
    });

    return (
        <mesh position={pos} ref={meshRef}>
            <octahedronGeometry args={[0.04, 0]} />
            <meshStandardMaterial 
                color="#fff" 
                emissive={color} 
                emissiveIntensity={2} 
                transparent
                opacity={0.8}
            />
        </mesh>
    );
};

// 3. LIVE STATION NODES (Blinking Signals)
const StationNode = ({ id }) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const { pos } = useMemo(() => getSphericalPos(id, 2.5, 0.05), [id]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const pulse = Math.abs(Math.sin(t * 4));
        meshRef.current.scale.setScalar(0.8 + pulse * 0.4);
        if (materialRef.current) {
            materialRef.current.emissiveIntensity = 1 + pulse * 4;
        }
    });

    return (
        <mesh position={pos} ref={meshRef}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial 
                ref={materialRef}
                color="#00ffff" 
                emissive="#00ffff" 
                emissiveIntensity={2} 
            />
            <pointLight distance={1} intensity={2} color="#00ffff" />
        </mesh>
    );
};

// 4. SEARCH PINS (Legacy points)
const Pin = ({ position, color }) => {
    const meshRef = useRef();
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.scale.setScalar(1 + Math.sin(t * 10) * 0.2);
    });

    return (
        <mesh position={position} ref={meshRef}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
    );
};

const GlobeCore = ({ 
    activeSector, 
    communities = [], 
    artists = [], 
    stations = [], 
    searchResults = [] 
}) => {
    const groupRef = useRef();

    const activeSectorColor = useMemo(() => {
        if (activeSector === null) return null;
        const s = SECTORS.find(sec => sec.id === activeSector);
        if (!s) return null;
        return s.id === 0 ? "#ff33aa" : s.color;
    }, [activeSector]);

    useFrame((state) => {
        if (activeSector === null) {
            groupRef.current.rotation.y += 0.0015;
        } else {
            const targetPhi = (activeSector / SECTORS.length) * Math.PI * 2;
            const targetY = -targetPhi + Math.PI / 2;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.05);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Inner Core */}
            <Sphere args={[2.45, 32, 32]}>
                <meshBasicMaterial color="#000" transparent opacity={0.6} />
            </Sphere>

            {/* Atmosphere/Grid */}
            <Sphere args={[2.5, 40, 40]}>
                <meshBasicMaterial 
                    color={activeSectorColor || "#ff006e"} 
                    wireframe 
                    transparent 
                    opacity={activeSector !== null ? 0.1 : 0.03} 
                />
            </Sphere>

            {/* REAL DATA NODES */}
            {communities.map(c => (
                <CommunityBuilding 
                    key={c.id} 
                    id={c.id}
                    memberCount={c.memberCount || 0}
                    color={SECTORS.find(s => s.id === (c.sectorId || 0))?.color || "#ff006e"}
                    isActive={activeSector === c.sectorId}
                />
            ))}

            {artists.map(a => (
                <ArtistNode 
                    key={a.id} 
                    id={a.id}
                    color={SECTORS.find(s => s.id === (a.sectorId || 0))?.color || "#ff006e"}
                />
            ))}

            {stations.map(s => (
                <StationNode key={s.id} id={s.id} />
            ))}

            {/* Search result markers */}
            {searchResults.length > 0 && searchResults.slice(0, 10).map((node, i) => {
                const { pos } = getSphericalPos(node.id || i, 2.52);
                return <Pin key={i} position={pos} color="#fff" />;
            })}
        </group>
    );
};

const InteractiveGlobe = ({ 
    activeSector, 
    onSectorClick, 
    communities = [], 
    artists = [], 
    stations = [], 
    searchResults = [] 
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas dpr={[1, 2]}>
                <PerspectiveCamera 
                    makeDefault 
                    position={[0, 0, isMobile ? 12 : 10.5]} 
                    fov={isMobile ? 30 : 40} 
                />
                <OrbitControls 
                    enablePan={false} 
                    enableZoom={true} 
                    minDistance={5} 
                    maxDistance={15}
                    autoRotate={false}
                />
                
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff006e" />
                <pointLight position={[-10, -10, -10]} intensity={1.2} color="#00ffff" />

                <Float 
                    speed={activeSector !== null ? 0.3 : 1.2} 
                    rotationIntensity={activeSector !== null ? 0.05 : 0.4} 
                    floatIntensity={0.3}
                >
                    <GlobeCore 
                        activeSector={activeSector}
                        communities={communities}
                        artists={artists}
                        stations={stations}
                        searchResults={searchResults}
                    />
                </Float>

                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
};

export default InteractiveGlobe;
