import React, { useRef, useMemo, useEffect, useState, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SECTORS } from '../../constants';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GLOBE_R  = 2.45;   // base radius for core
const NODE_R   = 2.51;   // nodes sit just above wireframe

// ─── UTILS ────────────────────────────────────────────────────────────────────

const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

const resolveColorToHex = (color) => {
    if (color && color.includes('var(')) {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (color.includes('--theme-primary')) return user?.themeColor || user?.ThemeColor || 'rgb(var(--theme-primary-rgb))';
            if (color.includes('--theme-secondary')) return user?.secondaryColor || user?.SecondaryColor || '#00ffff';
        } catch(e) {}
        return 'rgb(var(--theme-primary-rgb))';
    }
    return color;
};

const createGlowTexture = (rawColor) => {
    if (typeof document === 'undefined') return null;
    const color = resolveColorToHex(rawColor);
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g   = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0,    color);
    g.addColorStop(0.15, color);
    g.addColorStop(0.40, color + '77');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
};

// ─── SHARP NONCONVEX POLYHEDRON DEFORMATION ───────────────────────────────────
// Calculates radius at a given coordinate. Slower base speed for organic movement.
const getNonconvexRadius = (nx, ny, nz, time, isSelected) => {
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
    const x = nx / len;
    const y = ny / len;
    const z = nz / len;

    // Stellation harmonics
    const starArmCount = 4.0;
    const basePeak = Math.sin(x * starArmCount) * Math.sin(y * starArmCount) * Math.sin(z * starArmCount);
    
    // Slower pace of expansion and contraction (isSelected: 0.8, normal: 0.25)
    const pulseSpeed = isSelected ? 0.8 : 0.25;
    const pulseAmp = isSelected ? 0.28 : 0.14;
    const wave = Math.sin(time * pulseSpeed + x * 3.5 + y * 3.5) * pulseAmp;
    
    // fractional power (0.5) sharpens peaks into pointy tips
    const starVal = Math.pow(Math.abs(basePeak), 0.5) * Math.sign(basePeak);
    
    return GLOBE_R * (1.0 + 0.35 * starVal + wave);
};

// Calculate visibility threshold based on radius:
// Items sink into core (r < 2.30) and disappear, and fade in as they expand out to peaks (r > 2.65).
const getVertexVisibility = (r) => {
    return THREE.MathUtils.clamp((r - 2.30) / 0.35, 0, 1);
};

// ─── SHIMMER LINE ─────────────────────────────────────────────────────────────

const ShimmerLine = memo(({ fromDir, toDir, color, phaseOffset = 0, isSelected = false, isRelated = false, isGlobeSpinning }) => {
    const lineRef = useRef();
    const opRef   = useRef(0);
    const accumulatedTimeRef = useRef(0);

    const geo = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(31 * 3), 3));
        return g;
    }, []);

    useEffect(() => () => geo.dispose(), [geo]);
    useEffect(() => { opRef.current = 0; }, []);

    useFrame(({ clock }, delta) => {
        if (!lineRef.current) return;
        
        // Stop time progression if expansion/contraction is paused
        if (isGlobeSpinning) {
            accumulatedTimeRef.current += delta;
        }
        const time = accumulatedTimeRef.current;

        const rFrom = getNonconvexRadius(fromDir.x, fromDir.y, fromDir.z, time, isSelected);
        const rTo = getNonconvexRadius(toDir.x, toDir.y, toDir.z, time, isSelected);

        // Hide connection if endpoints are contracted
        const visibility = isSelected ? 1.0 : Math.min(getVertexVisibility(rFrom), getVertexVisibility(rTo));
        lineRef.current.visible = visibility > 0.01;

        if (visibility <= 0.01) return;

        const pFrom = fromDir.clone().multiplyScalar(rFrom + 0.05);
        const pTo = toDir.clone().multiplyScalar(rTo + 0.05);

        const mid = new THREE.Vector3().addVectors(pFrom, pTo).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(Math.max(rFrom, rTo) * 1.15);

        const curve = new THREE.QuadraticBezierCurve3(pFrom, mid, pTo);
        const points = curve.getPoints(30);

        const posAttr = lineRef.current.geometry.attributes.position;
        for (let i = 0; i < points.length; i++) {
            posAttr.setXYZ(i, points[i].x, points[i].y, points[i].z);
        }
        posAttr.needsUpdate = true;

        if (isSelected) {
            opRef.current = Math.min(opRef.current + 0.05, 1);
            lineRef.current.material.opacity = 0.95;
        } else if (isRelated) {
            opRef.current = Math.min(opRef.current + 0.04, 1);
            lineRef.current.material.opacity = 0.70 * visibility;
        } else {
            opRef.current = Math.min(opRef.current + 0.025, 1);
            lineRef.current.material.opacity = opRef.current * (0.28 + Math.sin(time * 0.6 + phaseOffset) * 0.15) * visibility;
        }
    });

    return (
        <line ref={lineRef} geometry={geo}>
            <lineBasicMaterial color={color} transparent opacity={0} linewidth={1} toneMapped={false} depthWrite={false} />
        </line>
    );
});

// ─── NETWORK VISUALIZATION ────────────────────────────────────────────────────

const NetworkVisualization = ({ nodes, selectedId, isGlobeSpinning }) => {
    const connections = useMemo(() => {
        const result = [];
        const artists = nodes.filter(n => n.typeClass === 'artist');
        
        artists.forEach(artist => {
            const artistId = artist.id || artist.Id;
            const artistUniqueId = artist.nodeUniqueId;
            
            const relatedTracks = nodes.filter(n => 
                n.typeClass === 'track' && 
                (String(n.artistId || n.ArtistId) === String(artistId) || String(n.artistUserId || n.ArtistUserId) === String(artist.userId || artist.UserId))
            );
            
            const relatedPlaylists = nodes.filter(n => 
                n.typeClass === 'playlist' && 
                String(n.artistId || n.ArtistId) === String(artistId)
            );
            
            relatedTracks.forEach(track => {
                const seed = hashStr(artistUniqueId + track.nodeUniqueId);
                result.push({
                    fromDir: artist.direction,
                    toDir: track.direction,
                    color: '#00d4ff',
                    ownerId: artistUniqueId,
                    targetId: track.nodeUniqueId,
                    phase: (seed % 1000) / 1000 * Math.PI * 2
                });
            });
            
            relatedPlaylists.forEach(playlist => {
                const seed = hashStr(artistUniqueId + playlist.nodeUniqueId);
                result.push({
                    fromDir: artist.direction,
                    toDir: playlist.direction,
                    color: '#ff3d7f',
                    ownerId: artistUniqueId,
                    targetId: playlist.nodeUniqueId,
                    phase: (seed % 1000) / 1000 * Math.PI * 2
                });
            });
        });
        
        return result;
    }, [nodes]);

    return (
        <group>
            {connections.map((c) => (
                <ShimmerLine
                    key={`arc-${c.ownerId}-${c.targetId}`}
                    fromDir={c.fromDir} toDir={c.toDir} color={c.color} phaseOffset={c.phase}
                    isSelected={selectedId && c.ownerId === selectedId && c.targetId === selectedId}
                    isRelated={selectedId && (c.ownerId === selectedId || c.targetId === selectedId)}
                    isGlobeSpinning={isGlobeSpinning}
                />
            ))}
        </group>
    );
};

// ─── DYNAMIC VERTEX LIGHT NODE ────────────────────────────────────────────────

const LightPointNode = ({ direction, name, subtitle, color: rawColor, size = 0.02, isSelected, onClick, cameraDist, isGlobeSpinning }) => {
    const color = useMemo(() => resolveColorToHex(rawColor), [rawColor]);
    const billRef  = useRef();
    const ringRef  = useRef();
    const groupRef = useRef();
    const [hovered, setHovered] = useState(false);
    const accumulatedTimeRef = useRef(0);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const baseScale = THREE.MathUtils.clamp(cameraDist / 8, 0.55, 1.8);
    const glowTex   = useMemo(() => createGlowTexture(color), [color]);

    useFrame(({ camera, clock }, delta) => {
        if (!groupRef.current) return;
        
        // Stop time progression if expansion/contraction is paused
        if (isGlobeSpinning) {
            accumulatedTimeRef.current += delta;
        }
        const time = accumulatedTimeRef.current;

        const r = getNonconvexRadius(direction.x, direction.y, direction.z, time, isSelected);
        const pos = direction.clone().multiplyScalar(r + 0.05);

        // Hide node when it sinks into the core
        const visibility = isSelected ? 1.0 : getVertexVisibility(r);
        groupRef.current.visible = visibility > 0.01;

        if (visibility <= 0.01) return;

        groupRef.current.position.copy(pos);

        if (billRef.current) {
            billRef.current.quaternion.copy(camera.quaternion);
            const pulse = isSelected ? 1 + Math.sin(time * 5) * 0.15 : 1;
            billRef.current.scale.setScalar(baseScale * pulse);
            
            // Fade in elements based on visibility
            billRef.current.traverse((child) => {
                if (child.material) {
                    child.material.opacity = (child.material.map ? (isSelected ? 0.7 : hovered ? 0.55 : 0.30) : (isSelected ? 1.0 : hovered ? 0.95 : 0.92)) * visibility;
                }
            });
        }
        if (ringRef.current) ringRef.current.rotation.z += isSelected ? 0.018 : 0.004;
    });

    useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    const DOT  = size * 0.9;
    const RING = size * 1.9;
    const GLOW = size * (isSelected ? 9 : hovered ? 7 : 4.5);
    const RO   = 10;

    return (
        <group ref={groupRef}>
            <mesh
                onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[size * 6, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <group ref={billRef}>
                {glowTex && (
                    <mesh renderOrder={RO}>
                        <planeGeometry args={[GLOW * 2, GLOW * 2]} />
                        <meshBasicMaterial map={glowTex} transparent blending={THREE.AdditiveBlending}
                            opacity={0.30}
                            side={THREE.DoubleSide} depthWrite={false} depthTest={false} toneMapped={false} />
                    </mesh>
                )}
                <mesh renderOrder={RO + 1}>
                    <circleGeometry args={[DOT, 32]} />
                    <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending}
                        opacity={0.92}
                        depthWrite={false} depthTest={false} toneMapped={false} />
                </mesh>
                <mesh ref={ringRef} renderOrder={RO + 1}>
                    <ringGeometry args={[RING * 0.85, RING, 48]} />
                    <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending}
                        opacity={0.20}
                        depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
                </mesh>
                {isSelected && (
                    <mesh renderOrder={RO + 1}>
                        <ringGeometry args={[RING * 1.6, RING * 1.72, 48]} />
                        <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending}
                            opacity={0.35} depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                )}
            </group>

            {(isSelected || hovered) && (
                <>
                    <pointLight distance={0.9} intensity={isSelected ? 5 : 3} color={color} />
                    <Html position={[0, DOT + 0.12, 0]} center zIndexRange={[0, 10]} style={{ pointerEvents: 'none' }}>
                        <div
                            onClick={!isMobile ? (e) => { e.stopPropagation(); onClick(); } : undefined}
                            className={isMobile ? 'pointer-events-none select-none' : 'select-none'}
                            style={{
                                cursor: !isMobile ? 'pointer' : 'default',
                                pointerEvents: !isMobile ? 'auto' : 'none',
                                background: 'rgba(0,0,0,0.92)',
                                border: `1px solid ${color}44`,
                                borderLeft: `2px solid ${color}`,
                                padding: '3px 8px',
                                backdropFilter: 'blur(12px)',
                                boxShadow: `0 0 14px ${color}20`,
                                minWidth: '70px',
                                textAlign: 'left',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <div style={{ color, fontSize: '7px', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: `0 0 6px ${color}99` }}>{name}</div>
                            {subtitle && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '6px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '1px' }}>{subtitle}</div>}
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
};

// ─── FATALE CORE NODE ─────────────────────────────────────────────────────────

const FataleCoreNode = ({ isSelected, onClick, cameraDist, hideLabel, isGlobeSpinning }) => {
    const billRef  = useRef();
    const ring1Ref = useRef();
    const ring2Ref = useRef();
    const groupRef = useRef();
    const [hovered, setHovered] = useState(false);
    const COLOR     = '#ff0033';
    const POS_DIR   = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    const baseScale = THREE.MathUtils.clamp(cameraDist / 8, 0.55, 1.8);
    const glowTex   = useMemo(() => createGlowTexture(COLOR), []);
    const isMobile  = typeof window !== 'undefined' && window.innerWidth < 1024;
    const RO        = 10;
    const accumulatedTimeRef = useRef(0);

    useFrame(({ camera, clock }, delta) => {
        if (isGlobeSpinning) {
            accumulatedTimeRef.current += delta;
        }
        const time = accumulatedTimeRef.current;

        const r = getNonconvexRadius(POS_DIR.x, POS_DIR.y, POS_DIR.z, time, isSelected);
        const pos = POS_DIR.clone().multiplyScalar(r + 0.05);
        if (groupRef.current) groupRef.current.position.copy(pos);

        if (billRef.current) {
            billRef.current.quaternion.copy(camera.quaternion);
            billRef.current.scale.setScalar(baseScale * (1 + Math.sin(time * 3.5) * 0.12));
        }
        if (ring1Ref.current) ring1Ref.current.rotation.z += 0.010;
        if (ring2Ref.current) ring2Ref.current.rotation.z -= 0.006;
    });

    useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);

    const DOT = 0.075; const R1 = 0.135; const R2 = 0.185; const GLOW = 0.38;

    return (
        <group ref={groupRef}>
            <mesh onPointerDown={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)}>
                <sphereGeometry args={[0.28, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <group ref={billRef}>
                {glowTex && (
                    <mesh renderOrder={RO}>
                        <planeGeometry args={[GLOW * 2, GLOW * 2]} />
                        <meshBasicMaterial map={glowTex} transparent blending={THREE.AdditiveBlending} opacity={0.78} side={THREE.DoubleSide} depthWrite={false} depthTest={false} toneMapped={false} />
                    </mesh>
                )}
                <mesh renderOrder={RO + 1}>
                    <circleGeometry args={[DOT, 48]} />
                    <meshBasicMaterial color={COLOR} transparent opacity={0.95} depthWrite={false} depthTest={false} toneMapped={false} blending={THREE.AdditiveBlending} />
                </mesh>
                <mesh ref={ring1Ref} renderOrder={RO + 1}>
                    <ringGeometry args={[R1 * 0.88, R1, 64]} />
                    <meshBasicMaterial color={COLOR} transparent opacity={0.62} depthWrite={false} depthTest={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
                </mesh>
                <mesh ref={ring2Ref} renderOrder={RO + 1}>
                    <ringGeometry args={[R2 * 0.92, R2, 64]} />
                    <meshBasicMaterial color={COLOR} transparent opacity={0.30} depthWrite={false} depthTest={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
                </mesh>
            </group>
            {isSelected && <pointLight distance={1.5} intensity={8} color={COLOR} />}
        </group>
    );
};

// ─── NONCONVEX POLYHEDRON CORE ────────────────────────────────────────────────

const NonconvexPolyhedron = memo(({ accentColor, selectedId, isGlobeSpinning }) => {
    const geomRef = useRef();
    const wireGeomRef = useRef();
    const accumulatedTimeRef = useRef(0);
    
    useFrame(({ clock }, delta) => {
        if (isGlobeSpinning) {
            accumulatedTimeRef.current += delta;
        }
        const time = accumulatedTimeRef.current;
        const v = new THREE.Vector3();
        
        // Deform solid core geometry
        if (geomRef.current) {
            const posAttr = geomRef.current.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                v.fromBufferAttribute(posAttr, i);
                const u = v.clone().normalize();
                const r = getNonconvexRadius(u.x, u.y, u.z, time, !!selectedId);
                v.copy(u).multiplyScalar(r);
                posAttr.setXYZ(i, v.x, v.y, v.z);
            }
            posAttr.needsUpdate = true;
            geomRef.current.computeVertexNormals();
        }

        // Deform wireframe geometry to match exactly
        if (wireGeomRef.current) {
            const posAttr = wireGeomRef.current.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                v.fromBufferAttribute(posAttr, i);
                const u = v.clone().normalize();
                const r = getNonconvexRadius(u.x, u.y, u.z, time, !!selectedId);
                v.copy(u).multiplyScalar(r + 0.005);
                posAttr.setXYZ(i, v.x, v.y, v.z);
            }
            posAttr.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* 1. Solid opaque nonconvex polyhedron core */}
            <mesh>
                <icosahedronGeometry ref={geomRef} args={[GLOBE_R, 2]} />
                <meshStandardMaterial color="#050505" roughness={0.12} metalness={0.88} />
            </mesh>

            {/* 2. Glowy inner accent sphere */}
            <mesh>
                <icosahedronGeometry args={[2.40, 2]} />
                <meshStandardMaterial color={accentColor} transparent opacity={0.015} emissive={accentColor} emissiveIntensity={0.18} />
            </mesh>

            {/* 3. Nonconvex wireframe lattice grid */}
            <mesh>
                <icosahedronGeometry ref={wireGeomRef} args={[GLOBE_R, 2]} />
                <meshBasicMaterial color={accentColor} wireframe transparent opacity={0.22} toneMapped={false} />
            </mesh>

            {/* 4. Atmosphere rim (BackSide) */}
            <Sphere args={[2.56, 48, 48]} renderOrder={4}>
                <meshBasicMaterial color={accentColor} transparent opacity={0.040} side={THREE.BackSide} toneMapped={false} />
            </Sphere>

            {/* 5. Outer corona */}
            <Sphere args={[2.72, 32, 32]} renderOrder={0}>
                <meshBasicMaterial color={accentColor} transparent opacity={0.024} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
            </Sphere>
        </group>
    );
});

// ─── GLOBE CORE ───────────────────────────────────────────────────────────────

const GlobeCore = memo(({
    activeSector, searchQuery,
    communities = [], artists = [], playlists = [], tracks = [],
    selectedId, activeView,
    onArtistClick, onCommunityClick, onTrackClick, onPlaylistClick,
    isGlobeSpinning, selectedGlobeItem,
}) => {
    const { camera }    = useThree();
    const [cameraDist, setCameraDist] = useState(10);
    const [seed]        = useState(() => Math.random().toString());

    useFrame(() => setCameraDist(camera.position.length()));

    // Get unique vertex positions from the icosahedron mesh (detail=2)
    const vertexDirections = useMemo(() => {
        const tempGeo = new THREE.IcosahedronGeometry(1.0, 2);
        const posAttr = tempGeo.attributes.position;
        const verts = [];
        const seen = new Set();
        const v = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
            v.fromBufferAttribute(posAttr, i);
            const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
            if (!seen.has(key)) {
                seen.add(key);
                verts.push(v.clone().normalize());
            }
        }
        tempGeo.dispose();
        
        // Sort them relative to the center to keep layout distribution stable
        return verts.sort((a, b) => b.y - a.y || b.x - a.x);
    }, []);

    const activeSectorColor = useMemo(() => SECTORS.find(s => s.id === activeSector)?.color, [activeSector]);

    const filtered = useMemo(() => {
        // --- 1. RELATIONAL NODE FILTERING ON ITEM SELECTION ---
        if (selectedGlobeItem) {
            const itemId = selectedGlobeItem.id || selectedGlobeItem.Id;
            const itemType = selectedGlobeItem.type;

            let relatedArtists = [];
            let relatedTracks = [];
            let relatedPlaylists = [];
            let relatedCommunities = [];

            if (itemType === 'artist') {
                relatedTracks = tracks.filter(t => 
                    String(t.artistId || t.ArtistId) === String(itemId) ||
                    String(t.artistUserId || t.ArtistUserId) === String(selectedGlobeItem.userId || selectedGlobeItem.UserId)
                );
                relatedPlaylists = playlists.filter(p => 
                    String(p.artistId || p.ArtistId) === String(itemId) ||
                    String(p.userId || p.UserId) === String(selectedGlobeItem.userId || selectedGlobeItem.UserId)
                );
                const artistCommunityId = selectedGlobeItem.communityId || selectedGlobeItem.CommunityId;
                if (artistCommunityId) {
                    relatedCommunities = communities.filter(c => String(c.id || c.Id) === String(artistCommunityId));
                }
                const sectorId = selectedGlobeItem.sectorId || selectedGlobeItem.SectorId;
                relatedArtists = artists.filter(a => 
                    String(a.id || a.Id) !== String(itemId) && 
                    (sectorId !== null && (a.sectorId || a.SectorId) === sectorId)
                );
                
                if (!relatedArtists.some(a => String(a.id || a.Id) === String(itemId))) {
                    relatedArtists.unshift(selectedGlobeItem);
                }
            } 
            else if (itemType === 'track') {
                const trkArtistId = selectedGlobeItem.artistId || selectedGlobeItem.ArtistId;
                const trkArtistUID = selectedGlobeItem.artistUserId || selectedGlobeItem.ArtistUserId;
                const matchingArtist = artists.find(a => 
                    String(a.id || a.Id) === String(trkArtistId) ||
                    String(a.userId || a.UserId) === String(trkArtistUID)
                );
                if (matchingArtist) {
                    relatedArtists.push(matchingArtist);
                }
                if (trkArtistId || trkArtistUID) {
                    relatedTracks = tracks.filter(t => 
                        String(t.id || t.Id) !== String(itemId) && 
                        (String(t.artistId || t.ArtistId) === String(trkArtistId) || 
                         String(t.artistUserId || t.ArtistUserId) === String(trkArtistUID))
                    );
                }
                relatedPlaylists = playlists.filter(p => 
                    String(p.artistId || p.ArtistId) === String(trkArtistId)
                );
                relatedTracks.unshift(selectedGlobeItem);
            } 
            else if (itemType === 'community') {
                relatedArtists = artists.filter(a => 
                    String(a.communityId || a.CommunityId) === String(itemId)
                );
                const artistIds = new Set(relatedArtists.map(a => String(a.id || a.Id)));
                relatedTracks = tracks.filter(t => artistIds.has(String(t.artistId || t.ArtistId)));
                relatedPlaylists = playlists.filter(p => artistIds.has(String(p.artistId || p.ArtistId)));
                relatedCommunities.unshift(selectedGlobeItem);
            } 
            else if (itemType === 'playlist') {
                const plArtistId = selectedGlobeItem.artistId || selectedGlobeItem.ArtistId;
                if (plArtistId) {
                    const matchingArtist = artists.find(a => String(a.id || a.Id) === String(plArtistId));
                    if (matchingArtist) relatedArtists.push(matchingArtist);
                }
                relatedTracks = tracks.filter(t => String(t.artistId || t.ArtistId) === String(plArtistId));
                relatedPlaylists.unshift(selectedGlobeItem);
            }

            return {
                communities_: relatedCommunities.slice(0, 15),
                artists_: relatedArtists.slice(0, 15),
                playlists_: relatedPlaylists.slice(0, 15),
                tracks_: relatedTracks.slice(0, 15),
            };
        }

        // --- 2. DEFAULT VIEW (NO SELECTION) ---
        const bySearch = (arr, key) => !searchQuery ? arr :
            arr.filter(x => (x[key] || x[key[0].toUpperCase() + key.slice(1)] || '').toLowerCase().includes(searchQuery.toLowerCase()));
        const bySector = (arr) => activeSector !== null ? arr.filter(x => (x.sectorId || x.SectorId) === activeSector) : arr;
        const shuffle  = (arr) => arr.map(item => ({ item, k: hashStr((item.id || item.Id || '') + seed) })).sort((a, b) => a.k - b.k).map(x => x.item);

        return {
            communities_: shuffle(bySearch(bySector(communities.filter(c =>
                !c.isSystem && !c.IsSystem && c.id !== 4 && c.Id !== 4 &&
                c.name?.toUpperCase() !== 'FATALE_CORE' && c.Name?.toUpperCase() !== 'FATALE_CORE'
            )), 'name')).slice(0, 25),
            artists_:   shuffle(bySearch(bySector(artists), 'name')).slice(0, 25),
            playlists_: shuffle(bySearch(playlists, 'name')).slice(0, 25),
            tracks_:    shuffle(!searchQuery ? tracks : tracks.filter(t =>
                (t.title || t.Title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.artist || t.Artist || '').toLowerCase().includes(searchQuery.toLowerCase())
            )).slice(0, 25),
        };
    }, [communities, artists, playlists, tracks, activeSector, searchQuery, seed, selectedGlobeItem]);

    const { communities_, artists_, playlists_, tracks_ } = filtered;

    // --- stable vertex allocator ---
    const nodesWithVertices = useMemo(() => {
        const allNodes = [];
        communities_.forEach(c => allNodes.push({ ...c, typeClass: 'community', nodeUniqueId: `community-${c.id || c.Id}`, name: c.name || c.Name, color: '#ffaa00', size: 0.055 }));
        artists_.forEach(a => allNodes.push({ ...a, typeClass: 'artist', nodeUniqueId: `artist-${a.id || a.Id}`, name: a.name || a.Name, color: '#00ffaa', size: 0.048 }));
        tracks_.forEach(t => allNodes.push({ ...t, typeClass: 'track', nodeUniqueId: `track-${t.id || t.Id}`, name: t.title || t.Title, subtitle: t.artist || t.Artist, color: t.color || '#00aaff', size: 0.038 }));
        playlists_.forEach(p => allNodes.push({ ...p, typeClass: 'playlist', nodeUniqueId: `playlist-${p.id || p.Id}`, name: p.name || p.Name, color: 'rgb(var(--theme-primary))', size: 0.048 }));

        const taken = new Uint8Array(vertexDirections.length);
        return allNodes.map(node => {
            const h = hashStr(node.nodeUniqueId);
            let preferred = h % vertexDirections.length;
            while (taken[preferred]) {
                preferred = (preferred + 1) % vertexDirections.length;
            }
            taken[preferred] = 1;
            const dir = vertexDirections[preferred];
            return {
                ...node,
                vertexIndex: preferred,
                direction: dir
            };
        });
    }, [communities_, artists_, tracks_, playlists_, vertexDirections]);

    const accentColorRaw = activeSectorColor || 'rgb(var(--theme-primary))';
    const accentColor = useMemo(() => resolveColorToHex(accentColorRaw), [accentColorRaw]);

    return (
        <group>
            {/* ── NONCONVEX POLYHEDRON CORE ── */}
            <NonconvexPolyhedron accentColor={accentColor} selectedId={selectedId} isGlobeSpinning={isGlobeSpinning} />

            {/* ── NODES BOUND TO ACTUAL VERTICES ── */}
            {nodesWithVertices.map(node => {
                const isNodeSelected = selectedId === node.nodeUniqueId;
                
                const onClick = () => {
                    if (node.typeClass === 'artist') onArtistClick?.(node);
                    if (node.typeClass === 'community') onCommunityClick?.(node);
                    if (node.typeClass === 'track') onTrackClick?.(node);
                    if (node.typeClass === 'playlist') onPlaylistClick?.(node);
                };

                return (
                    <LightPointNode
                        key={node.nodeUniqueId}
                        direction={node.direction}
                        name={node.name}
                        subtitle={node.subtitle}
                        color={node.color}
                        size={node.size * Math.max(0.4, 1 / (1 + 0.015 * nodesWithVertices.length))}
                        isSelected={isNodeSelected}
                        cameraDist={cameraDist}
                        onClick={onClick}
                        isGlobeSpinning={isGlobeSpinning}
                    />
                );
            })}

            <FataleCoreNode
                isSelected={selectedId === 'system-fatale_core'}
                cameraDist={cameraDist}
                hideLabel={!!selectedId}
                isGlobeSpinning={isGlobeSpinning}
                onClick={() => onCommunityClick?.({ id: 'fatale_core', name: 'FATALE_CORE', isSystem: true, description: 'The official Fatale system node. Share feedback, bug reports and reviews.' })}
            />

            <NetworkVisualization nodes={nodesWithVertices} selectedId={selectedId} isGlobeSpinning={isGlobeSpinning} />
        </group>
    );
});

// ─── INTERACTIVE GLOBE ────────────────────────────────────────────────────────

const InteractiveGlobe = memo(({
    activeSector, onSectorClick, searchQuery,
    communities = [], artists = [], selectedId, activeView,
    tracks = [], playlists = [],
    isGlobeSpinning = false,
    onArtistClick, onCommunityClick, onTrackClick, onPlaylistClick, onSelectItem,
    selectedGlobeItem,
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const [initialRotation] = useState(() => [0.1, -0.2, 0]);
    
    const pointLightColor = useMemo(() => resolveColorToHex(SECTORS.find(s => s.id === activeSector)?.color || 'rgb(var(--theme-primary))'), [activeSector]);

    return (
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
            {/* Pure black background */}
            <Canvas dpr={[1, 2]} gl={{ logarithmicDepthBuffer: true, antialias: true }} style={{ background: '#000000' }}>
                <PerspectiveCamera makeDefault position={[0, 0, isMobile ? 16.5 : 15.5]} fov={isMobile ? 30 : 40} />
                {/* Pure black fog */}
                <fog attach="fog" args={['#000000', 38, 75]} />
                <OrbitControls
                    enablePan={false} enableZoom={true}
                    minDistance={2.8} maxDistance={25}
                    autoRotate={isGlobeSpinning && !selectedId}
                    autoRotateSpeed={isGlobeSpinning ? 0.5 : 0}
                    dampingFactor={0.1} enableDamping rotateSpeed={0.5}
                />

                <ambientLight intensity={0.18} />
                <pointLight position={[10, 10, 10]} intensity={2.5} color={pointLightColor} />
                <pointLight position={[-8, -8, -8]} intensity={1.6} color="#001833" />

                <Float
                    speed={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.2 : 1.0) : 0}
                    rotationIntensity={isGlobeSpinning && !selectedId ? (activeSector !== null ? 0.02 : 0.3) : 0}
                    floatIntensity={isGlobeSpinning && !selectedId ? 0.2 : 0}
                >
                    <group rotation={initialRotation}>
                        <GlobeCore
                            activeSector={activeSector} searchQuery={searchQuery}
                            communities={communities} artists={artists}
                            playlists={playlists} tracks={tracks}
                            selectedId={selectedId} activeView={activeView}
                            onArtistClick={onArtistClick} onCommunityClick={onCommunityClick}
                            onTrackClick={onTrackClick} onPlaylistClick={onPlaylistClick}
                            isGlobeSpinning={isGlobeSpinning}
                            selectedGlobeItem={selectedGlobeItem}
                        />
                    </group>
                </Float>
            </Canvas>
        </div>
    );
});

export default InteractiveGlobe;