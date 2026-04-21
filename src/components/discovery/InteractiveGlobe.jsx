import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { SECTORS } from '../../constants';

const Pin = ({ position, color, label, onClick }) => {
    const meshRef = useRef();
    
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.scale.setScalar(1 + Math.sin(t * 10) * 0.2);
    });

    return (
        <mesh position={position} ref={meshRef} onClick={onClick}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={color} toneMapped={false} />
            <pointLight distance={1} intensity={2} color={color} />
        </mesh>
    );
};

// Mock "Makeshift Continents" using sectors
const SectorContinent = ({ sector, index, isActive, onClick, isHidden }) => {
    const meshRef = useRef();
    const count = 12;
    const radius = 2.5;

    // Generate random clusters around a central point for the sector
    const chunks = useMemo(() => {
        const results = [];
        // Spread phi (longitude) more aggressively
        const phiBase = (index / SECTORS.length) * Math.PI * 2;
        const phi = phiBase + (index % 2 === 0 ? 0.3 : -0.3);
        
        // Wider Theta (latitude) spread
        const thetaOffsets = [0.5, 1.6, 0.8, 2.2, 1.1, 1.8];
        const theta = thetaOffsets[index % thetaOffsets.length];

        for (let i = 0; i < count; i++) {
            const lat = theta + (Math.random() - 0.5) * 0.5;
            const lon = phi + (Math.random() - 0.5) * 0.5;

            const x = radius * Math.sin(lat) * Math.cos(lon);
            const y = radius * Math.cos(lat);
            const z = radius * Math.sin(lat) * Math.sin(lon);
            
            results.push({
                pos: [x, y, z],
                scale: [Math.random() * 0.4 + 0.1, Math.random() * 0.4 + 0.1, 0.05],
                rot: [lat, lon, 0],
            });
        }
        return results;
    }, [index]);

    if (isHidden) return null;

    return (
        <group onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {chunks.map((c, i) => (
                <mesh key={i} position={c.pos} rotation={c.rot}>
                    <boxGeometry args={c.scale} />
                    <meshStandardMaterial 
                        color={isActive && index === 0 ? "#ff33aa" : sector.color} 
                        emissive={isActive && index === 0 ? "#ff33aa" : sector.color} 
                        emissiveIntensity={isActive ? 2 : 0.4} 
                        transparent 
                        opacity={isActive ? 1 : 0.6} 
                    />
                </mesh>
            ))}
        </group>
    );
};

const GlobeCore = ({ searchQuery, searchResults = [], activeSector, onSectorClick }) => {
    const groupRef = useRef();

    const activeSectorColor = useMemo(() => {
        if (activeSector === null) return null;
        const s = SECTORS.find(sec => sec.id === activeSector);
        if (!s) return null;
        if (s.id === 0) return "#ff33aa"; 
        return s.color;
    }, [activeSector]);

    useFrame((state) => {
        if (!searchQuery && activeSector === null) {
            groupRef.current.rotation.y += 0.002;
        }

        if (activeSector !== null) {
            const targetPhi = (activeSector / SECTORS.length) * Math.PI * 2;
            const targetY = -targetPhi + Math.PI / 2;
            const currentY = groupRef.current.rotation.y;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(currentY, targetY, 0.08);
        }
    });

    const searchPins = useMemo(() => {
        return searchResults.slice(0, 15).map((node, i) => {
            const id = node.id || node.Id || i;
            const h = hashStr(id);
            const lat = ((h % 120) - 60) * (Math.PI / 180);
            const lon = (h % 360) * (Math.PI / 180);
            const radius = 2.52;

            const x = radius * Math.cos(lat) * Math.cos(lon);
            const y = radius * Math.sin(lat);
            const z = radius * Math.cos(lat) * Math.sin(lon);

            return { pos: [x, y, z], data: node, color: '#ffffff' };
        });
    }, [searchResults]);

    return (
        <group ref={groupRef}>
            <Sphere args={[2.45, 32, 32]}>
                <meshBasicMaterial color="#000" transparent opacity={0.6} />
            </Sphere>

            <Sphere args={[2.5, 40, 40]}>
                <meshBasicMaterial 
                    color={activeSectorColor || "#ff006e"} 
                    wireframe 
                    transparent 
                    opacity={activeSector !== null ? 0.15 : 0.05} 
                    transition="color 0.5s ease"
                />
            </Sphere>

            {SECTORS.map((s, idx) => (
                <SectorContinent 
                    key={s.id} 
                    sector={s} 
                    index={idx} 
                    isActive={activeSector === s.id}
                    isHidden={activeSector !== null && activeSector !== s.id}
                    onClick={() => onSectorClick(s.id)}
                />
            ))}

            {searchPins.map((p, i) => (
                <Pin key={i} position={p.pos} color={activeSectorColor || p.color} />
            ))}
        </group>
    );
};

// Simple hash for positioning
const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

const InteractiveGlobe = ({ searchQuery, searchResults, activeSector, onSectorClick }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas dpr={[1, 2]}>
                <PerspectiveCamera 
                    makeDefault 
                    position={[0, 0, isMobile ? 12 : 11]} 
                    fov={isMobile ? 30 : 40} 
                />
                <OrbitControls 
                    enablePan={false} 
                    enableZoom={true} 
                    minDistance={5} 
                    maxDistance={15}
                    autoRotate={false}
                    rotateSpeed={isMobile ? 1.2 : 0.8}
                />
                
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff006e" />
                <pointLight position={[-10, -10, -10]} intensity={1.5} color="#00ffff" />

                <Float 
                    speed={activeSector !== null ? 0.5 : 1.5} 
                    rotationIntensity={activeSector !== null ? 0.1 : 0.5} 
                    floatIntensity={activeSector !== null ? 0.1 : 0.5}
                >
                    <GlobeCore 
                        searchQuery={searchQuery} 
                        searchResults={searchResults} 
                        activeSector={activeSector}
                        onSectorClick={onSectorClick}
                    />
                </Float>

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
};

export default InteractiveGlobe;
