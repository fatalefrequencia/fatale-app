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
const SectorContinent = ({ sector, index }) => {
    const meshRef = useRef();
    const count = 12;
    const radius = 2.5;

    // Generate random clusters around a central point for the sector
    const chunks = useMemo(() => {
        const results = [];
        const phi = (index / SECTORS.length) * Math.PI * 2;
        const theta = Math.PI / 3 + (Math.random() * Math.PI / 3);

        for (let i = 0; i < count; i++) {
            const lat = theta + (Math.random() - 0.5) * 0.5;
            const lon = phi + (Math.random() - 0.5) * 0.5;

            const x = radius * Math.sin(lat) * Math.cos(lon);
            const y = radius * Math.cos(lat);
            const z = radius * Math.sin(lat) * Math.sin(lon);
            
            results.push({
                pos: [x, y, z],
                scale: [Math.random() * 0.4 + 0.1, Math.random() * 0.4 + 0.1, 0.05],
                rot: [lat, lon, 0]
            });
        }
        return results;
    }, [index]);

    return (
        <group>
            {chunks.map((c, i) => (
                <mesh key={i} position={c.pos} rotation={c.rot}>
                    <boxGeometry args={c.scale} />
                    <meshStandardMaterial 
                        color={sector.color} 
                        emissive={sector.color} 
                        emissiveIntensity={0.5} 
                        transparent 
                        opacity={0.8} 
                    />
                </mesh>
            ))}
        </group>
    );
};

const GlobeCore = ({ searchQuery, searchResults = [] }) => {
    const groupRef = useRef();

    useFrame((state) => {
        if (!searchQuery) {
            groupRef.current.rotation.y += 0.002;
        }
    });

    // Map search results to spherical coordinates
    const searchPins = useMemo(() => {
        return searchResults.slice(0, 15).map((node, i) => {
            // Deterministic but random-looking positions based on ID
            const id = node.id || node.Id || i;
            const h = hashStr(id);
            const lat = ((h % 180) - 90) * (Math.PI / 180);
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
            {/* The Invisible Core */}
            <Sphere args={[2.45, 32, 32]}>
                <meshBasicMaterial color="#000" transparent opacity={0.8} />
            </Sphere>

            {/* Wireframe Grid */}
            <Sphere args={[2.5, 40, 40]}>
                <meshBasicMaterial color="#ff006e" wireframe transparent opacity={0.08} />
            </Sphere>

            {/* Continents */}
            {SECTORS.map((s, idx) => (
                <SectorContinent key={s.id} sector={s} index={idx} />
            ))}

            {/* Dynamic Search Pins */}
            {searchPins.map((p, i) => (
                <Pin 
                    key={i} 
                    position={p.pos} 
                    color={p.color} 
                    onClick={() => console.log("Pin Click:", p.data)} 
                />
            ))}

            {/* Stationary Decorative Pins */}
            <Pin position={[1.5, 1.5, 1.5]} color="#00ffff" label="NEON_STATION_ALPHA" />
            <Pin position={[-1.8, 0.5, 1.5]} color="#ff006e" label="BASS_LEVEL_Z" />
            <Pin position={[0, -2.2, 1.0]} color="#9b5de5" label="AMBIENT_VOID_9" />
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

const InteractiveGlobe = ({ searchQuery, searchResults, onNodeClick }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas dpr={[1, 2]}>
                <PerspectiveCamera 
                    makeDefault 
                    position={[0, 0, isMobile ? 12 : 8]} 
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

                <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
                    <GlobeCore searchQuery={searchQuery} searchResults={searchResults} />
                </Float>

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
            
        </div>
    );
};

export default InteractiveGlobe;
